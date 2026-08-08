'use client';

import Link from 'next/link';
import { programmes, programmeById, memberById } from '../../lib/data';
import { useStore } from '../../lib/store';
import Avatar from '../../components/Avatar';
import type { CalendarChange } from '../../types';

const ACTION_STYLE: Record<CalendarChange['action'], string> = {
  keep: 'bg-paper text-muted',
  reschedule: 'bg-jade-soft text-jade-deep',
  'add-slot': 'bg-jade-soft text-jade-deep',
  discontinue: 'bg-risk-soft text-risk',
  create: 'bg-amber-soft text-amber',
};

export default function CalendarPage() {
  const { state } = useStore();
  const proposal = state.calendar;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold">August calendar proposal</h1>
        <p className="mt-1 max-w-2xl text-muted">
          July on the left, the agent’s proposal on the right. Every change carries its reasoning, and
          changes born from this run’s findings link straight to the members they recover.
        </p>
      </header>

      {!proposal ? (
        <p className="rounded-lg border border-dashed border-hairline p-8 text-center text-muted">
          No proposal yet — <Link href="/run" className="text-jade underline">run the monthly review</Link>{' '}
          and the agent will rebuild the calendar from retention data.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_2fr] gap-4 px-4 text-sm font-semibold uppercase tracking-wide text-muted">
            <p>Current (July)</p>
            <p>Proposed (August)</p>
          </div>

          {proposal.changes.map((change, i) => {
            const prog = change.programmeId ? programmeById(change.programmeId) : null;
            const linkedFindings = (change.linkedFindingIds ?? [])
              .map((id) => state.findings.find((f) => f.id === id))
              .filter(Boolean);
            const affectedIds = linkedFindings.flatMap((f) => [f!.memberId, ...f!.relatedMemberIds]);

            return (
              <div
                key={i}
                className="grid grid-cols-[1fr_2fr] gap-4 rounded-lg border border-hairline bg-surface p-4"
              >
                <div className={change.action === 'discontinue' ? 'opacity-60' : ''}>
                  {prog ? (
                    <>
                      <p className="font-display text-lg font-semibold">{prog.name}</p>
                      <p className="text-sm text-muted">
                        {prog.dayOfWeek} {prog.startTime} · {prog.room} · cap {prog.capacity}
                      </p>
                    </>
                  ) : (
                    <p className="italic text-muted">— no such programme yet</p>
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${ACTION_STYLE[change.action]}`}>
                      {change.action}
                    </span>
                    <p className="font-medium">{change.detail}</p>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{change.rationale}</p>

                  {linkedFindings.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-md bg-jade-soft p-2.5">
                      <span className="text-sm font-semibold text-jade-deep">
                        ⇄ Driven by finding {linkedFindings.map((f) => f!.id).join(', ')}
                        {change.programmeId === 'P-01' && ' — recovers the 4 members lost to the 11 Jun change:'}
                      </span>
                      {affectedIds.map((id) => {
                        const m = memberById(id);
                        return (
                          m && (
                            <Link
                              key={id}
                              href={`/member/${id}`}
                              className="flex items-center gap-1.5 rounded-full bg-surface py-0.5 pl-0.5 pr-2.5 text-sm font-medium hover:bg-jade hover:text-white"
                            >
                              <Avatar name={m.name} size={22} />
                              {m.name}
                            </Link>
                          )
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <p className="pt-2 text-sm text-muted">
            {programmes.length} programmes reviewed · proposal {proposal.id} · approve changes with your
            centre’s usual process — the agent only proposes.
          </p>
        </div>
      )}
    </div>
  );
}
