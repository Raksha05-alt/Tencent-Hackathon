/**
 * Live agent loop — a standard Anthropic tool-use loop that emits the same
 * AgentEvent stream the replay uses. Active only when ANTHROPIC_API_KEY is set;
 * the demo defaults to replaying /data/recorded-run.json client-side.
 */
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, USER_TASK } from './prompts';
import { newRunState, executeTool, type ToolName } from './tools';
import type { AgentEvent, DropOffFinding } from '../../types';

const TOOLS: Anthropic.Tool[] = [
  { name: 'load_roster', description: 'Load the member roster with a field-completeness summary and data-quality warnings.', input_schema: { type: 'object', properties: {} } },
  { name: 'query_attendance', description: 'Query raw attendance records, optionally filtered.', input_schema: { type: 'object', properties: { memberId: { type: 'string' }, programmeId: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' } } } },
  { name: 'compute_attendance_gaps', description: 'Members absent at least minWeeksAbsent weeks, with prior frequency and main programme.', input_schema: { type: 'object', properties: { minWeeksAbsent: { type: 'number' } }, required: ['minWeeksAbsent'] } },
  { name: 'get_schedule_changes', description: 'Programme schedule changes in a date window.', input_schema: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } } } },
  { name: 'get_programme_retention', description: 'Per-programme starters, current actives, retention % and waitlist size.', input_schema: { type: 'object', properties: {} } },
  { name: 'get_member_profile', description: 'Full member profile including staff notes.', input_schema: { type: 'object', properties: { memberId: { type: 'string' } }, required: ['memberId'] } },
  { name: 'search_members_by_interest', description: 'Fuzzy interest search that groups inconsistently-spelled tags by concept.', input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'get_waitlists', description: 'Waitlist entries, optionally for one programme.', input_schema: { type: 'object', properties: { programmeId: { type: 'string' } } } },
  { name: 'save_finding', description: 'Persist a drop-off finding (your judgement about a member or cluster).', input_schema: { type: 'object', properties: { memberId: { type: 'string' }, lastAttended: { type: 'string' }, weeksAbsent: { type: 'number' }, priorPattern: { type: 'string' }, riskTier: { type: 'string', enum: ['high', 'medium', 'low'] }, riskFactors: { type: 'array', items: { type: 'string' } }, inferredCause: { type: 'string' }, causeConfidence: { type: 'string', enum: ['high', 'medium', 'low'] }, relatedMemberIds: { type: 'array', items: { type: 'string' } } }, required: ['memberId', 'lastAttended', 'weeksAbsent', 'priorPattern', 'riskTier', 'riskFactors', 'inferredCause', 'causeConfidence', 'relatedMemberIds'] } },
  { name: 'draft_outreach', description: 'Queue an outreach draft for coordinator approval. Never sends anything.', input_schema: { type: 'object', properties: { memberId: { type: 'string' }, channel: { type: 'string', enum: ['whatsapp', 'phone', 'sms'] }, language: { type: 'string' }, body: { type: 'string' }, englishGloss: { type: 'string' }, rationale: { type: 'string' } }, required: ['memberId', 'channel', 'language', 'body', 'rationale'] } },
  { name: 'propose_calendar', description: 'Propose next month\'s calendar. Cite motivating finding IDs in linkedFindingIds.', input_schema: { type: 'object', properties: { month: { type: 'string' }, changes: { type: 'array', items: { type: 'object', properties: { programmeId: { type: ['string', 'null'] }, action: { type: 'string', enum: ['keep', 'add-slot', 'discontinue', 'reschedule', 'create'] }, detail: { type: 'string' }, rationale: { type: 'string' }, linkedFindingIds: { type: 'array', items: { type: 'string' } } }, required: ['programmeId', 'action', 'detail', 'rationale'] } } }, required: ['month', 'changes'] } },
  { name: 'propose_contributor', description: 'Propose a member to lead a programme, with evidence and an invitation draft.', input_schema: { type: 'object', properties: { memberId: { type: 'string' }, proposedRole: { type: 'string' }, evidence: { type: 'string' }, interestedMemberCount: { type: 'number' }, invitationDraft: { type: 'string' } }, required: ['memberId', 'proposedRole', 'evidence', 'interestedMemberCount', 'invitationDraft'] } },
  { name: 'compile_report', description: 'Compile the monthly report for coordinator review (never submitted anywhere).', input_schema: { type: 'object', properties: { month: { type: 'string' } }, required: ['month'] } },
];

function summarize(name: string, result: unknown): string {
  const r = result as Record<string, unknown>;
  if (name === 'compute_attendance_gaps') return `${r.count} members with gaps`;
  if (name === 'load_roster') return `${r.memberCount} members, ${(r.warnings as unknown[]).length} data-quality warnings`;
  if (name === 'search_members_by_interest') return `${r.matchCount} members matched`;
  if (Array.isArray(result)) return `${result.length} rows`;
  if (r.id) return `saved as ${r.id}`;
  return 'ok';
}

export async function* runLiveAgent(): AsyncGenerator<AgentEvent> {
  const client = new Anthropic();
  const state = newRunState();
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: USER_TASK }];
  let emittedPlan = false;

  for (let turn = 0; turn < 30; turn++) {
    const response = await client.messages.create({
      model: process.env.AGENT_MODEL ?? 'claude-sonnet-5',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages,
      tools: TOOLS,
    });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === 'text' && block.text.trim()) {
        const numbered = block.text.match(/^\s*\d+\.\s+.+$/gm);
        if (!emittedPlan && numbered && numbered.length >= 3) {
          emittedPlan = true;
          yield { type: 'plan', steps: numbered.map((s) => s.replace(/^\s*\d+\.\s+/, '')) };
          const rest = block.text.replace(/^\s*\d+\.\s+.+$/gm, '').trim();
          if (rest) yield { type: 'thinking', text: rest };
        } else {
          yield { type: 'thinking', text: block.text };
        }
      }
      if (block.type === 'tool_use') {
        yield { type: 'tool_call', tool: block.name, args: block.input, callId: block.id };
        const result = executeTool(state, block.name as ToolName, block.input);
        yield { type: 'tool_result', callId: block.id, summary: summarize(block.name, result), data: result };
        if (block.name === 'save_finding') {
          const saved = state.findings[state.findings.length - 1];
          yield { type: 'finding', finding: saved as DropOffFinding };
        }
        if (block.name === 'draft_outreach')
          yield { type: 'artifact', kind: 'outreach', payload: state.drafts[state.drafts.length - 1] };
        if (block.name === 'propose_calendar')
          yield { type: 'artifact', kind: 'calendar', payload: state.calendar };
        if (block.name === 'propose_contributor')
          yield { type: 'artifact', kind: 'contributor', payload: state.contributor };
        if (block.name === 'compile_report')
          yield { type: 'artifact', kind: 'report', payload: state.report };
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
      }
    }

    if (response.stop_reason !== 'tool_use') {
      const finalText = response.content.filter((b) => b.type === 'text').map((b) => (b as Anthropic.TextBlock).text).join('\n');
      yield { type: 'done', summary: finalText || 'Run complete.' };
      return;
    }
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });
  }
  yield { type: 'done', summary: 'Run reached turn limit.' };
}
