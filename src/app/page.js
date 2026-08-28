import Link from 'next/link';
import { ArrowRight, Flame, QrCode, Smartphone, Ticket } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { EventCard } from '@/components/events/EventCard';
import { SearchBar } from '@/components/events/SearchBar';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/format';
import {
  getCategoryCounts,
  getFeaturedEvents,
  getSellingFastEvents,
  getUpcomingEvents,
} from '@/lib/events';

/**
 * The home page is a Server Component that queries Postgres directly. There is
 * no API route in front of it and no fetch from the browser: the HTML that
 * arrives already contains the events. That is the whole argument for building
 * this on Next.js rather than as another SPA talking to an Express server.
 */

// Sales move constantly, so the page is rendered per request rather than
// cached — a "12 left" badge that is an hour stale is worse than none.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Partly sequential, on purpose: each section excludes what the one above it
  // already showed, so an event that is featured AND selling fast AND soonest
  // appears once rather than three times down the page.
  const [featured, categoryCounts] = await Promise.all([
    getFeaturedEvents(3),
    getCategoryCounts(),
  ]);
  const featuredIds = featured.map((event) => event.id);

  const sellingFast = await getSellingFastEvents(4, featuredIds);
  const upcoming = await getUpcomingEvents(8, [
    ...featuredIds,
    ...sellingFast.map((event) => event.id),
  ]);

  const totalUpcoming = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden">
        <div className="bloom" />
        <div className="container relative py-20 sm:py-28">
          <div className="max-w-3xl">
            <p className="eyebrow mb-5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
              </span>
              {/* Counted from the database, never written down — the number
                  changes every time an organiser publishes. */}
              {totalUpcoming} events on sale across Kenya
            </p>

            <h1 className="font-heading text-[2.75rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Find the night.
              <br />
              <span className="text-primary-400">Keep the ticket.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-dark-300">
              Concerts, festivals, meetups and match days from Nairobi to Lamu.
              Pay with M-Pesa, and walk in with a QR code on your phone.
            </p>

            <div className="mt-9 max-w-xl">
              <SearchBar />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {CATEGORY_ORDER.filter((key) => categoryCounts[key]).map((key) => (
                <Link
                  key={key}
                  href={`/events?category=${key}`}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-sm text-dark-300 transition-colors hover:border-primary-500/40 hover:bg-primary-500/10 hover:text-white"
                >
                  {CATEGORY_LABELS[key]}
                  <span className="ml-1.5 font-mono text-xs text-dark-500">
                    {categoryCounts[key]}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- featured */}
      {featured.length > 0 ? (
        <section className="container pb-4">
          <SectionHeading
            eyebrow="Featured"
            title="The ones worth planning around"
            href="/events"
            linkLabel="All events"
          />
          <div className="mt-8 space-y-5">
            {featured.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                variant="feature"
                priority={index === 0}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------- selling fast */}
      {sellingFast.length > 0 ? (
        <section className="container pt-16">
          <SectionHeading
            eyebrow={
              <span className="flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-primary-400" />
                Selling fast
              </span>
            }
            title="More than 70% gone"
            description="Worked out from the live sold counts, not a hand-picked list."
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {sellingFast.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------- upcoming */}
      <section className="container pt-16">
        <SectionHeading
          eyebrow="Next up"
          title="Coming soon"
          href="/events"
          linkLabel="Browse all"
        />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {upcoming.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ how it works */}
      <section className="container pt-24">
        <div className="surface relative overflow-hidden p-8 sm:p-12">
          <div className="bloom opacity-60" />
          <div className="relative">
            <h2 className="max-w-lg font-heading text-3xl font-bold sm:text-4xl">
              Three steps, no printer.
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              <Step
                icon={Ticket}
                n="01"
                title="Pick your tier"
                body="Early bird, regular, VIP. Prices are in KES and what you see is what you pay — no fee revealed at the last step."
              />
              <Step
                icon={Smartphone}
                n="02"
                title="Pay with M-Pesa"
                body="An STK push lands on your phone. Enter your PIN and the order confirms itself; no copying reference numbers."
              />
              <Step
                icon={QrCode}
                n="03"
                title="Show the code"
                body="Your ticket lives in your account with a QR code. It gets scanned once at the gate and cannot be used twice."
              />
            </div>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button href="/events" size="lg">
                Browse events
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button href="/sell" variant="secondary" size="lg">
                Sell tickets
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHeading({ eyebrow, title, description, href, linkLabel }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="eyebrow mb-2">{eyebrow}</div>
        <h2 className="font-heading text-2xl font-bold sm:text-3xl">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-lg text-sm text-dark-400">{description}</p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="group flex items-center gap-1.5 text-sm font-medium text-dark-300 transition-colors hover:text-white"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}

function Step({ icon: Icon, n, title, body }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/15 text-primary-300 ring-1 ring-primary-500/25">
          <Icon className="h-5 w-5" />
        </span>
        <span className="font-mono text-xs text-dark-500">{n}</span>
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-dark-400">{body}</p>
    </div>
  );
}
