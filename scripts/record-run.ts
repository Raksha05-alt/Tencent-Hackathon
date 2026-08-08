/**
 * Builds /data/recorded-run.json — the deterministic demo run.
 *
 * Honesty contract: every tool_call in this file executes the REAL tool
 * implementation against the REAL seed data; arguments and results in the
 * trace are genuine outputs. The plan/thinking/judgement text is authored
 * (no API key was available at build time). The live loop in
 * /lib/agent/loop.ts produces the same shape of trace from a real model.
 *
 * Run: npm run record-run
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  newRunState,
  executeTool,
  type ToolName,
  type RunState,
} from '../lib/agent/tools';
import type { AgentEvent, RecordedEvent, DropOffFinding, OutreachDraft } from '../types';

const state: RunState = newRunState();
const events: RecordedEvent[] = [];
let t = 0;
let callSeq = 0;

function push(e: AgentEvent, delay: number) {
  t += delay;
  events.push({ ...e, at: t });
}

function think(text: string) {
  push({ type: 'thinking', text }, 1500);
}

function call(tool: ToolName, args: unknown, summary: string): unknown {
  const callId = `call-${++callSeq}`;
  push({ type: 'tool_call', tool, args, callId }, 700);
  const data = executeTool(state, tool, args);
  push({ type: 'tool_result', callId, summary, data }, 900);
  return data;
}

// ---------------------------------------------------------------- plan
push(
  {
    type: 'plan',
    steps: [
      'Ingest the roster and check data quality',
      'Detect members with attendance gaps and rank by risk',
      'Investigate causes — look for shared timing and structural triggers before treating cases as individual',
      'Draft outreach matched to each member’s language and situation',
      'Review programme retention and rebuild the August calendar',
      'Identify members who could lead sessions, not just attend them',
      'Compile the July report for coordinator review',
    ],
  },
  600
);

// ---------------------------------------------------------------- step 1: ingest
call('load_roster', {}, '45 members, 8 programmes, 7 months of attendance. 5 data-quality warnings.');
think(
  'The roster needs care before analysis: two members have near-identical names — Tan Ah Kow (M-004) and Tan Ah Kau (M-016) — I will treat them as different people throughout, not merge them. Three members have no recorded language, which matters later when I draft outreach; I will fall back to staff notes and phone calls for those. Interest tags are inconsistently spelled, so any interest matching must group by meaning, not exact strings.'
);

// ---------------------------------------------------------------- step 2: gaps
const gapsData = call(
  'compute_attendance_gaps',
  { minWeeksAbsent: 4 },
  '9 members have been absent 4+ weeks. Longest: 11 weeks.'
) as { gaps: { memberId: string; lastAttended: string }[] };

think(
  'Nine absences, but they are not nine separate stories. Four members — Tan Ah Kow (78), Lim Boon Heng (82), Goh Mei Lan (75), Chua Seng Huat (80) — share the exact same last-attended date, 9 June, and all four were weekly Mahjong regulars. Four long-standing attendees do not independently quit in the same week. Before treating them as individual disengagements, I should check whether something structural changed around 9–11 June.'
);

// ---------------------------------------------------------------- step 3: cause — cluster
call(
  'get_schedule_changes',
  { from: '2026-05-01', to: '2026-07-01' },
  '1 change in the window: Mahjong Social moved Tue → Thu, effective 11 Jun.'
);
think(
  'There it is: Mahjong Social moved from Tuesday to Thursday effective 11 June — the exact week all four stopped. The karaoke room change in March predates the drop-offs and touched none of these members, so I can discard it. The correlation is strong, but I want confirming context from their profiles before I commit to a cause.'
);
call('get_member_profile', { memberId: 'M-004' }, 'Tan Ah Kow, 78, lives alone, Hokkien. Note: comes with the Tuesday group, lunch together after.');
call('get_member_profile', { memberId: 'M-011' }, 'Lim Boon Heng, 82, lives alone, Hokkien. Note: Thursday is his market day with his daughter.');
think(
  'The profiles confirm it. For Mr Lim, Thursday is his standing market day with his daughter — the new slot collides directly with a family routine he will not give up. For Mr Tan, the note says the Tuesday group always leaves for lunch together: the session was the anchor of a shared ritual, and when it moved, the whole ritual collapsed for all four at once. This is one structural cause — a schedule conflict — not four people losing interest. Confidence: high.'
);

const clusterFinding: Omit<DropOffFinding, 'id'> = {
  memberId: 'M-004',
  lastAttended: '2026-06-09',
  weeksAbsent: 7,
  priorPattern: 'Weekly Tuesday mahjong, ~96% attendance since joining; a fixed foursome that lunched together after every session',
  riskTier: 'medium',
  riskFactors: ['3 of 4 live alone', 'ages 75–82', '7 weeks without any centre contact', 'the session was their main weekly social anchor'],
  inferredCause:
    'The Tue→Thu move of Mahjong Social (effective 11 Jun) broke the group’s shared routine: the new Thursday slot conflicts with existing commitments (M-011’s market day with his daughter) and dissolved the Tuesday-lunch ritual the four kept together. This is a schedule conflict, not disengagement.',
  causeConfidence: 'high',
  relatedMemberIds: ['M-011', 'M-019', 'M-027'],
};
const f1 = call('save_finding', clusterFinding, 'Saved finding F-001 — one cause, four members.') as { id: string };
push({ type: 'finding', finding: { ...clusterFinding, id: f1.id } }, 400);

// ---------------------------------------------------------------- step 3b: Fatimah
think(
  'Next, the longest personal absence: Fatimah Binte Osman, 10 weeks. Her pattern is different — not a cliff but a taper: three sessions a week through March, fading through April, nothing since 20 May. A taper usually means something in her life changed, not the timetable. Her profile should say more.'
);
call('get_member_profile', { memberId: 'M-008' }, 'Fatimah, 81, lives alone, walking aid. Note: husband admitted to hospital in April; they used to come together.');
think(
  'The staff note explains the shape of the curve: her husband was admitted to hospital in April — exactly when the taper began — and they used to attend together. She is 81, lives alone, uses a walking aid, and has now had no centre contact for 10 weeks while carrying this alone. This is the highest-risk case on the roster. Her preferred channel is WhatsApp, but a message is too easy to ignore in a situation like this and too impersonal — this needs a phone call, in Malay, that asks after her husband before it mentions attendance at all.'
);
const fatimahFinding: Omit<DropOffFinding, 'id'> = {
  memberId: 'M-008',
  lastAttended: '2026-05-20',
  weeksAbsent: 10,
  priorPattern: '3 sessions/week (Chair Yoga, Cooking, Tech Clinic) Jan–Mar, tapering through April to zero',
  riskTier: 'high',
  riskFactors: ['age 81', 'lives alone', 'husband hospitalised in April', '10 weeks without contact', 'walking aid — reduced independent mobility'],
  inferredCause:
    'Caregiving crisis, not loss of interest: the taper begins the month her husband was hospitalised, and they previously attended together. Extended social withdrawal while caring alone is the risk itself.',
  causeConfidence: 'high',
  relatedMemberIds: [],
};
const f2 = call('save_finding', fatimahFinding, 'Saved finding F-002 — high risk, route to phone call.') as { id: string };
push({ type: 'finding', finding: { ...fatimahFinding, id: f2.id } }, 400);

// ---------------------------------------------------------------- step 3c: triage the rest
think(
  'Triaging the remaining four gaps: Tay Hwee Choo and Chia Beng Soon both stopped on 13 May — which is week two of the Calligraphy class; they left when the programme fizzled, not when their engagement did. Mdm Tay lives alone, so she gets a finding: she is already on the Chair Yoga waitlist and her interests include sewing — the remedy is a better programme fit, not a welfare call. Phua Geok Lin is in Perth visiting her son per her notes — no action. Kamala attends monthly health talks; a 4-week gap is her normal cadence — no action.'
);
const calligFinding: Omit<DropOffFinding, 'id'> = {
  memberId: 'M-031',
  lastAttended: '2026-05-13',
  weeksAbsent: 11,
  priorPattern: 'Joined for Calligraphy Class at launch (6 May), attended both opening sessions, nothing since',
  riskTier: 'low',
  riskFactors: ['lives alone', 'no current programme fit — original programme effectively ended for her'],
  inferredCause:
    'Programme-driven lapse: she stopped when Calligraphy lost its group in week two (6 of 8 starters left). She is on the Chair Yoga waitlist and interested in sewing — re-engagement should come through a better programme offer, not a welfare check.',
  causeConfidence: 'medium',
  relatedMemberIds: ['M-043'],
};
const f3 = call('save_finding', calligFinding, 'Saved finding F-003 — low risk, programme-fit remedy.') as { id: string };
push({ type: 'finding', finding: { ...calligFinding, id: f3.id } }, 400);

// ---------------------------------------------------------------- step 4: outreach drafts
think(
  'Now the outreach. The cluster’s cause is the schedule, so the message must lead with the group and the ritual, and carry news worth replying to — that we intend to bring Tuesday mahjong back. No guilt, no “we noticed you stopped coming”. Each draft goes in the member’s own language and channel; Mr Lim gets a phone call (his preference, and I can time it away from his Thursday market run). Everything is a draft for Mei to approve — nothing sends itself.'
);

const drafts: Array<Omit<OutreachDraft, 'id' | 'status'>> = [
  {
    memberId: 'M-004',
    channel: 'whatsapp',
    language: 'Hokkien',
    body: 'Ah Kow 安哥，我是大巴窑乐龄中心的小美。好久没看到你和星期二的牌友了，大家都很想念你们！我们打算把麻将改回星期二下午。定下来我第一个通知你——到时大家照旧打牌，打完去吃午饭，好吗？',
    englishGloss:
      'Uncle Ah Kow, this is Mei from Toa Payoh AAC. We haven’t seen you and the Tuesday mahjong gang for a while — everyone misses you! We’re planning to move mahjong back to Tuesday afternoons. You’ll be the first to know once it’s set — then it’s cards like before, and lunch after, okay?',
    rationale:
      'Cause is the schedule change, so the message leads with the fix and the group ritual (cards, then lunch). Simple written Chinese phrased to be read in Hokkien; his preferred channel is WhatsApp. No attendance guilt.',
  },
  {
    memberId: 'M-011',
    channel: 'phone',
    language: 'Hokkien',
    body:
      'Call talking points (deliver in Hokkien):\n• Open with his week, not his absence — ask about the Thursday market runs with his daughter.\n• Acknowledge plainly: we moved mahjong onto his market day; that was our clash, not his.\n• Share the plan to return mahjong to Tuesday afternoons; ask if Tuesday still works for him.\n• Mention Ah Kow, Mei Lan and Seng Huat are being invited back the same week.\n• Do not schedule the call on a Thursday.',
    englishGloss: undefined,
    rationale:
      'His preferred channel is phone, and the staff note explains his absence (Thursday market day with his daughter conflicts with the new slot). The call owns the clash as ours and restores the group together.',
  },
  {
    memberId: 'M-019',
    channel: 'whatsapp',
    language: 'Mandarin',
    body: '美兰姐，我是乐龄中心的小美。星期二的麻将搭子散了，大家都说不习惯！我们准备把麻将改回星期二下午，定了马上告诉你。你先生还是那条路线顺路送你，跟以前一样。等你回来！',
    englishGloss:
      'Sister Mei Lan, this is Mei from the centre. The Tuesday mahjong table hasn’t been the same without you all! We’re preparing to move mahjong back to Tuesday afternoons and will tell you the moment it’s fixed. Your husband’s drop-off route works just like before. Waiting for you to come back!',
    rationale:
      'Mandarin speaker; her husband drops her off on his commute, which the Tuesday slot fits — the message removes the practical obstacle and appeals to the group bond.',
  },
  {
    memberId: 'M-027',
    channel: 'whatsapp',
    language: 'Hokkien',
    body: 'Seng Huat 安哥，我是大巴窑乐龄中心的小美。麻将台少了你们四个，真的静了很多！我们打算把麻将改回星期二下午——Ah Kow 他们也会回来。定下来我通知你，到时老朋友再聚，好吗？',
    englishGloss:
      'Uncle Seng Huat, this is Mei from Toa Payoh AAC. The mahjong table has been far too quiet without the four of you! We plan to move mahjong back to Tuesday afternoons — Ah Kow and the others will be coming back too. I’ll let you know once it’s set — old friends together again, okay?',
    rationale:
      'His staff note says he and Ah Kow are best friends since kampong days — the strongest pull back is the friendship, so the message names it. WhatsApp is his preferred channel.',
  },
  {
    memberId: 'M-008',
    channel: 'phone',
    language: 'Malay',
    body:
      'Call talking points (deliver in Malay — open: “Mak Cik Fatimah, apa khabar? Lama tak jumpa…”):\n• Ask after her husband first; let her talk. No mention of attendance until she settles.\n• Acknowledge how heavy these months must have been, caring alone.\n• Offer something small and concrete: the cooking group is making her favourite this Friday — would she like us to keep a seat, no pressure.\n• Offer the shuttle if getting here is the obstacle.\n• If she is not ready, close with: we will call again in two weeks — she is missed, not monitored.',
    englishGloss: undefined,
    rationale:
      'Highest-risk member. A WhatsApp message (her stated preference) is too easy to ignore in grief and too impersonal for the situation — a Malay phone call that leads with her husband, not her absence, is the humane channel. Concrete, low-pressure re-entry offer.',
  },
];

for (const d of drafts) {
  const res = call('draft_outreach', d, `Draft queued for ${d.memberId} (${d.language}, ${d.channel}) — pending approval.`) as { id: string };
  push({ type: 'artifact', kind: 'outreach', payload: { ...d, id: res.id, status: 'pending' } }, 300);
}

// ---------------------------------------------------------------- step 5: calendar
think(
  'Now the August calendar — and this is where the morning’s findings must change the plan, not sit in a report. First, the retention picture.'
);
call('get_programme_retention', {}, 'Chair Yoga 88% + 12 waitlisted · Cooking 92% + 15 waitlisted · Calligraphy 25% · Mahjong 43% (the F-001 four).');
call('get_waitlists', {}, '27 waitlist entries: 12 for Chair Yoga, 15 for Cooking Together.');
think(
  'Reading this table with F-001 in hand: Mahjong’s 43% retention is not a programme problem — it is exactly the four members the schedule change displaced, so the fix is to reverse the move, not to doubt the programme. Calligraphy is the opposite: 6 of its 8 starters left by week two; it should wind down, which frees Wednesday 15:00. Chair Yoga and Cooking are victims of their own success — both need capacity, and the waitlists tell me exactly how much. Health Talk is monthly, so the 3-week activity window under-reads it; no change. Before I commit the freed Wednesday slot, there is an interest signal in the roster worth checking.'
);
const sewingRes = call(
  'search_members_by_interest',
  { query: 'sewing, mending, handicraft' },
  '20 members matched across 8 spellings (sewing / Sewing / needlework / mending clothes / handicraft / knitting / crochet…). No such programme exists.'
) as { matchCount: number };
call('get_member_profile', { memberId: 'M-015' }, 'Wong Siew Kuen, 71 — 30 years a tailor in Chinatown, attends 3×/week, already mends clothes for members.');
think(
  `Twenty members carry sewing-family interests under eight different spellings, and no programme serves them. And the roster already holds the teacher: Mrs Wong, a tailor for 30 years, here three times a week, who mended Mdm Rahim’s blouse overnight last month just because she was asked. She should not just attend this programme — she should lead it. That fills the freed Wednesday slot, and it also answers F-003: Mdm Tay, who lapsed when Calligraphy folded, lists sewing as an interest.`
);

const calendarProposal = {
  month: '2026-08',
  changes: [
    {
      programmeId: 'P-01',
      action: 'reschedule' as const,
      detail: 'Move Mahjong Social back to Tuesday 14:00 (from Thursday); offer the physiotherapy vendor the Thursday 14:00 slot instead.',
      rationale:
        'Recovers the four members lost to the 11 Jun Tue→Thu move (finding F-001): the Thursday slot conflicts with their existing routines and broke the group’s Tuesday ritual. Their outreach drafts reference this return.',
      linkedFindingIds: ['F-001'],
    },
    {
      programmeId: 'P-03',
      action: 'discontinue' as const,
      detail: 'Wind down Calligraphy Class after August; invite the 2 remaining members to Mending Circle or the arts block at Braddell.',
      rationale:
        '25% retention — 6 of 8 starters gone by week two. Continuing serves 2 members while 27 sit on waitlists elsewhere. Frees Wednesday 15:00. Also addresses finding F-003 (lapsed member needs a better programme fit).',
      linkedFindingIds: ['F-003'],
    },
    {
      programmeId: 'P-02',
      action: 'add-slot' as const,
      detail: 'Add a second Chair Yoga slot: Thursday 10:00, Multi-Purpose Hall.',
      rationale: '88% retention with 12 members waitlisted — demand cleanly exceeds one session. Waitlist promotions can fill the new slot on day one.',
    },
    {
      programmeId: 'P-04',
      action: 'add-slot' as const,
      detail: 'Run Cooking Together twice monthly in the larger Kitchen Studio configuration; promote from the waitlist.',
      rationale: '92% retention and a 15-person waitlist against capacity 12 — the strongest demand signal on the roster.',
    },
    {
      programmeId: null,
      action: 'create' as const,
      detail: 'New: Mending & Handicraft Circle — Wednesday 15:00 (the freed Calligraphy slot), member-led.',
      rationale:
        '20 members carry sewing-family interests under 8 inconsistent spellings, with no programme serving them. Candidate lead identified: Mrs Wong Siew Kuen (see contributor proposal C-001).',
    },
    { programmeId: 'P-05', action: 'keep' as const, detail: 'Karaoke Afternoon unchanged (Sat 14:00).', rationale: '93% retention, stable large group.' },
    { programmeId: 'P-06', action: 'keep' as const, detail: 'Brisk Walking Group unchanged (Tue 07:30).', rationale: '90% retention; no-shows track early start, acceptable for an outdoor programme.' },
    { programmeId: 'P-07', action: 'keep' as const, detail: 'Tech Help Clinic unchanged (Wed 10:00).', rationale: 'Small but steady; low cost to run.' },
    { programmeId: 'P-08', action: 'keep' as const, detail: 'Health Talk continues monthly (first Wednesday).', rationale: 'Monthly cadence — the 3-week activity window under-reads it; attendance is healthy at ~9 per talk.' },
  ],
};
const calRes = call('propose_calendar', calendarProposal, 'August calendar proposed: 9 rows, 2 changes linked to findings F-001 and F-003.') as { id: string };
push({ type: 'artifact', kind: 'calendar', payload: { ...calendarProposal, id: calRes.id } }, 500);

// ---------------------------------------------------------------- step 6: contributor
const contributor = {
  memberId: 'M-015',
  proposedRole: 'Lead the new Mending & Handicraft Circle (monthly to start, Wednesday 15:00)',
  evidence:
    '30 years as a tailor in Chinatown; attends 3 sessions/week with near-perfect attendance; already mends clothes for fellow members unprompted (Mdm Rahim’s blouse, done overnight). 20 members expressed sewing-family interests with no programme to serve them.',
  interestedMemberCount: (sewingRes as { matchCount: number }).matchCount,
  invitationDraft:
    'Dear Mrs Wong, this is Mei from the centre. Everyone still talks about how beautifully you fixed Mdm Rahim’s blouse. It turns out twenty of our members would love to learn mending and handicraft — and there is no one better to show them than someone who spent thirty years doing it masterfully. Would you consider leading a small Mending Circle on Wednesday afternoons, once a month to start? We would handle all the setup — you would just bring your hands and your stories.',
};
const conRes = call('propose_contributor', contributor, 'Contributor proposal C-001: invite Mrs Wong to lead, 20 interested members.') as { id: string };
push({ type: 'artifact', kind: 'contributor', payload: { ...contributor, id: conRes.id } }, 400);
think(
  'Mrs Wong moves from attendee to leader — retention works both ways: members who lead don’t drift away.'
);

// ---------------------------------------------------------------- step 7: report
const report = call('compile_report', { month: '2026-07' }, 'July report compiled: totals, programme performance, drop-off findings and pending outreach. For coordinator review — nothing submitted.');
push({ type: 'artifact', kind: 'report', payload: report }, 400);

// ---------------------------------------------------------------- done
push(
  {
    type: 'done',
    summary:
      '9 attendance gaps triaged → 3 findings (one structural cause explains 4 members). 5 outreach drafts await your approval — nothing has been sent. August calendar proposed with 2 changes directly driven by this morning’s findings. Mrs Wong invited to lead a new member-led programme. July report ready for your review.',
  },
  800
);

// ---------------------------------------------------------------- write
const out = { recordedAt: new Date().toISOString(), events };
fs.writeFileSync(path.join(__dirname, '..', 'data', 'recorded-run.json'), JSON.stringify(out, null, 1) + '\n');

const toolCalls = events.filter((e) => e.type === 'tool_call');
const distinctTools = new Set(toolCalls.map((e) => (e as { tool: string }).tool));
console.log(`events: ${events.length}, duration: ${(t / 1000).toFixed(1)}s`);
console.log(`tool calls: ${toolCalls.length} across ${distinctTools.size} distinct tools`);
console.log(`findings: ${state.findings.length}, drafts: ${state.drafts.length}`);
if (distinctTools.size < 6) throw new Error('acceptance: need ≥6 distinct tools in a run');
if (!state.calendar?.changes.some((c) => (c.linkedFindingIds?.length ?? 0) > 0))
  throw new Error('acceptance: calendar must cite finding IDs');
