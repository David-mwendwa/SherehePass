import Link from 'next/link';
import { Search, Ticket } from 'lucide-react';

import { Suspense } from 'react';

import type { CurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/layout/Logo';
import { MainNav } from '@/components/layout/MainNav';
import { UserMenu } from '@/components/layout/UserMenu';

/**
 * The header is a Server Component: it knows who is signed in without shipping
 * the user object, the session logic or a fetch to the browser. Only the pieces
 * that genuinely need the browser — the account dropdown, and the nav that has
 * to mark the current page — are client components.
 */
export function SiteHeader({ user }: { user: CurrentUser | null }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-dark-950/80 backdrop-blur-xl">
      <div
        className="container flex items-center gap-6"
        style={{ height: 'var(--header-h)' }}
      >
        <Link href="/" aria-label="SherehePass home" className="shrink-0">
          <Logo />
        </Link>

        {/* `useSearchParams` opts its subtree out of static rendering, so the
            nav is wrapped rather than left to bubble that up to the whole
            header. The fallback reserves the same width so nothing shifts. */}
        <Suspense
          fallback={<div className="hidden h-9 w-72 md:block" aria-hidden="true" />}
        >
          <MainNav />
        </Suspense>

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
