const STYLES = {
  high: 'bg-risk-soft text-risk',
  medium: 'bg-amber-soft text-amber',
  low: 'bg-jade-soft text-jade-deep',
} as const;

/** Colour is never the only encoding — the tier is always written out. */
export default function RiskBadge({ tier }: { tier: 'high' | 'medium' | 'low' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-sm font-semibold ${STYLES[tier]}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {tier} risk
    </span>
  );
}
