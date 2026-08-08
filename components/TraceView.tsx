'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { AgentEvent } from '../types';
import { useStore } from '../lib/store';

/** Plan steps tick off as the tools that fulfil them complete. */
const STEP_DONE: Array<(tools: string[], done: boolean) => boolean> = [
  (t) => t.includes('load_roster'),
  (t) => t.includes('compute_attendance_gaps'),
  (t) => t.filter((x) => x === 'save_finding').length >= 3,
  (t) => t.filter((x) => x === 'draft_outreach').length >= 5,
  (t) => t.includes('propose_calendar'),
  (t) => t.includes('propose_contributor'),
  (t) => t.includes('compile_report'),
];

type TraceItem =
  | { kind: 'plan'; steps: string[] }
  | { kind: 'thinking'; text: string; key: string }
  | { kind: 'tool'; tool: string; args: unknown; callId: string; summary?: string; data?: unknown }
  | { kind: 'note'; text: string; key: string }
  | { kind: 'done'; summary: string };

function buildItems(events: AgentEvent[]): TraceItem[] {
  const items: TraceItem[] = [];
  const byCall = new Map<string, TraceItem & { kind: 'tool' }>();
  events.forEach((e, i) => {
    if (e.type === 'plan') items.push({ kind: 'plan', steps: e.steps });
    if (e.type === 'thinking') items.push({ kind: 'thinking', text: e.text, key: `t${i}` });
    if (e.type === 'tool_call') {
      const item = { kind: 'tool' as const, tool: e.tool, args: e.args, callId: e.callId };
      byCall.set(e.callId, item);
      items.push(item);
    }
    if (e.type === 'tool_result') {
      const item = byCall.get(e.callId);
      if (item) {
        item.summary = e.summary;
        item.data = e.data;
      }
    }
    if (e.type === 'finding')
      items.push({ kind: 'note', text: `Finding ${e.finding.id} saved → see artifacts panel`, key: `f${i}` });
    if (e.type === 'artifact' && e.kind !== 'outreach')
      items.push({ kind: 'note', text: `${e.kind[0].toUpperCase() + e.kind.slice(1)} artifact produced`, key: `a${i}` });
    if (e.type === 'done') items.push({ kind: 'done', summary: e.summary });
  });
  return items;
}

function fmtArgs(args: unknown): string {
  const s = JSON.stringify(args, null, 1) ?? '{}';
  return s.length > 400 ? s.slice(0, 400) + '…' : s;
}

export default function TraceView() {
  const { state } = useStore();
  const items = useMemo(() => buildItems(state.events), [state.events]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const toolsRun = state.events
    .filter((e): e is Extract<AgentEvent, { type: 'tool_call' }> => e.type === 'tool_call')
    .map((e) => e.tool);
  const runDone = state.phase === 'done';

  useEffect(() => {
    if (state.phase === 'running')
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.events.length, state.phase]);

  return (
    <div ref={scrollRef} className="max-h-[calc(100vh-220px)] overflow-y-auto pr-2" aria-live="polite">
      {/* the ledger spine */}
      <ol className="relative ml-3 space-y-4 border-l border-hairline pl-5">
        {items.map((item, i) => (
          <li key={i} className="trace-in relative">
            <span
              aria-hidden
              className={`absolute -left-[26px] top-2 h-2 w-2 rounded-full ${
                item.kind === 'thinking' ? 'bg-hairline' : 'bg-jade'
              }`}
            />
            {item.kind === 'plan' && (
              <div className="rounded-lg border border-jade-soft bg-jade-soft/60 p-4">
                <p className="mb-2 font-display font-semibold text-jade-deep">The agent’s plan</p>
                <ol className="space-y-1.5">
                  {item.steps.map((s, si) => {
                    const done = STEP_DONE[si]?.(toolsRun, runDone) ?? runDone;
                    return (
                      <li key={si} className="flex items-start gap-2 text-[15px]">
                        <span
                          aria-hidden
                          className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            done ? 'bg-jade text-white' : 'border border-hairline bg-surface text-muted'
                          }`}
                        >
                          {done ? '✓' : si + 1}
                        </span>
                        <span className={done ? 'text-muted line-through decoration-hairline' : ''}>{s}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {item.kind === 'thinking' && (
              <blockquote className="border-l-2 border-jade pl-4 text-[15px] italic leading-relaxed text-ink/85">
                {item.text}
              </blockquote>
            )}

            {item.kind === 'tool' && (
              <div className="rounded-lg border border-hairline bg-surface">
                <div className="flex items-center gap-2 border-b border-hairline px-4 py-2">
                  <span className="shrink-0 rounded bg-ink px-2 py-0.5 font-mono text-sm text-white">{item.tool}</span>
                  <code className="min-w-0 flex-1 truncate font-mono text-sm text-muted">{JSON.stringify(item.args)}</code>
                </div>
                <div className="px-4 py-2.5">
                  {item.summary ? (
                    <>
                      <p className="text-[15px]">{item.summary}</p>
                      <details className="mt-1">
                        <summary className="cursor-pointer text-sm text-muted hover:text-ink">raw result</summary>
                        <pre className="mt-2 max-h-56 overflow-auto rounded bg-paper p-3 font-mono text-[13px] leading-snug">
                          {fmtArgs(item.data)}
                        </pre>
                      </details>
                    </>
                  ) : (
                    <p className="text-sm text-muted">running…</p>
                  )}
                </div>
              </div>
            )}

            {item.kind === 'note' && <p className="text-sm font-medium text-jade-deep">{item.text}</p>}

            {item.kind === 'done' && (
              <div className="rounded-lg border border-jade bg-jade-soft p-4">
                <p className="font-display font-semibold text-jade-deep">Run complete — over to you, Mei</p>
                <p className="mt-1 text-[15px] leading-relaxed">{item.summary}</p>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
