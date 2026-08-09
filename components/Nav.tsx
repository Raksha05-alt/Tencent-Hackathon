'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '../lib/store';

const LINKS = [
  { href: '/', label: 'Morning Brief' },
  { href: '/run', label: 'Agent Run' },
  { href: '/approvals', label: 'Approvals' },
  { href: '/calendar', label: 'Calendar' },
  { href: '/report', label: 'Report' },
];

export default function Nav() {
  const pathname = usePathname();
  const { state, resetDemo } = useStore();
  const pending = state.drafts.filter((d) => d.status === 'pending').length;

  return (
    <nav className="mb-8 border-b border-hairline bg-surface">
      <div className="mx-auto flex max-w-[1220px] items-center gap-8 px-6 py-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl font-bold tracking-tight">
            Silver<span className="text-jade">Ops</span>
          </span>
          <span className="hidden text-sm text-muted sm:inline">Toa Payoh Active Ageing Centre</span>
        </Link>
        <div className="flex flex-1 items-center gap-1">
          {LINKS.map((l) => {
            const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-[15px] ${
                  active ? 'bg-jade-soft font-semibold text-jade-deep' : 'text-muted hover:text-ink'
                }`}
              >
                {l.label}
                {l.href === '/approvals' && pending > 0 && (
                  <span className="ml-1.5 rounded-full bg-jade px-1.5 py-0.5 text-xs font-semibold text-white">
                    {pending}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        <button
          onClick={resetDemo}
          className="no-print rounded-md border border-hairline px-3 py-1.5 text-sm text-muted hover:text-ink"
        >
          Reset demo
        </button>
      </div>
    </nav>
  );
}


