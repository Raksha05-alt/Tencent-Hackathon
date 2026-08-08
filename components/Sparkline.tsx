'use client';

import { weeklySeries } from '../lib/data';

/**
 * Seven months of weekly attendance as an SVG bar sparkline.
 * Optional marker annotates a structural event (e.g. the 11 Jun schedule change)
 * so a cliff reads as caused, not mysterious.
 */
export default function Sparkline({
  memberId,
  markerDate,
  markerLabel,
}: {
  memberId: string;
  markerDate?: string;
  markerLabel?: string;
}) {
  const series = weeklySeries(memberId);
  const max = Math.max(2, ...series.map((s) => s.count));
  const bw = 100 / series.length;
  const markerIdx = markerDate
    ? series.findIndex((s) => s.weekStart <= markerDate && markerDate < addDays(s.weekStart, 7))
    : -1;

  return (
    <figure>
      <svg
        viewBox="0 0 100 32"
        preserveAspectRatio="none"
        className="h-24 w-full"
        role="img"
        aria-label={`Weekly attendance for the last 7 months${markerLabel ? `; marker: ${markerLabel}` : ''}`}
      >
        {series.map((s, i) => {
          const h = (s.count / max) * 26;
          return (
            <rect
              key={s.weekStart}
              x={i * bw + bw * 0.15}
              y={30 - h}
              width={bw * 0.7}
              height={Math.max(h, s.count > 0 ? 1 : 0)}
              rx={0.6}
              fill={markerIdx >= 0 && i > markerIdx ? '#c9d4cd' : '#1F6E66'}
            />
          );
        })}
        <line x1="0" y1="30.5" x2="100" y2="30.5" stroke="#dde3db" strokeWidth="0.5" />
        {markerIdx >= 0 && (
          <line
            x1={markerIdx * bw + bw}
            y1="0"
            x2={markerIdx * bw + bw}
            y2="30"
            stroke="#A93B32"
            strokeWidth="0.6"
            strokeDasharray="1.5 1.2"
          />
        )}
      </svg>
      <figcaption className="mt-1 flex justify-between text-sm text-muted">
        <span>Jan 2026</span>
        {markerLabel && <span className="font-medium text-risk">{markerLabel}</span>}
        <span>Jul 2026</span>
      </figcaption>
    </figure>
  );
}

function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(isoDate + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10);
}
