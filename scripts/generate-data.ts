/**
 * Deterministic seed-data generator for the Toa Payoh AAC demo roster.
 * Run: npm run generate-data
 *
 * Planted patterns (see docs/superpowers/specs/2026-08-09-silverops-design.md):
 *  A. Mahjong Tue→Thu move (effective 2026-06-11) — M-004/M-011/M-019/M-027
 *     attended weekly, last attended Tue 2026-06-09, nothing since.
 *  B. M-008 Fatimah — slow taper, zero since 2026-05-20, hospital note, high risk.
 *  C. M-015 Wong Siew Kuen — retired tailor, 3×/week; 18 members carry
 *     inconsistently-spelled sewing-family interest tags.
 *  D. P-03 Calligraphy — 8 starters from 2026-05-06, 6 gone after week 2.
 *  E. P-02 Chair Yoga ~89% retention + 12 waitlisted; P-04 Cooking waitlist 15 > cap 12.
 *  Pulse: M-033 returned late July after a 6-week gap (prior re-engagement win).
 */
import * as fs from 'fs';
import * as path from 'path';
import type {
  Member,
  Programme,
  AttendanceRecord,
  ScheduleChange,
  WaitlistEntry,
  Language,
} from '../types';

// ---------- deterministic PRNG ----------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260801);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

