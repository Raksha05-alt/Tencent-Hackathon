/**
 * Asserts every planted pattern actually holds in the generated data,
 * using the real tool implementations. Run: npm run verify-data
 */
import {
  load_roster,
  compute_attendance_gaps,
  get_schedule_changes,
  get_programme_retention,
  search_members_by_interest,
  get_waitlists,
  get_member_profile,
} from '../lib/agent/tools';
import { members, attendance } from '../lib/data';

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

// Pattern A — mahjong cluster
const CLUSTER = ['M-004', 'M-011', 'M-019', 'M-027'];
const gaps = compute_attendance_gaps({ minWeeksAbsent: 4 }).gaps;
for (const id of CLUSTER) {
  const g = gaps.find((x) => x.memberId === id);
  check(`A: ${id} in gap list, last attended 2026-06-09`, g?.lastAttended === '2026-06-09', `got ${g?.lastAttended}`);
  check(`A: ${id} main programme is Mahjong`, g?.mainProgramme.id === 'P-01');
}
const changes = get_schedule_changes({ from: '2026-05-01', to: '2026-07-01' });
check('A: mahjong Tue→Thu change effective 2026-06-11 exists',
  changes.some((c) => c.programmeId === 'P-01' && c.field === 'dayOfWeek' && c.from === 'Tue' && c.to === 'Thu' && c.effectiveDate === '2026-06-11'));
check('A: cluster attended ≥18 sessions each (strong prior pattern)',
  CLUSTER.every((id) => attendance.filter((a) => a.memberId === id && a.programmeId === 'P-01' && a.attended).length >= 18));
check('A: other mahjong regulars continued after the move',
  ['M-009', 'M-025', 'M-039'].every((id) => attendance.some((a) => a.memberId === id && a.programmeId === 'P-01' && a.attended && a.date > '2026-06-11')));

// Pattern B — Fatimah
const fat = gaps.find((x) => x.memberId === 'M-008');
check('B: M-008 last attended 2026-05-20', fat?.lastAttended === '2026-05-20', `got ${fat?.lastAttended}`);
check('B: M-008 gap ≥ 10 weeks', (fat?.weeksAbsent ?? 0) >= 10, `got ${fat?.weeksAbsent}`);
const fatQ1 = attendance.filter((a) => a.memberId === 'M-008' && a.attended && a.date <= '2026-03-31').length;
check('B: M-008 attended ≥30 times Jan–Mar (3×/week prior)', fatQ1 >= 30, `got ${fatQ1}`);
const fatProfile = get_member_profile({ memberId: 'M-008' }) as { staffNotes?: string };
check('B: hospital signal in staff notes', /hospital/i.test(fatProfile.staffNotes ?? ''));

// Pattern C — contributor match
const sewing = search_members_by_interest({ query: 'sewing, mending, handicraft' });
check('C: ≥18 members in sewing-family concept group', sewing.matchCount >= 18, `got ${sewing.matchCount}`);
check('C: matches include inconsistent spellings', new Set(sewing.matches.flatMap((m) => m.matchedTags.map((t) => t.toLowerCase()))).size >= 4);
const wong = get_member_profile({ memberId: 'M-015' }) as { staffNotes?: string };
check('C: Mrs Wong tailor signal present', /tailor/i.test(wong.staffNotes ?? ''));
check('C: Mrs Wong attends 3×/week and is current',
  attendance.filter((a) => a.memberId === 'M-015' && a.attended && a.date >= '2026-07-01').length >= 10);

// Patterns D & E — retention table
const perf = get_programme_retention();
const p02 = perf.find((p) => p.programmeId === 'P-02')!;
const p03 = perf.find((p) => p.programmeId === 'P-03')!;
const p04 = perf.find((p) => p.programmeId === 'P-04')!;
const p01 = perf.find((p) => p.programmeId === 'P-01')!;
check('D: calligraphy had 8 starters', p03.starters === 8, `got ${p03.starters}`);
check('D: calligraphy retention ≤ 30%', p03.retentionPct <= 30, `got ${p03.retentionPct}%`);
check('E: chair yoga retention 85–92%', p02.retentionPct >= 85 && p02.retentionPct <= 92, `got ${p02.retentionPct}%`);
check('E: chair yoga waitlist = 12', p02.waitlistSize === 12, `got ${p02.waitlistSize}`);
check('E: cooking waitlist (15) exceeds capacity (12)', p04.waitlistSize === 15, `got ${p04.waitlistSize}`);
check('A/E: mahjong lost members after move (retention < 60%)', p01.retentionPct < 60, `got ${p01.retentionPct}%`);

// Messiness quotas
const roster = load_roster();
check('messy: ≥3 members missing language', members.filter((m) => m.languages.length === 0).length >= 3);
check('messy: ≥2 members missing mobility', members.filter((m) => m.mobility === null).length >= 2);
check('messy: ≥3 members without emergency contact', members.filter((m) => m.emergencyContact === null).length >= 3);
check('messy: near-duplicate name warning fires (Ah Kow / Ah Kau)', roster.warnings.some((w) => w.includes('Ah Kow') && w.includes('Ah Kau')));
check('messy: inconsistent tag casing warning fires', roster.warnings.some((w) => w.toLowerCase().includes('inconsistent')));

// Pulse — a prior re-engagement win exists
const wins = members.filter((m) => {
  const dates = attendance.filter((a) => a.memberId === m.id && a.attended).map((a) => a.date).sort();
  const recent = dates.filter((d) => d >= '2026-07-18');
  if (!recent.length) return false;
  const before = dates.filter((d) => d < recent[0]);
  if (!before.length) return false;
  const gapDays = (Date.parse(recent[0]) - Date.parse(before[before.length - 1])) / 86400000;
  return gapDays >= 28;
});
check('pulse: ≥1 member returned in late July after a ≥4-week gap', wins.length >= 1, wins.map((w) => w.id).join(', '));

// Triage noise — gap list contains benign cases too, so triage is real work
check('noise: gap list has more members than just the planted patterns', gaps.length >= 7, `got ${gaps.length}`);
console.log(`\ngap list (${gaps.length}):`);
for (const g of gaps) console.log(`  ${g.memberId} ${g.name} — last ${g.lastAttended}, ${g.weeksAbsent}w, main: ${g.mainProgramme.name}, alone: ${g.livesAlone}, age ${g.age}`);

const waits = get_waitlists();
console.log(`\nretention:`);
for (const p of perf) console.log(`  ${p.programmeId} ${p.name}: ${p.starters} starters → ${p.currentActives} active (${p.retentionPct}%), waitlist ${p.waitlistSize}`);
console.log(`\nsewing family: ${sewing.matchCount} members; waitlist entries total: ${waits.length}`);

if (failures) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log('\nAll checks passed.');
