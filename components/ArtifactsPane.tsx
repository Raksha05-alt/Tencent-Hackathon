'use client';

import Link from 'next/link';
import { useStore } from '../lib/store';
import { memberById } from '../lib/data';
import FindingCard from './FindingCard';
import Avatar from './Avatar';

/** Right pane of the run screen: the agent's outputs materialising as it works. */
export default function ArtifactsPane() {
  const { state } = useStore();
  const { findings, drafts, calendar, contributor, report } = state;
  const empty = !findings.length && !drafts.length && !calendar && !contributor && !report;

  if (empty)
    return (
      <p className="rounded-lg border border-dashed border-hairline p-6 text-center text-muted">
        Findings and drafts will appear here as the agent works.
      </p>
    );

  return (
    <div className="max-h-[calc(100vh-220px)] space-y-6 overflow-y-auto pr-1">
      {findings.length > 0 && (
        <section aria-label="Findings">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Findings</h3>
          <div className="space-y-3">
            {findings.map((f) => (
              <div key={f.id} className="trace-in">
                <FindingCard finding={f} compact />
              </div>
            ))}
          </div>
        </section>
      )}

      {drafts.length > 0 && (
        <section aria-label="Outreach drafts">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Outreach drafts — await your approval
          </h3>
          <ul className="space-y-2">
            {drafts.map((d) => {
              const m = memberById(d.memberId);
              return (
                <li key={d.id} className="trace-in">
                  <Link
                    href="/approvals"
                    className="flex items-center gap-3 rounded-lg border border-hairline bg-surface p-3 hover:border-jade"
                  >
                    <Avatar name={m?.name ?? d.memberId} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display font-semibold">{m?.name}</span>
                      <span className="text-sm text-muted">
                        {d.channel === 'phone' ? 'Phone call' : d.channel === 'sms' ? 'SMS' : 'WhatsApp'} · {d.language}
                      </span>
                    </span>
                    <span className="rounded-full bg-amber-soft px-2 py-0.5 text-sm font-semibold text-amber">
                      {d.status}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {calendar && (
        <section aria-label="Calendar proposal" className="trace-in">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">August calendar</h3>
          <Link href="/calendar" className="block rounded-lg border border-hairline bg-surface p-4 hover:border-jade">
            <p className="font-display text-lg font-semibold">
              {calendar.changes.filter((c) => c.action !== 'keep').length} changes proposed
            </p>
            <p className="mt-1 text-sm text-muted">
              {calendar.changes.filter((c) => c.linkedFindingIds?.length).length} driven directly by this run’s
              findings — including moving mahjong back to Tuesday. Review side-by-side →
            </p>
          </Link>
        </section>
      )}

      {contributor && (
        <section aria-label="Contributor proposal" className="trace-in">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Member as contributor</h3>
          <div className="rounded-lg border border-hairline bg-surface p-4">
            <div className="flex items-center gap-3">
              <Avatar name={memberById(contributor.memberId)?.name ?? ''} size={36} />
              <div>
                <Link
                  href={`/member/${contributor.memberId}`}
                  className="font-display text-lg font-semibold hover:text-jade"
                >
                  {memberById(contributor.memberId)?.name}
                </Link>
                <p className="text-sm text-muted">{contributor.proposedRole}</p>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted">
              {contributor.interestedMemberCount} members interested · invitation drafted for your review
            </p>
          </div>
        </section>
      )}

      {report && (
        <section aria-label="Monthly report" className="trace-in">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">July report</h3>
          <Link href="/report" className="block rounded-lg border border-hairline bg-surface p-4 hover:border-jade">
            <p className="font-display text-lg font-semibold">Compiled for your review</p>
            <p className="mt-1 text-sm text-muted">
              {report.totals.attendances} attendances · {report.totals.uniqueAttendees} members · ready to download →
            </p>
          </Link>
        </section>
      )}
    </div>
  );
}
