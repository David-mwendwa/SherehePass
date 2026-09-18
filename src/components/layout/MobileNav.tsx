'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  Bookmark,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Store,
  Ticket,
  User as UserIcon,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';

import type { CurrentUser } from '@/lib/auth';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/format';
import { cn } from '@/lib/cn';
import { signOutAction } from '@/app/(auth)/actions';

/**
 * Navigation for narrow screens.
 *
 * `MainNav` is `md:flex` and the account dropdown is beside it, so below `md`
 * the only thing a visitor could reach from the header was the search icon.
 * Browse, This weekend, Organisers, My tickets, Saved and Account had no entry
 * point at all on a phone — which is most of the audience for a product whose
 * ticket is a QR code on that phone.
 *
 * A drawer rather than a bottom tab bar. Tabs are the right shape for an app
 * you live inside, and JamiiChat uses them for exactly that reason; this is a
 * catalogue you browse and occasionally buy from, and a permanent bar would
 * spend 64px of every screen on navigation that gets used once a session. The
 * drawer also has room for the categories, which are the actual way people
 * look for something to do.
 *
 * The open panel is a dialog: it covers the page, so it claims the role, traps
 * Tab inside itself, closes on Escape, and returns focus to the trigger. Losing
 * focus behind a full-screen overlay strands a keyboard user completely, with
 * nothing on screen reflecting where they are.
 */
