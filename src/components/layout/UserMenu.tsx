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
 * The account dropdown — one of only two client components in the header.
 *
 * Closes on outside click and on Escape, and returns focus to the trigger when
 * it does, so a keyboard user is not dropped at the top of the document after
 * dismissing a menu.
 */
export function UserMenu({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
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
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600/20 text-xs font-semibold text-primary-200 ring-1 ring-primary-500/30 transition-colors hover:bg-primary-600/30"
      >
        {initials}
        <span className="sr-only">Account menu for {user.name}</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="surface absolute right-0 mt-2 w-60 animate-slide-up overflow-hidden p-1.5 shadow-card-hover"
        >
          <div className="border-b border-white/[0.06] px-3 py-2.5">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-xs text-dark-400">{user.email}</p>
          </div>

          <div className="py-1">
            <MenuLink href="/tickets" icon={Ticket} onSelect={() => setOpen(false)}>
              My tickets
            </MenuLink>
            <MenuLink href="/saved" icon={Bookmark} onSelect={() => setOpen(false)}>
              Saved events
            </MenuLink>
            <MenuLink
              href="/account"
              icon={UserIcon}
              onSelect={() => setOpen(false)}
            >
              Account
            </MenuLink>
            {user.role === 'ORGANIZER' || user.role === 'ADMIN' ? (
              <MenuLink
                href="/organizer"
                icon={LayoutDashboard}
                onSelect={() => setOpen(false)}
              >
                Organiser dashboard
              </MenuLink>
            ) : null}
            {user.role === 'ADMIN' ? (
              <MenuLink href="/admin" icon={Shield} onSelect={() => setOpen(false)}>
                Admin
              </MenuLink>
            ) : null}
          </div>

          <form action={signOutAction} className="border-t border-white/[0.06] pt-1">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-dark-300 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <LogOut className="h-4 w-4" />
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
      role="menuitem"
      onClick={onSelect}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-dark-300 transition-colors hover:bg-white/[0.06] hover:text-white"
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}
