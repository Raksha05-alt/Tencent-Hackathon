'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { memberById, lastAttendedDate, attendance, scheduleChanges, programmeById } from '../../../lib/data';
import { useStore } from '../../../lib/store';
import Avatar from '../../../components/Avatar';
import Sparkline from '../../../components/Sparkline';
import FindingCard from '../../../components/FindingCard';
import DraftCard from '../../../components/DraftCard';

export default function MemberPage() {
  const params = useParams<{ id: string }>();
  const { state } = useStore();
  const member = memberById(params.id);
  if (!member)
    return (
      <p className="text-muted">
        No member with ID {params.id}. <Link href="/" className="text-jade underline">Back to the brief</Link>.
      </p>
    );

  const last = lastAttendedDate(member.id);
  const total = attendance.filter((a) => a.memberId === member.id && a.attended).length;
  const finding = state.findings.find(
    (f) => f.memberId === member.id || f.relatedMemberIds.includes(member.id)
  );
  const draft = state.drafts.find((d) => d.memberId === member.id);

  // Annotate the sparkline with a structural cause when one exists: a schedule
  // change to a programme this member attended, shortly after they were last seen.
  let marker: { date: string; label: string } | undefined;
  if (last) {
    const change = scheduleChanges.find(
      (c) =>
        c.effectiveDate > last &&
        Date.parse(c.effectiveDate) - Date.parse(last) < 15 * 86400000 &&
        attendance.some((a) => a.memberId === member.id && a.programmeId === c.programmeId && a.attended)
    );
    if (change)
      marker = {
        date: change.effectiveDate,
        label: `${programmeById(change.programmeId)?.name} moved ${change.from} → ${change.to}, ${change.effectiveDate}`,
      };
  }

  const clusterOthers = finding
    ? [finding.memberId, ...finding.relatedMemberIds].filter((id) => id !== member.id)
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center gap-5">
        <Avatar name={member.name} size={72} />
        <div className="min-w-0">
          <h1 className="text-4xl font-bold leading-tight">{member.name}</h1>
          <p className="mt-1 text-muted">
            {member.age} years old · {member.gender === 'F' ? 'female' : 'male'} ·{' '}
            {member.languages.length ? member.languages.join(', ') : 'language not recorded'}
            {member.livesAlone && ' · lives alone'}
            {member.mobility && member.mobility !== 'independent' && ` · ${member.mobility}`}
          </p>
          <p className="text-sm text-muted">
            Member since {member.joinedDate.slice(0, 7)} · prefers {member.preferredChannel} ·{' '}
            {member.emergencyContact
              ? `emergency contact: ${member.emergencyContact.name} (${member.emergencyContact.relationship})`
              : 'no emergency contact on file'}
          </p>
        </div>
      </header>

      {member.staffNotes && (
        <aside className="rounded-lg bg-amber-soft/60 px-5 py-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber">Staff note</p>
          <p className="mt-1 font-display text-[16px] leading-relaxed">“{member.staffNotes}”</p>
        </aside>
      )}

      <section className="rounded-lg border border-hairline bg-surface p-5" aria-label="Attendance history">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Attendance, Jan–Jul 2026</h2>
          <p className="text-sm text-muted">
            {total} visits · last seen <span className="font-semibold text-ink">{last ?? 'never'}</span>
          </p>
        </div>
        <Sparkline memberId={member.id} markerDate={marker?.date} markerLabel={marker?.label} />
      </section>

      {clusterOthers.length > 0 && (
        <section aria-label="Attends with">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Came with</h2>
          <div className="flex flex-wrap gap-2">
            {clusterOthers.map((id) => {
              const m = memberById(id);
              return (
                m && (
                  <Link
                    key={id}
                    href={`/member/${id}`}
                    className="flex items-center gap-2 rounded-full border border-hairline bg-surface py-1 pl-1 pr-3 hover:border-jade"
                  >
                    <Avatar name={m.name} size={28} />
                    <span className="font-medium">{m.name}</span>
                  </Link>
                )
              );
            })}
          </div>
        </section>
      )}

      {finding ? (
        <section aria-label="Agent finding">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            What the agent found
          </h2>
          <FindingCard finding={finding} />
        </section>
      ) : (
        state.phase === 'idle' && (
          <p className="rounded-lg border border-dashed border-hairline p-4 text-muted">
            Run the <Link href="/run" className="text-jade underline">monthly review</Link> to see the
            agent’s assessment of this member.
          </p>
        )
      )}

      {draft && (
        <section aria-label="Drafted outreach">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Drafted outreach — your call
          </h2>
          <DraftCard draft={draft} />
        </section>
      )}
    </div>
  );
}
