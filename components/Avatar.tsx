const PALETTE = ['#1F6E66', '#8A5A17', '#4A5A8A', '#7A4A6E', '#3E6B45', '#8A4A3E'];

function initials(name: string): string {
  const parts = name.replace(/\b(binte?|bin|s\/o|d\/o)\b/gi, '').trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '');
}

export default function Avatar({
  name,
  size = 40,
  className = '',
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const hue = PALETTE[(name.charCodeAt(0) + name.length) % PALETTE.length];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-white ${className}`}
      style={{ width: size, height: size, background: hue, fontSize: size * 0.38 }}
    >
      {initials(name).toUpperCase()}
    </span>
  );
}
