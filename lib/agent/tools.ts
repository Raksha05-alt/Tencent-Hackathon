/**
 * Agent tools. Every function here is a pure, deterministic data operation —
 * no LLM anywhere in this file. Judgement happens in the model between calls;
 * these tools only supply facts (read tools) or record decisions (write tools).
 */
import {
  members,
  programmes,
  attendance,
  scheduleChanges,
  waitlists,
  memberById,
  programmeById,
  TODAY,
  weeksBetween,
  lastAttendedDate,
} from '../data';
import type {
  DropOffFinding,
  OutreachDraft,
  CalendarProposal,
  ContributorMatch,
  MonthlyReport,
  ProgrammePerformance,
} from '../../types';

// ---------- run state (write tools record into this) ----------
export interface RunState {
  findings: DropOffFinding[];
  drafts: OutreachDraft[];
  calendar: CalendarProposal | null;
  contributor: ContributorMatch | null;
  report: MonthlyReport | null;
}

export function newRunState(): RunState {
  return { findings: [], drafts: [], calendar: null, contributor: null, report: null };
}

// ---------- read tools ----------

export function load_roster() {
  const missingLanguages = members.filter((m) => m.languages.length === 0);
  const missingMobility = members.filter((m) => m.mobility === null);
  const missingContact = members.filter((m) => m.emergencyContact === null);

  // Near-duplicate names (Levenshtein distance 1 between different members).
  const lev = (a: string, b: string): number => {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
    return dp[a.length][b.length];
  };
  const nearDuplicates: string[] = [];
  for (let i = 0; i < members.length; i++)
    for (let j = i + 1; j < members.length; j++)
      if (lev(members[i].name.toLowerCase(), members[j].name.toLowerCase()) <= 2)
        nearDuplicates.push(`${members[i].name} (${members[i].id}) / ${members[j].name} (${members[j].id})`);

  // Interest tags that differ only by casing.
  const tagCase = new Map<string, Set<string>>();
  for (const m of members)
    for (const t of m.interests) {
      const k = t.toLowerCase();
      if (!tagCase.has(k)) tagCase.set(k, new Set());
      tagCase.get(k)!.add(t);
    }
  const inconsistentTags = [...tagCase.entries()]
    .filter(([, v]) => v.size > 1)
    .map(([, v]) => [...v].join(' / '));

  const warnings: string[] = [];
  if (missingLanguages.length)
    warnings.push(`${missingLanguages.length} members have no recorded language (${missingLanguages.map((m) => m.id).join(', ')})`);
  if (missingMobility.length)
    warnings.push(`${missingMobility.length} members missing mobility status (${missingMobility.map((m) => m.id).join(', ')})`);
  if (missingContact.length)
    warnings.push(`${missingContact.length} members have no emergency contact (${missingContact.map((m) => m.id).join(', ')})`);
  if (nearDuplicates.length)
    warnings.push(`Near-identical names — verify these are different people before any merge: ${nearDuplicates.join('; ')}`);
  if (inconsistentTags.length)
    warnings.push(`${inconsistentTags.length} interest tags spelled inconsistently (e.g. ${inconsistentTags.slice(0, 3).join(', ')})`);

  return {
    memberCount: members.length,
    programmeCount: programmes.length,
    attendanceRecords: attendance.length,
    historyRange: { from: '2026-01-01', to: '2026-07-31' },
    fieldCompleteness: {
      languages: `${members.length - missingLanguages.length}/${members.length}`,
      mobility: `${members.length - missingMobility.length}/${members.length}`,
      emergencyContact: `${members.length - missingContact.length}/${members.length}`,
      staffNotes: `${members.filter((m) => m.staffNotes).length}/${members.length}`,
    },
    warnings,
  };
}

export function query_attendance(args: {
  memberId?: string;
  programmeId?: string;
  from?: string;
  to?: string;
}) {
  const rows = attendance.filter(
    (a) =>
      (!args.memberId || a.memberId === args.memberId) &&
      (!args.programmeId || a.programmeId === args.programmeId) &&
      (!args.from || a.date >= args.from) &&
      (!args.to || a.date <= args.to)
  );
  return { count: rows.length, records: rows.slice(0, 300) };
}

export interface AttendanceGap {
  memberId: string;
  name: string;
  lastAttended: string;
  weeksAbsent: number;
  priorSessionsPerWeek: number; // average over the 12 weeks before last attendance
  mainProgramme: { id: string; name: string; share: number };
  livesAlone: boolean;
  age: number;
}

