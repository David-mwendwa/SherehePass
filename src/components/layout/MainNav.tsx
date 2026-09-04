'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { cn } from '@/lib/cn';

/**
 * The header's primary navigation.
 *
 * This is a client component for one reason: `aria-current`. Marking the
 * current page is not decoration — it is the only way a screen reader user
 * knows which of these they are already on, and the underline is the sighted
 * equivalent. Both need the current URL, which only the client knows.
 *
 * "This weekend" is `/events?when=this-weekend`, so matching on pathname alone
 * would light up both it and "Browse" on every events page. The query has to be
 * part of the comparison.
 */
const NAV = [
  { href: '/events', label: 'Browse' },
  { href: '/events?when=this-weekend', label: 'This weekend' },
  { href: '/organizers', label: 'Organisers' },
];

export function MainNav() {
  const pathname = usePathname();
  const params = useSearchParams();

  function isCurrent(href: string): boolean {
    const [path, query] = href.split('?');
    if (pathname !== path) return false;
    if (!query) {
      // The bare link is current only when no filter link is. Otherwise
      // "Browse" and "This weekend" would both be marked on the same page.
      return !NAV.some(
        (item) =>
          item.href !== href &&
          item.href.startsWith(`${path}?`) &&
          matchesQuery(item.href, params)
      );
    }
    return matchesQuery(href, params);
  }

  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      {NAV.map((item) => {
        const current = isCurrent(item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'relative rounded-lg px-3 py-2 text-sm transition-colors',
              current
                ? 'text-white'
                : 'text-dark-300 hover:bg-white/[0.06] hover:text-white'
            )}
          >
            {item.label}
            {current ? (
              <span
                aria-hidden="true"
                className="absolute inset-x-3 -bottom-px h-px bg-primary-500"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Every param in the link is present, with the same value, in the live URL. */
function matchesQuery(href: string, params: URLSearchParams): boolean {
  const query = href.split('?')[1];
  if (!query) return false;
  return [...new URLSearchParams(query)].every(
    ([key, value]) => params.get(key) === value
  );
}
