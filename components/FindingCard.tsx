'use client';

import Link from 'next/link';
import type { DropOffFinding } from '../types';
import { memberById } from '../lib/data';
import Avatar from './Avatar';
import RiskBadge from './RiskBadge';

/** A saved judgement. The cluster renders as chained avatars — four people, one cause. */
export default function FindingCard({ finding, compact = false }: { finding: DropOffFinding; compact?: boolean }) {
  const anchor = memberById(finding.memberId);
  if (!anchor) return null;
  const clusterIds = [finding.memberId, ...finding.relatedMemberIds];
  const cluster = clusterIds.map(memberById).filter(Boolean);

  return (
    <article className="rounded-lg border border-hairline bg-surface p-4">
      <header className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {cluster.slice(0, 4).map((m) => (
            <Avatar key={m!.id} name={m!.name} size={32} className="ring-2 ring-surface" />
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold leading-tight">
            {cluster.length > 1 ? (
              <>
                {anchor.name} <span className="font-body text-sm font-normal text-muted">+ {cluster.length - 1} others</span>
              </>
            ) : (
              anchor.name
            )}
          </p>
          <p className="text-sm text-muted">
            Last seen {finding.lastAttended} · {finding.weeksAbsent} weeks ago
          </p>
        </div>
        <RiskBadge tier={finding.riskTier} />
      </header>

      <p className="mt-3 text-[15px] leading-relaxed">
        <span className="font-semibold text-jade-deep">{finding.id} · inferred cause ({finding.causeConfidence} confidence):</span>{' '}
        {finding.inferredCause}
      </p>

      {!compact && (
        <>
          <p className="mt-2 text-sm text-muted">{finding.priorPattern}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {finding.riskFactors.map((f) => (
              <li key={f} className="rounded-full bg-paper px-2.5 py-0.5 text-sm text-muted">
                {f}
              </li>
            ))}
          </ul>
        </>
      )}

      <footer className="mt-3 flex flex-wrap gap-2">
        {cluster.map((m) => (
          <Link
            key={m!.id}
            href={`/member/${m!.id}`}
            className="rounded-md bg-jade-soft px-2.5 py-1 text-sm font-medium text-jade-deep hover:bg-jade hover:text-white"
          >
            {m!.name} →
          </Link>
        ))}
      </footer>
    </article>
  );
}