export function MobileNav({ user }: { user: CurrentUser | null }) {
  const [open, setOpen] = useState(false);
  // The portal target only exists in the browser, so the first client render
  // has to match the server's — which rendered no overlay at all.
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const params = useSearchParams();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  // Any navigation closes the drawer. Next keeps the component mounted across
  // a route change, so without this the panel stays open over the page it just
  // navigated to.
  useEffect(() => {
    setOpen(false);
  }, [pathname, params]);

  useEffect(() => {
    if (!open) return;

    // `scrollbar-gutter: stable` on <html> is what keeps this from shifting
    // the page sideways as the scrollbar goes away.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function focusable(): HTMLElement[] {
      if (!panelRef.current) return [];
      return Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])'
        )
      );
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (event.key !== 'Tab') return;

      // Wrap at both ends rather than letting Tab walk out into the page
      // underneath, which is still rendered and still focusable.
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      // Also the empty-list guard: with no focusable children there is nothing
      // to wrap between, and the browser's own order is the best available.
      if (!first || !last) return;
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    // Focus the panel itself rather than the first link: a screen reader then
    // reads the dialog's label before its contents, so the first thing
    // announced is what just opened. It carries `focus-visible:ring-0` because
    // the global ring is for controls someone tabbed to, and painting it down
    // the edge of a panel that took focus on its own just looks like a bug.
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const panel = (
    <div className="fixed inset-0 z-[60] md:hidden">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className="absolute inset-0 h-full w-full cursor-default bg-dark-950/80 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-[min(20rem,88vw)] animate-slide-in-right flex-col border-l border-white/[0.08] bg-dark-900 shadow-card-hover focus-visible:ring-0 focus-visible:ring-offset-0"
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <span className="eyebrow">Menu</span>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }}
            className="rounded-lg p-2 text-dark-300 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Close menu</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          {/* Who you are, before what you can do — on a small screen this is
              the only place the signed-in identity appears at all. */}
          {user ? (
            <div className="mb-5 flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600/20 text-xs font-semibold text-primary-200 ring-1 ring-primary-500/30">
                <span aria-hidden="true">{initials(user.name)}</span>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-white">
                  {user.name}
                </span>
                <span className="block truncate text-xs text-dark-400">
                  {user.email}
                </span>
              </span>
            </div>
          ) : null}

          <DrawerSection label="Discover">
            <DrawerLink href="/events" icon={CalendarDays} current={pathname}>
              Browse events
            </DrawerLink>
            <DrawerLink
              href="/events?when=this-weekend"
              icon={CalendarDays}
              current={pathname}
            >
              This weekend
            </DrawerLink>
            <DrawerLink href="/organizers" icon={Users} current={pathname}>
              Organisers
            </DrawerLink>
          </DrawerSection>

          {/* The categories are how someone decides what to do tonight, and
              they are otherwise only on the home page and the browse filters.
              Generated from the same map both of those read. */}
          <DrawerSection label="Categories">
            <div className="flex flex-wrap gap-2 px-1 pt-1">
              {CATEGORY_ORDER.map((key) => (
                <Link
                  key={key}
                  href={`/events?category=${key}`}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-dark-200 transition-colors hover:border-primary-500/40 hover:bg-primary-500/10 hover:text-white"
                >
                  {CATEGORY_LABELS[key]}
                </Link>
              ))}
            </div>
          </DrawerSection>

          {user ? (
            <DrawerSection label="You">
              <DrawerLink href="/tickets" icon={Ticket} current={pathname}>
                My tickets
              </DrawerLink>
              <DrawerLink href="/saved" icon={Bookmark} current={pathname}>
                Saved events
              </DrawerLink>
              <DrawerLink href="/account" icon={UserIcon} current={pathname}>
                Account
              </DrawerLink>
              {user.role === 'ORGANIZER' || user.role === 'ADMIN' ? (
                <DrawerLink
                  href="/organizer"
                  icon={LayoutDashboard}
                  current={pathname}
                >
                  Organiser dashboard
                </DrawerLink>
              ) : null}
              {user.role === 'ADMIN' ? (
                <DrawerLink href="/admin" icon={Shield} current={pathname}>
                  Admin
                </DrawerLink>
              ) : null}
            </DrawerSection>
          ) : (
            <DrawerSection label="Organise">
              <DrawerLink href="/sell" icon={Store} current={pathname}>
                Sell tickets
              </DrawerLink>
            </DrawerSection>
          )}
        </div>

        <div className="border-t border-white/[0.06] p-3">
          {user ? (
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-dark-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                href="/signup"
                className="flex h-11 items-center justify-center rounded-xl bg-primary-600 px-5 text-sm font-medium text-white shadow-glow transition-colors hover:bg-primary-500"
              >
                Create an account
              </Link>
              <Link
                href="/signin"
                className="flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-5 text-sm font-medium text-white transition-colors hover:bg-white/[0.11]"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="rounded-lg p-2 text-dark-200 transition-colors hover:bg-white/[0.06] hover:text-white md:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Open menu</span>
      </button>

      {/*
        The overlay is rendered into <body>, not where this component sits.

        The header is `backdrop-blur-xl`, and an element with a `backdrop-filter`
        becomes the containing block for every `position: fixed` descendant —
        the same rule that applies to `transform` and `filter`. Left inside the
        header, `fixed inset-0` resolved against a 64px-tall bar rather than the
        viewport: the drawer rendered 64px high, its scrolling middle collapsed
        to nothing, and its footer buttons landed across the hero. A portal is
        the fix that does not ask the header to give up the blur.
      */}
      {open && mounted ? createPortal(panel, document.body) : null}
    </>
  );
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function DrawerSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <p className="eyebrow mb-1.5 px-3">{label}</p>
      {children}
    </div>
  );
}

function DrawerLink({
  href,
  icon: Icon,
  current,
  children,
}: {
  href: string;
  icon: LucideIcon;
  current: string;
  children: ReactNode;
}) {
  // Compared on pathname alone. The drawer lists `/events` and
  // `/events?when=this-weekend` separately, but marking the filtered one would
  // need the live querystring, and a drawer that closes on every navigation is
  // never open on the page it would be marking.
  const isCurrent = current === href;

  return (
    <Link
      href={href}
      aria-current={isCurrent ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
        isCurrent
          ? 'bg-white/[0.06] font-medium text-white'
          : 'text-dark-200 hover:bg-white/[0.06] hover:text-white'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </Link>
  );
}