// ---------- date helpers ----------
const DAY: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const iso = (d: Date) => d.toISOString().slice(0, 10);
function datesFor(dayOfWeek: string, from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  while (d.getUTCDay() !== DAY[dayOfWeek]) d.setUTCDate(d.getUTCDate() + 1);
  while (d <= end) {
    out.push(iso(d));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return out;
}

const HISTORY_FROM = '2026-01-01';
const HISTORY_TO = '2026-07-31';

// ---------- programmes ----------
const programmes: Programme[] = [
  { id: 'P-01', name: 'Mahjong Social', category: 'social', dayOfWeek: 'Thu', startTime: '14:00', room: 'Activity Room 2', capacity: 16, active: true },
  { id: 'P-02', name: 'Chair Yoga', category: 'physical', dayOfWeek: 'Mon', startTime: '10:00', room: 'Multi-Purpose Hall', capacity: 15, active: true },
  { id: 'P-03', name: 'Calligraphy Class', category: 'creative', dayOfWeek: 'Wed', startTime: '15:00', room: 'Activity Room 1', capacity: 12, active: true },
  { id: 'P-04', name: 'Cooking Together', category: 'social', dayOfWeek: 'Fri', startTime: '11:00', room: 'Kitchen Studio', capacity: 12, active: true },
  { id: 'P-05', name: 'Karaoke Afternoon', category: 'social', dayOfWeek: 'Sat', startTime: '14:00', room: 'Multi-Purpose Hall', capacity: 25, active: true },
  { id: 'P-06', name: 'Brisk Walking Group', category: 'physical', dayOfWeek: 'Tue', startTime: '07:30', room: 'Void Deck (meet)', capacity: 20, active: true },
  { id: 'P-07', name: 'Tech Help Clinic', category: 'learning', dayOfWeek: 'Wed', startTime: '10:00', room: 'Activity Room 1', capacity: 8, active: true },
  { id: 'P-08', name: 'Health Talk', category: 'learning', dayOfWeek: 'Wed', startTime: '14:00', room: 'Multi-Purpose Hall', capacity: 30, active: true },
];

// Mahjong ran on Tuesdays until 2026-06-11 (a Thursday), then moved.
// A benign room change in March gives the model a decoy to reason past.
const scheduleChanges: ScheduleChange[] = [
  { programmeId: 'P-05', effectiveDate: '2026-03-14', field: 'room', from: 'Activity Room 2', to: 'Multi-Purpose Hall', reason: 'Larger room for growing group' },
  { programmeId: 'P-01', effectiveDate: '2026-06-11', field: 'dayOfWeek', from: 'Tue', to: 'Thu', reason: 'Tuesday slot reassigned to visiting physiotherapy vendor' },
];

// ---------- members ----------
type Channel = 'whatsapp' | 'phone' | 'sms';
interface Spec {
  id: string; name: string; age: number; gender: 'M' | 'F';
  languages: Language[]; livesAlone: boolean;
  mobility: Member['mobility'];
  interests: string[]; ec: boolean; joined: string;
  notes: string | null; channel: Channel;
}

const S = (s: Spec): Spec => s;

const memberSpecs: Spec[] = [
  S({ id: 'M-001', name: 'Ng Siew Eng', age: 74, gender: 'F', languages: ['Mandarin', 'English'], livesAlone: false, mobility: 'independent', interests: ['tai chi', 'gardening'], ec: true, joined: '2023-04-12', notes: null, channel: 'whatsapp' }),
  S({ id: 'M-002', name: 'Ramasamy s/o Muthu', age: 77, gender: 'M', languages: ['Tamil', 'English'], livesAlone: false, mobility: 'independent', interests: ['walking', 'chess'], ec: true, joined: '2022-11-03', notes: 'Prefers morning activities, fetches grandson from school at 1pm.', channel: 'whatsapp' }),
  S({ id: 'M-003', name: 'Chan Kwok Wai', age: 69, gender: 'M', languages: ['Cantonese', 'English'], livesAlone: false, mobility: 'independent', interests: ['karaoke', 'Singing'], ec: true, joined: '2024-02-19', notes: null, channel: 'whatsapp' }),
  S({ id: 'M-004', name: 'Tan Ah Kow', age: 78, gender: 'M', languages: ['Hokkien', 'English'], livesAlone: true, mobility: 'independent', interests: ['mahjong', 'kopi with friends'], ec: true, joined: '2024-01-09', notes: 'Comes with the Tuesday group — always leaves together for lunch after. Quiet but sharp.', channel: 'whatsapp' }),
  S({ id: 'M-005', name: 'Sarojini d/o Pillai', age: 72, gender: 'F', languages: ['Tamil', 'English'], livesAlone: false, mobility: 'independent', interests: ['cooking', 'needlework'], ec: true, joined: '2023-08-21', notes: null, channel: 'whatsapp' }),
  S({ id: 'M-006', name: 'Ho Lai Peng', age: 80, gender: 'F', languages: ['Cantonese'], livesAlone: true, mobility: 'walking-aid', interests: ['Sewing', 'karaoke'], ec: true, joined: '2022-06-30', notes: 'Daughter works shifts; comes by herself on the shuttle.', channel: 'phone' }),
  S({ id: 'M-007', name: 'Abdul Rahman bin Ismail', age: 75, gender: 'M', languages: ['Malay', 'English'], livesAlone: false, mobility: 'independent', interests: ['walking', 'gardening'], ec: true, joined: '2023-01-17', notes: null, channel: 'whatsapp' }),
  S({ id: 'M-008', name: 'Fatimah Binte Osman', age: 81, gender: 'F', languages: ['Malay', 'English'], livesAlone: true, mobility: 'walking-aid', interests: ['cooking', 'sewing', 'Health talks'], ec: true, joined: '2022-03-08', notes: 'Husband admitted to hospital in April. Used to come almost every day with him.', channel: 'whatsapp' }),
  S({ id: 'M-009', name: 'Lee Chin Huat', age: 71, gender: 'M', languages: ['Hokkien', 'Mandarin'], livesAlone: false, mobility: 'independent', interests: ['chess', 'mahjong'], ec: true, joined: '2024-05-02', notes: null, channel: 'sms' }),
  S({ id: 'M-010', name: 'Mary D’Souza', age: 68, gender: 'F', languages: ['English'], livesAlone: false, mobility: 'independent', interests: ['knitting', 'reading'], ec: true, joined: '2024-09-15', notes: null, channel: 'whatsapp' }),
  S({ id: 'M-011', name: 'Lim Boon Heng', age: 82, gender: 'M', languages: ['Hokkien'], livesAlone: true, mobility: 'walking-aid', interests: ['mahjong'], ec: true, joined: '2023-10-05', notes: 'Thursday is his market day with his daughter at Toa Payoh Lorong 8. Do not schedule visits then.', channel: 'phone' }),
  S({ id: 'M-012', name: 'Koh Bee Lian', age: 73, gender: 'F', languages: ['Mandarin', 'Hokkien'], livesAlone: false, mobility: 'independent', interests: ['cooking', 'Cooking', 'karaoke'], ec: true, joined: '2023-03-11', notes: null, channel: 'whatsapp' }),
  S({ id: 'M-013', name: 'Wee Teck Seng', age: 79, gender: 'M', languages: [], livesAlone: true, mobility: null, interests: ['walking'], ec: false, joined: '2025-01-20', notes: 'Registration form half-filled; son submitted it on his behalf. Follow up on languages.', channel: 'phone' }),
  S({ id: 'M-014', name: 'Aisha Binte Hamid', age: 66, gender: 'F', languages: ['Malay', 'English'], livesAlone: false, mobility: 'independent', interests: ['cooking', 'handicraft'], ec: true, joined: '2025-03-02', notes: null, channel: 'whatsapp' }),
  S({ id: 'M-015', name: 'Wong Siew Kuen', age: 71, gender: 'F', languages: ['Cantonese', 'Mandarin', 'English'], livesAlone: false, mobility: 'independent', interests: ['sewing', 'handicraft', 'cooking'], ec: true, joined: '2022-08-14', notes: 'Was a tailor at Chinatown for 30 years. Offered to fix Mdm Rahim’s blouse last month — did it overnight, beautiful work.', channel: 'whatsapp' }),
  S({ id: 'M-016', name: 'Tan Ah Kau', age: 70, gender: 'M', languages: ['Hokkien', 'Mandarin'], livesAlone: false, mobility: 'independent', interests: ['karaoke', 'walking'], ec: true, joined: '2024-11-08', notes: 'NOT the same person as Tan Ah Kow (M-004) — different block, different family.', channel: 'whatsapp' }),
  S({ id: 'M-017', name: 'Cheong Mei Fong', age: 76, gender: 'F', languages: ['Cantonese', 'Mandarin'], livesAlone: true, mobility: 'independent', interests: ['mending clothes', 'karaoke'], ec: true, joined: '2023-06-25', notes: null, channel: 'whatsapp' }),
  S({ id: 'M-018', name: 'Krishnan s/o Raju', age: 83, gender: 'M', languages: ['Tamil'], livesAlone: true, mobility: 'wheelchair', interests: ['chess', 'music'], ec: false, joined: '2022-12-01', notes: 'Wheelchair via shuttle only. Very social once here.', channel: 'phone' }),
  S({ id: 'M-019', name: 'Goh Mei Lan', age: 75, gender: 'F', languages: ['Mandarin'], livesAlone: false, mobility: 'independent', interests: ['mahjong', 'needlework'], ec: true, joined: '2023-09-30', notes: 'Husband drops her off on his way to work.', channel: 'whatsapp' }),
  S({ id: 'M-020', name: 'Ong Guan Kim', age: 67, gender: 'M', languages: ['Hokkien', 'English'], livesAlone: false, mobility: 'independent', interests: ['walking', 'photography'], ec: true, joined: '2025-02-11', notes: null, channel: 'whatsapp' }),
  S({ id: 'M-021', name: 'Halimah Binte Yusof', age: 74, gender: 'F', languages: ['Malay'], livesAlone: true, mobility: 'independent', interests: ['sewing', 'cooking'], ec: true, joined: '2023-02-27', notes: 'Re-engaged after July call — daughter says the call meant a lot.', channel: 'phone' }),
  S({ id: 'M-022', name: 'Rahimah Binte Salleh', age: 79, gender: 'F', languages: ['Malay', 'English'], livesAlone: false, mobility: 'walking-aid', interests: ['Needlework', 'health talks'], ec: true, joined: '2022-05-19', notes: 'Everyone calls her Mdm Rahim.', channel: 'whatsapp' }),
  S({ id: 'M-023', name: 'Foo Chee Keong', age: 65, gender: 'M', languages: ['Mandarin', 'English'], livesAlone: false, mobility: 'independent', interests: ['tech', 'chess'], ec: true, joined: '2025-05-06', notes: 'Retired engineer; helps others with phones informally.', channel: 'whatsapp' }),
  S({ id: 'M-024', name: 'Devi d/o Subramaniam', age: 70, gender: 'F', languages: ['Tamil', 'English'], livesAlone: false, mobility: 'independent', interests: ['sewing', 'gardening'], ec: true, joined: '2024-03-18', notes: null, channel: 'whatsapp' }),
  S({ id: 'M-025', name: 'Yap Soon Hock', age: 84, gender: 'M', languages: ['Hokkien', 'Mandarin'], livesAlone: true, mobility: 'walking-aid', interests: ['mahjong', 'newspapers'], ec: false, joined: '2022-04-22', notes: 'Hard of hearing on the left. Speak up when calling.', channel: 'phone' }),
  S({ id: 'M-026', name: 'Chng Poh Choo', age: 69, gender: 'F', languages: ['Hokkien', 'Mandarin'], livesAlone: false, mobility: 'independent', interests: ['knitting', 'karaoke'], ec: true, joined: '2024-07-29', notes: null, channel: 'whatsapp' }),
  S({ id: 'M-027', name: 'Chua Seng Huat', age: 80, gender: 'M', languages: ['Hokkien', 'Mandarin'], livesAlone: true, mobility: 'independent', interests: ['mahjong', 'kopi'], ec: true, joined: '2023-11-14', notes: 'Best friends with Ah Kow since kampong days.', channel: 'whatsapp' }),
  S({ id: 'M-028', name: 'Zainab Binte Ahmad', age: 72, gender: 'F', languages: ['Malay'], livesAlone: false, mobility: 'independent', interests: ['cooking', 'mending clothes'], ec: true, joined: '2023-12-05', notes: null, channel: 'whatsapp' }),
  S({ id: 'M-029', name: 'Low Kim Seng', age: 77, gender: 'M', languages: [], livesAlone: false, mobility: 'independent', interests: ['walking', 'chess'], ec: true, joined: '2024-04-09', notes: null, channel: 'sms' }),
  S({ id: 'M-030', name: 'Phua Geok Lin', age: 68, gender: 'F', languages: ['Hokkien', 'English'], livesAlone: false, mobility: 'independent', interests: ['yoga', 'walking'], ec: true, joined: '2024-08-23', notes: 'Away in Perth visiting son most of July.', channel: 'whatsapp' }),
  S({ id: 'M-031', name: 'Tay Hwee Choo', age: 75, gender: 'F', languages: ['Mandarin'], livesAlone: true, mobility: 'independent', interests: ['calligraphy', 'sewing'], ec: true, joined: '2023-05-15', notes: null, channel: 'whatsapp' }),
  S({ id: 'M-032', name: 'Mohamed Farid bin Hassan', age: 69, gender: 'M', languages: ['Malay', 'English'], livesAlone: false, mobility: 'independent', interests: ['walking', 'photography'], ec: true, joined: '2025-04-14', notes: null, channel: 'whatsapp' }),
  S({ id: 'M-033', name: 'Quek Siok Hwa', age: 78, gender: 'F', languages: ['Hokkien', 'Mandarin'], livesAlone: true, mobility: 'independent', interests: ['karaoke', 'cooking'], ec: true, joined: '2022-09-26', notes: 'Was away after knee op in June; coordinator called mid-July, back since 20 Jul and doing well.', channel: 'phone' }),
  S({ id: 'M-034', name: 'Seetoh Kok Leong', age: 73, gender: 'M', languages: ['Cantonese', 'English'], livesAlone: false, mobility: 'independent', interests: ['calligraphy', 'chess'], ec: true, joined: '2024-06-17', notes: null, channel: 'whatsapp' }),
  S({ id: 'M-035', name: 'Nur Aini Binte Kassim', age: 67, gender: 'F', languages: ['Malay', 'English'], livesAlone: false, mobility: 'independent', interests: ['Handicraft', 'cooking'], ec: true, joined: '2025-06-08', notes: null, channel: 'whatsapp' }),
  S({ id: 'M-036', name: 'Pang Ah Moy', age: 85, gender: 'F', languages: ['Hokkien'], livesAlone: true, mobility: 'walking-aid', interests: ['sewing', 'karaoke'], ec: false, joined: '2022-02-14', notes: 'Oldest regular. Granddaughter checks in weekly.', channel: 'phone' }),
  S({ id: 'M-037', name: 'Vellu s/o Karuppiah', age: 71, gender: 'M', languages: ['Tamil', 'English'], livesAlone: false, mobility: 'independent', interests: ['walking', 'music'], ec: true, joined: '2024-10-30', notes: null, channel: 'whatsapp' }),
  S({ id: 'M-038', name: 'Sim Lay Hoon', age: 66, gender: 'F', languages: ['Mandarin', 'English'], livesAlone: false, mobility: 'independent', interests: ['yoga', 'sewing'], ec: true, joined: '2025-01-05', notes: null, channel: 'whatsapp' }),
  S({ id: 'M-039', name: 'Teo Kah Wah', age: 76, gender: 'M', languages: ['Hokkien', 'Mandarin'], livesAlone: false, mobility: null, interests: ['mahjong', 'newspapers'], ec: true, joined: '2023-07-07', notes: null, channel: 'sms' }),
  S({ id: 'M-040', name: 'Leong Yoke Lan', age: 74, gender: 'F', languages: ['Cantonese'], livesAlone: true, mobility: 'independent', interests: ['knitting', 'karaoke', 'crochet'], ec: true, joined: '2023-04-03', notes: null, channel: 'whatsapp' }),
  S({ id: 'M-041', name: 'Goh Teck Meng', age: 70, gender: 'M', languages: [], livesAlone: false, mobility: 'independent', interests: ['walking'], ec: true, joined: '2025-07-01', notes: 'New member, brought by neighbour M-020.', channel: 'whatsapp' }),
  S({ id: 'M-042', name: 'Kamala d/o Naidu', age: 78, gender: 'F', languages: ['Tamil'], livesAlone: true, mobility: 'walking-aid', interests: ['needlework', 'health talks'], ec: true, joined: '2022-10-11', notes: null, channel: 'phone' }),
  S({ id: 'M-043', name: 'Chia Beng Soon', age: 72, gender: 'M', languages: ['Hokkien', 'English'], livesAlone: false, mobility: 'independent', interests: ['calligraphy', 'photography'], ec: true, joined: '2024-12-12', notes: null, channel: 'whatsapp' }),
  S({ id: 'M-044', name: 'Rosnah Binte Jaafar', age: 68, gender: 'F', languages: ['Malay', 'English'], livesAlone: false, mobility: 'independent', interests: ['sewing', 'cooking'], ec: true, joined: '2024-01-28', notes: null, channel: 'whatsapp' }),
  S({ id: 'M-045', name: 'Auw Cheng Lock', age: 81, gender: 'M', languages: ['Hokkien', 'Mandarin'], livesAlone: false, mobility: 'walking-aid', interests: ['newspapers', 'chess'], ec: false, joined: '2022-07-20', notes: 'Comes with wife (not a member). Likes the quiet corner.', channel: 'phone' }),
];

const EC_NAMES = ['Tan Wei Ming', 'Nurul Huda', 'David Lim', 'Priya', 'Alice Wong', 'Hassan', 'Jenny Koh', 'Suresh', 'Michelle Tan', 'Faizal'];
const members: Member[] = memberSpecs.map((s) => ({
  id: s.id,
  name: s.name,
  age: s.age,
  gender: s.gender,
  languages: s.languages,
  livesAlone: s.livesAlone,
  mobility: s.mobility,
  interests: s.interests,
  emergencyContact: s.ec
    ? { name: pick(EC_NAMES), relationship: pick(['son', 'daughter', 'niece', 'nephew', 'sibling']), phone: `9${Math.floor(rand() * 9000000 + 1000000)}` }
    : null,
  joinedDate: s.joined,
  staffNotes: s.notes,
  preferredChannel: s.channel,
}));

// ---------- attendance ----------
// Membership: which member attends which programme, over which window, at what rate.
interface Membership {
  memberId: string;
  programmeId: string;
  from: string;
  to: string;
  rate: number; // P(attend | session)
  noShowRate?: number; // P(registered no-show | not attended)
}

const memberships: Membership[] = [];
const add = (m: Membership) => memberships.push(m);

// -- Pattern A: the mahjong cluster. Weekly Tuesdays, nothing after 2026-06-09.
const CLUSTER = ['M-004', 'M-011', 'M-019', 'M-027'];
for (const id of CLUSTER) add({ memberId: id, programmeId: 'P-01', from: HISTORY_FROM, to: '2026-06-09', rate: 0.96 });
// M-019 also sang karaoke occasionally — and stopped entirely after the change.
add({ memberId: 'M-019', programmeId: 'P-05', from: HISTORY_FROM, to: '2026-06-06', rate: 0.3 });

// Other mahjong regulars who DID follow the move to Thursday (makes the cluster stand out).
for (const id of ['M-009', 'M-025', 'M-039']) {
  add({ memberId: id, programmeId: 'P-01', from: HISTORY_FROM, to: HISTORY_TO, rate: 0.85 });
}

// -- Pattern B: Fatimah — 3×/week Jan–Mar, taper in April, zero after 2026-05-20.
add({ memberId: 'M-008', programmeId: 'P-02', from: HISTORY_FROM, to: '2026-03-31', rate: 0.92 });
add({ memberId: 'M-008', programmeId: 'P-04', from: HISTORY_FROM, to: '2026-03-31', rate: 0.9 });
add({ memberId: 'M-008', programmeId: 'P-07', from: HISTORY_FROM, to: '2026-03-31', rate: 0.85 });
add({ memberId: 'M-008', programmeId: 'P-02', from: '2026-04-01', to: '2026-04-30', rate: 0.4 });
add({ memberId: 'M-008', programmeId: 'P-04', from: '2026-04-01', to: '2026-04-30', rate: 0.3 });
add({ memberId: 'M-008', programmeId: 'P-07', from: '2026-05-01', to: '2026-05-19', rate: 0.5 });

// -- Pattern C: Mrs Wong, 3×/week, never misses.
add({ memberId: 'M-015', programmeId: 'P-02', from: HISTORY_FROM, to: HISTORY_TO, rate: 0.97 });
add({ memberId: 'M-015', programmeId: 'P-04', from: HISTORY_FROM, to: HISTORY_TO, rate: 0.97 });
add({ memberId: 'M-015', programmeId: 'P-05', from: HISTORY_FROM, to: HISTORY_TO, rate: 0.9 });

// -- Pattern D: Calligraphy started 2026-05-06; 6 of 8 gone after week 2.
const CALLIG_QUIT = ['M-031', 'M-034', 'M-043', 'M-010', 'M-026', 'M-038'];
const CALLIG_STAY = ['M-001', 'M-024'];
for (const id of CALLIG_QUIT) add({ memberId: id, programmeId: 'P-03', from: '2026-05-06', to: '2026-05-13', rate: 1 });
for (const id of CALLIG_STAY) add({ memberId: id, programmeId: 'P-03', from: '2026-05-06', to: HISTORY_TO, rate: 0.9 });

// -- Pattern E: Chair Yoga ~89% retention (18 starters, 16 active through July).
const YOGA_ACTIVE = ['M-001', 'M-005', 'M-012', 'M-014', 'M-022', 'M-024', 'M-028', 'M-030', 'M-035', 'M-038', 'M-040', 'M-044', 'M-006', 'M-017', 'M-018'];
for (const id of YOGA_ACTIVE) {
  // M-030 is in Perth most of July (pulse noise, low risk).
  const to = id === 'M-030' ? '2026-07-01' : HISTORY_TO;
  add({ memberId: id, programmeId: 'P-02', from: HISTORY_FROM, to, rate: 0.82 });
}
// Yoga churn is Fatimah (M-008) + M-030 (Perth) → 15/17 ≈ 88% retention.

// Cooking Together — full house, strong retention.
const COOKS = ['M-005', 'M-012', 'M-014', 'M-021', 'M-028', 'M-035', 'M-044', 'M-002', 'M-022', 'M-033'];
for (const id of COOKS) {
  if (id === 'M-021') {
    // Pulse win: Halimah dropped off mid-June, came back 20 Jul after coordinator call.
    add({ memberId: id, programmeId: 'P-04', from: HISTORY_FROM, to: '2026-06-05', rate: 0.85 });
    add({ memberId: id, programmeId: 'P-04', from: '2026-07-20', to: HISTORY_TO, rate: 1 });
  } else if (id === 'M-033') {
    // Pulse win: Quek Siok Hwa, knee op June, back since 20 Jul.
    add({ memberId: id, programmeId: 'P-04', from: HISTORY_FROM, to: '2026-06-01', rate: 0.8 });
    add({ memberId: id, programmeId: 'P-04', from: '2026-07-20', to: HISTORY_TO, rate: 1 });
  } else {
    add({ memberId: id, programmeId: 'P-04', from: HISTORY_FROM, to: HISTORY_TO, rate: 0.88 });
  }
}

// Karaoke Saturdays — big stable group.
const SINGERS = ['M-003', 'M-006', 'M-012', 'M-016', 'M-017', 'M-026', 'M-036', 'M-040', 'M-033', 'M-045', 'M-018', 'M-037'];
for (const id of SINGERS) {
  const windows = id === 'M-033' ? [{ from: HISTORY_FROM, to: '2026-06-01' }, { from: '2026-07-20', to: HISTORY_TO }] : [{ from: HISTORY_FROM, to: HISTORY_TO }];
  for (const w of windows) add({ memberId: id, programmeId: 'P-05', from: w.from, to: w.to, rate: 0.72 });
}

// Brisk Walking Tuesdays — stable but no-show-prone (early start).
const WALKERS = ['M-002', 'M-007', 'M-013', 'M-020', 'M-029', 'M-030', 'M-032', 'M-037', 'M-041', 'M-016'];
for (const id of WALKERS) {
  const from = id === 'M-041' ? '2026-07-01' : HISTORY_FROM; // new member joined July
  const to = id === 'M-030' ? '2026-07-01' : HISTORY_TO;
  add({ memberId: id, programmeId: 'P-06', from, to, rate: 0.6, noShowRate: 0.5 });
}

// Tech Help Clinic — small and steady.
for (const id of ['M-023', 'M-010', 'M-020', 'M-034', 'M-045']) {
  add({ memberId: id, programmeId: 'P-07', from: HISTORY_FROM, to: HISTORY_TO, rate: 0.55 });
}

// Health Talk — monthly (first Wed), broad drop-in crowd.
const HEALTH_DATES = ['2026-01-07', '2026-02-04', '2026-03-04', '2026-04-01', '2026-05-06', '2026-06-03', '2026-07-01'];
const HEALTH_CROWD = ['M-001', 'M-005', 'M-007', 'M-008', 'M-012', 'M-014', 'M-022', 'M-025', 'M-028', 'M-036', 'M-042', 'M-044', 'M-045', 'M-006', 'M-017', 'M-035'];

// ---------- generate records ----------
const attendance: AttendanceRecord[] = [];

// P-01 mahjong: Tuesday sessions until 2026-06-09, Thursday sessions from 2026-06-11.
function sessionDates(programmeId: string, from: string, to: string): string[] {
  if (programmeId === 'P-01') {
    const tue = datesFor('Tue', HISTORY_FROM, '2026-06-09');
    const thu = datesFor('Thu', '2026-06-11', HISTORY_TO);
    return [...tue, ...thu].filter((d) => d >= from && d <= to);
  }
  if (programmeId === 'P-03') {
    return datesFor('Wed', '2026-05-06', HISTORY_TO).filter((d) => d >= from && d <= to);
  }
  if (programmeId === 'P-08') {
    return HEALTH_DATES.filter((d) => d >= from && d <= to);
  }
  const p = programmes.find((x) => x.id === programmeId)!;
  return datesFor(p.dayOfWeek, HISTORY_FROM, HISTORY_TO).filter((d) => d >= from && d <= to);
}

for (const m of memberships) {
  for (const date of sessionDates(m.programmeId, m.from, m.to)) {
    const r = rand();
    if (r < m.rate) {
      attendance.push({ memberId: m.memberId, programmeId: m.programmeId, date, attended: true });
    } else if (m.noShowRate && rand() < m.noShowRate) {
      attendance.push({ memberId: m.memberId, programmeId: m.programmeId, date, attended: false });
    }
  }
}

// Health talks (drop-in, ~55%).
for (const date of HEALTH_DATES) {
  for (const id of HEALTH_CROWD) {
    if (id === 'M-008' && date > '2026-05-20') continue;
    if (rand() < 0.55) attendance.push({ memberId: id, programmeId: 'P-08', date, attended: true });
  }
}

// Force the anchor records the patterns depend on (PRNG must not miss these).
function forceRecord(memberId: string, programmeId: string, date: string) {
  if (!attendance.some((a) => a.memberId === memberId && a.programmeId === programmeId && a.date === date && a.attended)) {
    attendance.push({ memberId, programmeId, date, attended: true });
  }
}
for (const id of CLUSTER) forceRecord(id, 'P-01', '2026-06-09'); // last Tuesday before the move
forceRecord('M-008', 'P-07', '2026-05-20'); // Fatimah's final visit
forceRecord('M-021', 'P-04', '2026-07-24'); // Halimah back (Fri)
forceRecord('M-033', 'P-04', '2026-07-24'); // Siok Hwa back
for (const id of CALLIG_QUIT) { forceRecord(id, 'P-03', '2026-05-06'); forceRecord(id, 'P-03', '2026-05-13'); }
for (const id of CALLIG_STAY) forceRecord(id, 'P-03', '2026-07-29');
// Mrs Wong attended this week — "never misses" must survive the PRNG.
forceRecord('M-015', 'P-02', '2026-07-27');
forceRecord('M-015', 'P-04', '2026-07-31');

// Strip any accidental cluster/Fatimah records beyond their cutoffs (safety net).
const cutoffs: Record<string, string> = { 'M-004': '2026-06-09', 'M-011': '2026-06-09', 'M-019': '2026-06-09', 'M-027': '2026-06-09', 'M-008': '2026-05-20' };
const cleaned = attendance.filter((a) => !(cutoffs[a.memberId] && a.date > cutoffs[a.memberId]));

cleaned.sort((a, b) => a.date.localeCompare(b.date) || a.memberId.localeCompare(b.memberId) || a.programmeId.localeCompare(b.programmeId));

// ---------- waitlists ----------
const waitlists: WaitlistEntry[] = [];
const YOGA_WAIT = ['M-003', 'M-009', 'M-016', 'M-020', 'M-021', 'M-023', 'M-026', 'M-031', 'M-036', 'M-041', 'M-043', 'M-045'];
const COOK_WAIT = ['M-001', 'M-003', 'M-006', 'M-007', 'M-010', 'M-013', 'M-017', 'M-020', 'M-024', 'M-026', 'M-029', 'M-031', 'M-037', 'M-040', 'M-042'];
YOGA_WAIT.forEach((id, i) => waitlists.push({ memberId: id, programmeId: 'P-02', addedDate: iso(new Date(Date.UTC(2026, 3 + Math.floor(i / 4), 3 + (i % 4) * 6))) }));
COOK_WAIT.forEach((id, i) => waitlists.push({ memberId: id, programmeId: 'P-04', addedDate: iso(new Date(Date.UTC(2026, 2 + Math.floor(i / 4), 2 + (i % 4) * 7))) }));

// ---------- write ----------
const outDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(outDir, { recursive: true });
const write = (name: string, data: unknown) =>
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(data, null, 1) + '\n');

write('members.json', members);
write('programmes.json', programmes);
write('attendance.json', cleaned);
write('schedule-changes.json', scheduleChanges);
write('waitlists.json', waitlists);

console.log(`members: ${members.length}`);
console.log(`attendance records: ${cleaned.length}`);
console.log(`waitlists: ${waitlists.length}`);
