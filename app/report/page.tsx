'use client';

import Link from 'next/link';
import { useStore } from '../../lib/store';

function downloadMarkdown(report: NonNullable<ReturnType<typeof useReport>>) {
  const lines = [
    `# Toa Payoh Active Ageing Centre — Monthly Report, ${report.month}`,
    '',
    '_Compiled by SilverOps for coordinator review and submission. Nothing has been submitted automatically._',
    '',
    '## Attendance',
    `- Sessions held: ${report.totals.sessionsHeld}`,
    `- Total attendances: ${report.totals.attendances}`,
    `- Unique members attending: ${report.totals.uniqueAttendees}`,
    `- Registered no-shows: ${report.totals.noShows}`,
    '',
    '## Programme performance',
    '| Programme | Starters | Active now | Retention | Waitlist |',
    '|---|---|---|---|---|',
    ...report.programmePerformance.map(
      (p) => `| ${p.name} | ${p.starters} | ${p.currentActives} | ${p.retentionPct}% | ${p.waitlistSize} |`
    ),
    '',
    '## Member engagement follow-up',
    `- Drop-off findings this run: ${report.dropOffs.found}`,
    `- High-risk members: ${report.dropOffs.highRisk}`,
    `- Outreach drafts prepared (pending coordinator approval): ${report.dropOffs.outreachDrafted}`,
    '',
    report.narrative,
  ].join('\n');

  const blob = new Blob([lines], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SilverOps-Monthly-Report-${report.month}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function useReport() {
  return useStore().state.report;
}

export default function ReportPage() {
  const report = useReport();

  if (!report)
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-3xl font-bold">Monthly report</h1>
        <p className="rounded-lg border border-dashed border-hairline p-8 text-center text-muted">
          The report compiles at the end of a review run —{' '}
          <Link href="/run" className="text-jade underline">run it now</Link>.
        </p>
      </div>
    );

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Monthly report — July 2026</h1>
          <p className="mt-1 text-muted">Compiled for coordinator review and submission. The agent never submits anything.</p>
        </div>
        <div className="no-print flex gap-2">
          <button
            onClick={() => downloadMarkdown(report)}
            className="rounded-md bg-jade px-4 py-2 font-semibold text-white hover:bg-jade-deep"
          >
            Download (.md)
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-md border border-hairline px-4 py-2 hover:bg-surface"
          >
            Print / PDF
          </button>
        </div>
      </header>

      <div className="space-y-6 rounded-lg border border-hairline bg-surface p-6">
        <section aria-label="Totals">
          <h2 className="mb-3 text-xl font-semibold">Attendance</h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(
              [
                ['Sessions held', report.totals.sessionsHeld],
                ['Attendances', report.totals.attendances],
                ['Members seen', report.totals.uniqueAttendees],
                ['No-shows', report.totals.noShows],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-md bg-paper p-3">
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="font-display text-2xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-label="Programme performance">
          <h2 className="mb-3 text-xl font-semibold">Programme performance</h2>
          <table className="w-full text-[15px]">
            <thead>
              <tr className="border-b border-hairline text-left text-sm uppercase tracking-wide text-muted">
                <th className="py-2 pr-3 font-semibold">Programme</th>
                <th className="py-2 pr-3 font-semibold">Starters</th>
                <th className="py-2 pr-3 font-semibold">Active</th>
                <th className="py-2 pr-3 font-semibold">Retention</th>
                <th className="py-2 font-semibold">Waitlist</th>
              </tr>
            </thead>
            <tbody>
              {report.programmePerformance.map((p) => (
                <tr key={p.programmeId} className="border-b border-hairline/60">
                  <td className="py-2 pr-3 font-medium">{p.name}</td>
                  <td className="py-2 pr-3">{p.starters}</td>
                  <td className="py-2 pr-3">{p.currentActives}</td>
                  <td className="py-2 pr-3">{p.retentionPct}%</td>
                  <td className="py-2">{p.waitlistSize || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-sm text-muted">
            Health Talk runs monthly, so the 3-week activity window under-reads its retention.
          </p>
        </section>

        <section aria-label="Follow-up">
          <h2 className="mb-2 text-xl font-semibold">Member engagement follow-up</h2>
          <ul className="space-y-1 text-[15px]">
            <li>{report.dropOffs.found} drop-off findings from this month’s review</li>
            <li>{report.dropOffs.highRisk} member(s) triaged high-risk, routed to phone calls</li>
            <li>{report.dropOffs.outreachDrafted} outreach drafts prepared — all pending coordinator approval</li>
          </ul>
          <p className="mt-3 rounded-md bg-paper p-3 text-[15px] italic text-muted">{report.narrative}</p>
        </section>
      </div>
    </div>
  );
}
