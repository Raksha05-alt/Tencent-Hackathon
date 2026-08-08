'use client';

import Link from 'next/link';
import { useStore } from '../../lib/store';
import DraftCard from '../../components/DraftCard';

export default function ApprovalsPage() {
  const { state } = useStore();
  const pending = state.drafts.filter((d) => d.status === 'pending');
  const settled = state.drafts.filter((d) => d.status !== 'pending');

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Approval queue</h1>
        <p className="mt-1 text-muted">
          The agent drafts; you decide. Approve, edit, or decline — no message reaches a member without
          your say-so.
        </p>
      </header>

      {state.drafts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-hairline p-8 text-center text-muted">
          Nothing here yet — <Link href="/run" className="text-jade underline">run the monthly review</Link>{' '}
          to generate outreach drafts.
        </p>
      ) : (
        <div className="space-y-8">
          <section aria-label="Pending drafts">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Pending — {pending.length}
            </h2>
            {pending.length ? (
              <div className="space-y-4">
                {pending.map((d) => (
                  <DraftCard key={d.id} draft={d} />
                ))}
              </div>
            ) : (
              <p className="text-muted">All caught up.</p>
            )}
          </section>

          {settled.length > 0 && (
            <section aria-label="Handled drafts">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
                Handled — {settled.length}
              </h2>
              <div className="space-y-4 opacity-80">
                {settled.map((d) => (
                  <DraftCard key={d.id} draft={d} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