export function compute_attendance_gaps(args: { minWeeksAbsent: number }) {
  const gaps: AttendanceGap[] = [];
  for (const m of members) {
    const last = lastAttendedDate(m.id);
    if (!last) continue; // never attended — waitlist-only members are not "drop-offs"
    const weeksAbsent = weeksBetween(last, TODAY);
    if (weeksAbsent < args.minWeeksAbsent) continue;

    const windowFrom = new Date(Date.parse(last + 'T00:00:00Z') - 84 * 86400000)
      .toISOString()
      .slice(0, 10);
    const prior = attendance.filter(
      (a) => a.memberId === m.id && a.attended && a.date >= windowFrom && a.date <= last
    );
    const byProg = new Map<string, number>();
    for (const a of prior) byProg.set(a.programmeId, (byProg.get(a.programmeId) ?? 0) + 1);
    const [topProg, topCount] = [...byProg.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['—', 0];

    gaps.push({
      memberId: m.id,
      name: m.name,
      lastAttended: last,
      weeksAbsent,
      priorSessionsPerWeek: Math.round((prior.length / 12) * 10) / 10,
      mainProgramme: {
        id: topProg,
        name: programmeById(topProg)?.name ?? '—',
        share: prior.length ? Math.round((topCount / prior.length) * 100) / 100 : 0,
      },
      livesAlone: m.livesAlone,
      age: m.age,
    });
  }
  gaps.sort((a, b) => b.weeksAbsent - a.weeksAbsent || b.age - a.age);
  return { asOf: TODAY, count: gaps.length, gaps };
}

export function get_schedule_changes(args: { from?: string; to?: string } = {}) {
  const rows = scheduleChanges.filter(
    (c) => (!args.from || c.effectiveDate >= args.from) && (!args.to || c.effectiveDate <= args.to)
  );
  return rows.map((c) => ({ ...c, programmeName: programmeById(c.programmeId)?.name ?? c.programmeId }));
}

const ACTIVE_WINDOW_FROM = '2026-07-11'; // "currently active" = attended in the last 3 weeks

export function get_programme_retention(): ProgrammePerformance[] {
  return programmes.map((p) => {
    const rows = attendance.filter((a) => a.programmeId === p.id);
    const starters = new Set(rows.filter((a) => a.attended).map((a) => a.memberId));
    const actives = new Set(
      rows.filter((a) => a.attended && a.date >= ACTIVE_WINDOW_FROM).map((a) => a.memberId)
    );
    return {
      programmeId: p.id,
      name: p.name,
      starters: starters.size,
      currentActives: actives.size,
      retentionPct: starters.size
        ? Math.round((actives.size / starters.size) * 100)
        : 0,
      waitlistSize: waitlists.filter((w) => w.programmeId === p.id).length,
    };
  });
}

export function get_member_profile(args: { memberId: string }) {
  const m = memberById(args.memberId);
  if (!m) return { error: `No member ${args.memberId}` };
  const last = lastAttendedDate(m.id);
  const total = attendance.filter((a) => a.memberId === m.id && a.attended).length;
  return { ...m, lastAttended: last, totalAttendances: total };
}

/**
 * Fuzzy interest search. Groups inconsistently-spelled tags into concept
 * families via a synonym map — deliberately NOT string equality, so
 * "Sewing" / "needlework" / "mending clothes" all resolve to one concept.
 */
const CONCEPTS: Record<string, string[]> = {
  textiles: ['sewing', 'sew', 'needlework', 'mending', 'mending clothes', 'handicraft', 'tailoring', 'stitching', 'knitting', 'crochet', 'embroidery'],
  music: ['karaoke', 'singing', 'music'],
  movement: ['walking', 'yoga', 'tai chi', 'exercise'],
  games: ['mahjong', 'chess', 'cards'],
  food: ['cooking', 'baking', 'kopi', 'kopi with friends'],
  arts: ['calligraphy', 'photography', 'painting'],
};

function conceptsFor(text: string): Set<string> {
  const norm = text.toLowerCase().trim();
  const out = new Set<string>();
  for (const [concept, terms] of Object.entries(CONCEPTS)) {
    if (terms.some((t) => norm === t || norm.includes(t) || t.includes(norm))) out.add(concept);
  }
  return out;
}

export function search_members_by_interest(args: { query: string }) {
  const queryConcepts = new Set(
    args.query
      .toLowerCase()
      .split(/[,/&+]| and | or /)
      .flatMap((part) => [...conceptsFor(part.trim())])
  );
  const matches = members
    .map((m) => {
      const matched = m.interests.filter((tag) =>
        [...conceptsFor(tag)].some((c) => queryConcepts.has(c))
      );
      return { memberId: m.id, name: m.name, matchedTags: matched };
    })
    .filter((r) => r.matchedTags.length > 0);
  return {
    query: args.query,
    conceptGroups: [...queryConcepts],
    matchCount: matches.length,
    matches,
    note: 'Matched by concept grouping across inconsistent spellings, not exact strings.',
  };
}

export function get_waitlists(args: { programmeId?: string } = {}) {
  const rows = waitlists.filter((w) => !args.programmeId || w.programmeId === args.programmeId);
  return rows.map((w) => ({
    ...w,
    memberName: memberById(w.memberId)?.name ?? w.memberId,
    programmeName: programmeById(w.programmeId)?.name ?? w.programmeId,
  }));
}

// ---------- write tools ----------

export function save_finding(state: RunState, finding: Omit<DropOffFinding, 'id'>) {
  const id = `F-${String(state.findings.length + 1).padStart(3, '0')}`;
  state.findings.push({ ...finding, id });
  return { id };
}

export function draft_outreach(
  state: RunState,
  draft: Omit<OutreachDraft, 'id' | 'status'>
) {
  const id = `O-${String(state.drafts.length + 1).padStart(3, '0')}`;
  state.drafts.push({ ...draft, id, status: 'pending' });
  return { id };
}

export function propose_calendar(
  state: RunState,
  proposal: Omit<CalendarProposal, 'id'>
) {
  const linked = proposal.changes.some((c) => (c.linkedFindingIds?.length ?? 0) > 0);
  if (!linked && process.env.NODE_ENV !== 'production') {
    // The re-planning loop is the core requirement: the calendar must cite findings.
    console.warn('[silverops] calendar proposal cites no finding IDs — re-planning link missing');
  }
  state.calendar = { ...proposal, id: 'CAL-2026-08' };
  return { id: state.calendar.id, linkedToFindings: linked };
}

export function propose_contributor(
  state: RunState,
  match: Omit<ContributorMatch, 'id'>
) {
  state.contributor = { ...match, id: 'C-001' };
  return { id: 'C-001' };
}

export function compile_report(state: RunState, args: { month: string }): MonthlyReport {
  const monthRows = attendance.filter((a) => a.date.startsWith('2026-07'));
  const report: MonthlyReport = {
    id: `R-${args.month}`,
    month: args.month,
    totals: {
      sessionsHeld: new Set(monthRows.map((a) => `${a.programmeId}|${a.date}`)).size,
      attendances: monthRows.filter((a) => a.attended).length,
      uniqueAttendees: new Set(monthRows.filter((a) => a.attended).map((a) => a.memberId)).size,
      noShows: monthRows.filter((a) => !a.attended).length,
    },
    programmePerformance: get_programme_retention(),
    dropOffs: {
      found: state.findings.length,
      highRisk: state.findings.filter((f) => f.riskTier === 'high').length,
      outreachDrafted: state.drafts.length,
    },
    narrative:
      'Compiled for coordinator review and submission. All outreach items remain drafts pending approval; nothing has been sent.',
  };
  state.report = report;
  return report;
}

// ---------- registry (shared by live loop and recorder) ----------

export type ToolName =
  | 'load_roster'
  | 'query_attendance'
  | 'compute_attendance_gaps'
  | 'get_schedule_changes'
  | 'get_programme_retention'
  | 'get_member_profile'
  | 'search_members_by_interest'
  | 'get_waitlists'
  | 'save_finding'
  | 'draft_outreach'
  | 'propose_calendar'
  | 'propose_contributor'
  | 'compile_report';

export function executeTool(state: RunState, name: ToolName, args: unknown): unknown {
  const a = args as never;
  switch (name) {
    case 'load_roster': return load_roster();
    case 'query_attendance': return query_attendance(a);
    case 'compute_attendance_gaps': return compute_attendance_gaps(a);
    case 'get_schedule_changes': return get_schedule_changes(a);
    case 'get_programme_retention': return get_programme_retention();
    case 'get_member_profile': return get_member_profile(a);
    case 'search_members_by_interest': return search_members_by_interest(a);
    case 'get_waitlists': return get_waitlists(a);
    case 'save_finding': return save_finding(state, a);
    case 'draft_outreach': return draft_outreach(state, a);
    case 'propose_calendar': return propose_calendar(state, a);
    case 'propose_contributor': return propose_contributor(state, a);
    case 'compile_report': return compile_report(state, a);
  }
}
