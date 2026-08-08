'use client';

import Link from 'next/link';
import { members, attendance, waitlists, memberById, programmeById } from '../lib/data';
import { useStore } from '../lib/store';
import Avatar from '../components/Avatar';

/** Members who came back in the last two weeks of July after a 4+ week gap —
 *  the reward loop, computed from the roster itself. */
function weeklyWins() {
  const wins: { name: string; id: string; programme: string; gapWeeks: number }[] = [];
  for (const m of members) {
    const dates = attendance.filter((a) => a.memberId === m.id && a.attended).sort((a, b) => a.date.localeCompare(b.date));
    const recent = dates.find((d) => d.date >= '2026-07-18');
    if (!recent) continue;
    const before = dates.filter((d) => d.date < recent.date);
    if (!before.length) continue;
    const gapDays = (Date.parse(recent.date) - Date.parse(before[before.length - 1].date)) / 86400000;
    if (gapDays >= 28)
      wins.push({
        name: m.name,
        id: m.id,
        programme: programmeById(recent.programmeId)?.name ?? '',
        gapWeeks: Math.round(gapDays / 7),
      });
  }
  return wins;
}

export default function MorningBrief() {
  const { state } = useStore();
  const highRisk = state.findings.filter((f) => f.riskTier === 'high');
  const pending = state.drafts.filter((d) => d.status === 'pending');
  const wins = weeklyWins();
  const topRisk = highRisk[0] && memberById(highRisk[0].memberId);

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Good morning, Mei</h1>
          <p className="mt-1 text-muted">
            Saturday 1 August 2026 · Toa Payoh Active Ageing Centre · {members.length} members
          </p>
        </div>
        <Link
          href="/run"
          className="no-print rounded-md bg-jade px-6 py-3 font-display text-lg font-semibold text-white hover:bg-jade-deep"
        >
          Run this month’s review
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-hairline bg-surface p-5" aria-label="Attention needed">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Attention needed</h2>
          {state.phase === 'done' && highRisk.length > 0 && topRisk ? (
            <>
              <p className="mt-2 font-display text-2xl font-semibold text-risk">
                {highRisk.length} member{highRisk.length > 1 ? 's' : ''} at high risk
              </p>
              <Link href={`/member/${topRisk.id}`} className="mt-3 flex items-center gap-3 rounded-md bg-risk-soft p-3 hover:bg-risk/15">
                <Avatar name={topRisk.name} size={36} />
                <span>
                  <span className="block font-display font-semibold">{topRisk.name}</span>
                  <span className="text-sm text-muted">
                    {highRisk[0].weeksAbsent} weeks without contact — phone call drafted
                  </span>
                </span>
              </Link>
            </>
          ) : (
            <p className="mt-2 text-muted">
              {state.phase === 'done' ? 'No high-risk members right now.' : 'Run the review to surface anyone slipping away quietly.'}
            </p>
          )}
        </section>

        <section className="rounded-lg border border-hairline bg-surface p-5" aria-label="Awaiting approval">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Awaiting your approval</h2>
          {pending.length > 0 ? (
            <>
              <p className="mt-2 font-display text-2xl font-semibold">{pending.length} outreach drafts</p>
              <p className="mt-1 text-sm text-muted">Nothing is sent until you approve it.</p>
              <Link href="/approvals" className="mt-3 inline-block rounded-md bg-jade px-4 py-1.5 font-semibold text-white hover:bg-jade-deep">
                Review drafts
              </Link>
            </>
          ) : (
            <p className="mt-2 text-muted">
              {state.drafts.length > 0 ? 'All drafts handled — nothing waiting on you.' : 'Drafts appear here after a review run.'}
            </p>
          )}
        </section>

        <section className="rounded-lg border border-hairline bg-surface p-5" aria-label="This week">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">This week</h2>
          <ul className="mt-2 space-y-1.5 text-[15px]">
            <li>
              <span className="font-semibold">{waitlists.length} members</span> waiting for a seat —{' '}
              {state.calendar ? (
                <Link href="/calendar" className="text-jade underline">2 new slots proposed</Link>
              ) : (
                'Chair Yoga and Cooking are oversubscribed'
              )}
            </li>
            <li>Mahjong Social running at less than half strength since the June move</li>
            <li>Health Talk this Wednesday, 14:00</li>
          </ul>
        </section>

        <section className="rounded-lg border border-jade-soft bg-jade-soft/50 p-5" aria-label="Wins this week">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-jade-deep">Wins this week</h2>
          {wins.length ? (
            <ul className="mt-2 space-y-2">
              {wins.map((w) => (
                <li key={w.id} className="flex items-center gap-3">
                  <Avatar name={w.name} size={32} />
                  <p className="text-[15px] leading-snug">
                    <Link href={`/member/${w.id}`} className="font-display font-semibold hover:text-jade">
                      {w.name}
                    </Link>{' '}
                    came back to {w.programme} — first time in {w.gapWeeks} weeks.
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted">Re-engagement wins land here.</p>
          )}
        </section>
      </div>

      <p className="mt-10 text-center font-display text-muted">
        The agent that makes sure no senior falls through the cracks.
      </p>
    </div>
  );
}
