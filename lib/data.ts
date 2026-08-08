import membersJson from '../data/members.json';
import programmesJson from '../data/programmes.json';
import attendanceJson from '../data/attendance.json';
import scheduleChangesJson from '../data/schedule-changes.json';
import waitlistsJson from '../data/waitlists.json';
import type {
  Member,
  Programme,
  AttendanceRecord,
  ScheduleChange,
  WaitlistEntry,
} from '../types';

export const members = membersJson as Member[];
export const programmes = programmesJson as Programme[];
export const attendance = attendanceJson as AttendanceRecord[];
export const scheduleChanges = scheduleChangesJson as ScheduleChange[];
export const waitlists = waitlistsJson as WaitlistEntry[];

/** "Today" in the demo world. All gap math anchors here. */
export const TODAY = '2026-08-01';

export const memberById = (id: string) => members.find((m) => m.id === id);
export const programmeById = (id: string) => programmes.find((p) => p.id === id);

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (Date.parse(toIso + 'T00:00:00Z') - Date.parse(fromIso + 'T00:00:00Z')) / 86400000
  );
}

export function weeksBetween(fromIso: string, toIso: string): number {
  return Math.floor(daysBetween(fromIso, toIso) / 7);
}

/** Weekly attended-session counts for a member over the whole history (for sparklines). */
export function weeklySeries(memberId: string): { weekStart: string; count: number }[] {
  const start = Date.parse('2025-12-29T00:00:00Z'); // Monday of the week containing Jan 1
  const weeks: { weekStart: string; count: number }[] = [];
  for (let t = start; t < Date.parse(TODAY + 'T00:00:00Z'); t += 7 * 86400000) {
    weeks.push({ weekStart: new Date(t).toISOString().slice(0, 10), count: 0 });
  }
  for (const a of attendance) {
    if (a.memberId !== memberId || !a.attended) continue;
    const idx = Math.floor((Date.parse(a.date + 'T00:00:00Z') - start) / (7 * 86400000));
    if (weeks[idx]) weeks[idx].count++;
  }
  return weeks;
}

export function lastAttendedDate(memberId: string): string | null {
  let last: string | null = null;
  for (const a of attendance) {
    if (a.memberId === memberId && a.attended && (!last || a.date > last)) last = a.date;
  }
  return last;
}
