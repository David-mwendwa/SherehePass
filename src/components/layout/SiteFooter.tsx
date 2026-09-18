import Link from 'next/link';
import type { ReactNode } from 'react';

import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/format';
import { Logo } from '@/components/layout/Logo';

/**
 * The category column is generated from the same map the browse filters read,
 * so adding a category to the enum adds it here too rather than leaving the
 * footer quietly one item behind.
 */
export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/[0.06] bg-dark-950">
      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-dark-400">
              Tickets for the things worth leaving the house for, across Nairobi,
              the coast, the Rift and everywhere in between.
            </p>
          </div>

          <FooterColumn title="Browse">
            {CATEGORY_ORDER.slice(0, 5).map((key) => (
              <FooterLink key={key} href={`/events?category=${key}`}>
                {CATEGORY_LABELS[key]}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Attend">
            <FooterLink href="/events">All events</FooterLink>
            <FooterLink href="/tickets">My tickets</FooterLink>
            <FooterLink href="/saved">Saved</FooterLink>
            <FooterLink href="/help">How it works</FooterLink>
          </FooterColumn>

          <FooterColumn title="Organise">
            <FooterLink href="/organizers">Organisers</FooterLink>
            <FooterLink href="/organizer">Dashboard</FooterLink>
            <FooterLink href="/sell">Sell tickets</FooterLink>
            <FooterLink href="/engineering">How it works inside</FooterLink>
          </FooterColumn>
        </div>

        {/* "Developed by David ↗" is the same treatment as BazaarKE, furniworld,
            TaliiKE, SakaKeja and the rest: the portfolio link, not the GitHub
            profile, and the external-link glyph after the name. */}
        <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.06] pt-6 text-xs text-dark-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} SherehePass. Built in Nairobi.</p>

          <p className="flex items-center gap-1">
            Developed by
            <a
              href="https://techdave.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-dark-300 transition-colors hover:text-white"
            >
              David
              <svg
                viewBox="0 0 24 24"
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M7 17L17 7M17 7H7M17 7V17" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h2 className="eyebrow mb-4">{title}</h2>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-dark-400 transition-colors hover:text-white"
      >
        {children}
      </Link>
    </li>
  );
}
