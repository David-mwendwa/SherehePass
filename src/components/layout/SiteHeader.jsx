import Link from 'next/link';
import { Search, Ticket } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/layout/Logo';
import { UserMenu } from '@/components/layout/UserMenu';

/**
 * The header is a Server Component: it knows who is signed in without shipping
 * the user object, the session logic or a fetch to the browser. Only the two
 * genuinely interactive pieces — the account dropdown and the mobile menu —
 * are client components, and they live inside UserMenu.
 */
const NAV = [
  { href: '/events', label: 'Browse' },
  { href: '/events?when=this-weekend', label: 'This weekend' },
  { href: '/organizers', label: 'Organisers' },
];

export function SiteHeader({ user }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-dark-950/80 backdrop-blur-xl">
      <div
        className="container flex items-center gap-6"
        style={{ height: 'var(--header-h)' }}
      >
        <Link href="/" aria-label="SherehePass home" className="shrink-0">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-dark-300 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/events"
            aria-label="Search events"
            className="rounded-lg p-2 text-dark-300 transition-colors hover:bg-white/[0.06] hover:text-white sm:hidden"
          >
            <Search className="h-5 w-5" />
          </Link>

          {user ? (
            <>
              <Button
                href="/tickets"
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
              >
                <Ticket className="h-4 w-4" />
                My tickets
              </Button>
              <UserMenu user={user} />
            </>
          ) : (
            <>
              <Button
                href="/signin"
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
              >
                Sign in
              </Button>
              <Button href="/signup" size="sm">
                Get started
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
