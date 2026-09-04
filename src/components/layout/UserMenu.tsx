'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import type { CurrentUser } from '@/lib/auth';
import {
  Bookmark,
  LayoutDashboard,
  LogOut,
  Shield,
  Ticket,
  User as UserIcon,
} from 'lucide-react';

import { signOutAction } from '@/app/(auth)/actions';

/**
 * The account dropdown.
 *
 * Deliberately a **disclosure**, not `role="menu"`. This used to claim the menu
 * role, and that role is a promise: a screen reader announcing "menu" tells the
 * user to expect arrow-key navigation, Home/End, and type-ahead, and stops
 * announcing the items as the links they are. None of that was implemented, so
 * the markup was describing a widget that did not exist — worse than plain
 * links, because it set an expectation the component then broke.
 *
 * `menu` is for application commands. These are links to pages, so they are a
 * navigation list behind a button that says whether it is open. The arrow keys
 * are wired up anyway as a convenience, but nothing depends on them: Tab moves
 * through the items in order, and every one is a real link.
 *
 * The rest is the ordinary contract for anything that opens over the page —
 * close on outside pointer, close on Escape and return focus to the trigger,
 * move focus to the first item when opened from the keyboard, and close on Tab
 * out of the last item so focus does not silently continue behind an open
 * panel.
 */
export function UserMenu({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /** Set when the panel is opened by keyboard, so focus follows it in. */
  const focusFirstRef = useRef(false);

  /** Every focusable item in the panel, in DOM order. */
  function items(): HTMLElement[] {
    if (!panelRef.current) return [];
    return Array.from(
      panelRef.current.querySelectorAll<HTMLElement>('a[href], button')
    );
  }

  function close({ restoreFocus = false } = {}) {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }

  // Runs after the panel is in the DOM, which a rAF scheduled from the click
  // handler does not reliably do — the panel does not exist yet at that point.
  useEffect(() => {
    if (!open || !focusFirstRef.current) return;
    focusFirstRef.current = false;
    items()[0]?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close({ restoreFocus: true });
        return;
      }

      const focusable = items();
      if (focusable.length === 0) return;
      const index = focusable.indexOf(document.activeElement as HTMLElement);

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        // From the trigger (index -1), down goes to the first item and up to
        // the last — the usual shortcut to "sign out" without walking the
        // whole list. From inside, it wraps.
        const next =
          index === -1
            ? step === 1
              ? 0
              : focusable.length - 1
            : (index + step + focusable.length) % focusable.length;
        focusable[next]?.focus();
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        focusable[0]?.focus();
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        focusable[focusable.length - 1]?.focus();
        return;
      }

      // Tabbing past either end closes the panel and lets focus carry on
      // normally, rather than leaving an open dropdown behind the cursor.
      if (event.key === 'Tab') {
        const atEdge = event.shiftKey
          ? index <= 0
          : index === focusable.length - 1;
        if (atEdge) setOpen(false);
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          // Opening with the arrow keys puts focus on the first item, which is
          // what a keyboard user expects from anything that drops down.
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            focusFirstRef.current = true;
            setOpen(true);
          }
        }}
        aria-expanded={open}
        aria-controls="account-menu"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600/20 text-xs font-semibold text-primary-200 ring-1 ring-primary-500/30 transition-colors hover:bg-primary-600/30"
      >
        <span aria-hidden="true">{initials}</span>
        <span className="sr-only">Account menu for {user.name}</span>
      </button>

      {open ? (
        <div
          ref={panelRef}
          id="account-menu"
          className="surface absolute right-0 mt-2 w-60 animate-slide-up overflow-hidden p-1.5 shadow-card-hover"
        >
          <div className="border-b border-white/[0.06] px-3 py-2.5">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-xs text-dark-400">{user.email}</p>
          </div>

          <nav aria-label="Account" className="py-1">
            <MenuLink href="/tickets" icon={Ticket} onSelect={close}>
              My tickets
            </MenuLink>
            <MenuLink href="/saved" icon={Bookmark} onSelect={close}>
              Saved events
            </MenuLink>
            <MenuLink href="/account" icon={UserIcon} onSelect={close}>
              Account
            </MenuLink>
            {user.role === 'ORGANIZER' || user.role === 'ADMIN' ? (
              <MenuLink
                href="/organizer"
                icon={LayoutDashboard}
                onSelect={close}
              >
                Organiser dashboard
              </MenuLink>
            ) : null}
            {user.role === 'ADMIN' ? (
              <MenuLink href="/admin" icon={Shield} onSelect={close}>
                Admin
              </MenuLink>
            ) : null}
          </nav>

          <form action={signOutAction} className="border-t border-white/[0.06] pt-1">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-dark-300 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
  onSelect,
}: {
  href: string;
  icon: LucideIcon;
  children: ReactNode;
  onSelect: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={() => onSelect()}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-dark-300 transition-colors hover:bg-white/[0.06] hover:text-white"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
    </Link>
  );
}
