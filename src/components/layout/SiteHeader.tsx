import Link from 'next/link';
import { Search, Ticket } from 'lucide-react';

import { Suspense } from 'react';

import type { CurrentUser } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/layout/Logo';
import { MainNav } from '@/components/layout/MainNav';
import { MobileNav } from '@/components/layout/MobileNav';
import { UserMenu } from '@/components/layout/UserMenu';

/**
 * The header is a Server Component: it knows who is signed in without shipping
 * the user object, the session logic or a fetch to the browser. Only the pieces
 * that genuinely need the browser — the account dropdown, the drawer, and the
 * nav that has to mark the current page — are client components.
 *
 * The split at `md` is total: below it the links, the account menu and the
 * ticket shortcut all live in the drawer, so the bar itself carries the brand,
 * search and the way in. Trying to keep a sign-up button out here as well
 * leaves roughly 100px for it at 390px wide, and everything ends up touching.
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

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/events"
            aria-label="Search events"
            className="rounded-lg p-2 text-dark-200 transition-colors hover:bg-white/[0.06] hover:text-white md:hidden"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </Link>

          {user ? (
            <>
              <Button
                href="/tickets"
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex"
              >
                <Ticket className="h-4 w-4" />
                My tickets
              </Button>
              <div className="hidden md:block">
                <UserMenu user={user} />
              </div>
            </>
          ) : (
            <>
              <Button
                href="/signin"
                variant="ghost"
                size="sm"
                className="hidden md:inline-flex"
              >
                Sign in
              </Button>
              <Button href="/signup" size="sm" className="hidden md:inline-flex">
                Get started
              </Button>
            </>
          )}

          {/* Same reason as MainNav: the drawer closes itself on navigation,
              which it detects from the pathname and querystring. */}
          <Suspense
            fallback={
              <div className="h-9 w-9 md:hidden" aria-hidden="true" />
            }
          >
            <MobileNav user={user} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
