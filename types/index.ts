export type Language =
  | 'English'
  | 'Mandarin'
  | 'Hokkien'
  | 'Cantonese'
  | 'Malay'
  | 'Tamil';

export interface Member {
  id: string; // "M-001"
  name: string;
  age: number;
  gender: 'M' | 'F';
  languages: Language[]; // may be empty — messy data is intentional
  livesAlone: boolean;
  mobility: 'independent' | 'walking-aid' | 'wheelchair' | null;
  interests: string[]; // free-text tags, deliberately inconsistent
  emergencyContact: { name: string; relationship: string; phone: string } | null;
  joinedDate: string; // ISO
  staffNotes: string | null; // free text — carries hidden signal
  preferredChannel: 'whatsapp' | 'phone' | 'sms';
}

export interface Programme {
  id: string; // "P-01"
  name: string;
  category: 'physical' | 'social' | 'creative' | 'learning';
  dayOfWeek: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
  startTime: string; // "10:00"
  room: string;
  capacity: number;
  active: boolean;
}

export interface AttendanceRecord {
  memberId: string;
  programmeId: string;
  date: string; // ISO date
  attended: boolean; // false = registered but no-show
}

export interface ScheduleChange {
  programmeId: string;
  effectiveDate: string; // ISO
  field: 'dayOfWeek' | 'startTime' | 'room';
  from: string;
  to: string;
  reason: string | null;
}

export interface WaitlistEntry {
  memberId: string;
  programmeId: string;
  addedDate: string;
}

// ---- Agent-produced artifacts ----

export interface DropOffFinding {
  id: string; // "F-001", assigned by save_finding
  memberId: string;
  lastAttended: string;
  weeksAbsent: number;
  priorPattern: string; // "weekly, 2 years, consistently Tue mahjong"
  riskTier: 'high' | 'medium' | 'low';
  riskFactors: string[];
  inferredCause: string; // the judgement — model-generated
  causeConfidence: 'high' | 'medium' | 'low';
  relatedMemberIds: string[]; // the cluster, if part of one
}

export interface OutreachDraft {
  id: string;
  memberId: string;
  channel: 'whatsapp' | 'phone' | 'sms';
  language: Language;
  body: string; // message text, or call talking points
  englishGloss?: string; // translation shown alongside non-English drafts
  rationale: string; // why this framing was chosen
  status: 'pending' | 'approved' | 'edited' | 'declined';
}

export interface CalendarChange {
  programmeId: string | null; // null = new programme
  action: 'keep' | 'add-slot' | 'discontinue' | 'reschedule' | 'create';
  detail: string;
  rationale: string; // must cite retention data or a drop-off finding
  linkedFindingIds?: string[]; // proof of the re-planning loop
}

export interface CalendarProposal {
  id: string;
  month: string; // "2026-08"
  changes: CalendarChange[];
}

export interface ContributorMatch {
  id: string;
  memberId: string;
  proposedRole: string;
  evidence: string;
  interestedMemberCount: number;
  invitationDraft: string;
}

export interface ProgrammePerformance {
  programmeId: string;
  name: string;
  starters: number;
  currentActives: number;
  retentionPct: number;
  waitlistSize: number;
}

export interface MonthlyReport {
  id: string;
  month: string;
  totals: {
    sessionsHeld: number;
    attendances: number;
    uniqueAttendees: number;
    noShows: number;
  };
  programmePerformance: ProgrammePerformance[];
  dropOffs: { found: number; highRisk: number; outreachDrafted: number };
  narrative: string;
}

// ---- Agent event stream ----

export type AgentEvent =
  | { type: 'plan'; steps: string[] }
  | { type: 'thinking'; text: string }
  | { type: 'tool_call'; tool: string; args: unknown; callId: string }
  | { type: 'tool_result'; callId: string; summary: string; data: unknown }
  | { type: 'finding'; finding: DropOffFinding }
  | {
      type: 'artifact';
      kind: 'outreach' | 'calendar' | 'contributor' | 'report';
      payload: unknown;
    }
  | { type: 'done'; summary: string };

export type RecordedEvent = AgentEvent & { at: number }; // ms offset from run start

export interface RecordedRun {
  recordedAt: string;
  events: RecordedEvent[];
}
