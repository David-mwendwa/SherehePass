import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BadgeCheck,
  CalendarDays,
  Clock,
  MapPin,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/Badge';
import { EventCard } from '@/components/events/EventCard';
import { EventRail, EventRailItem } from '@/components/events/EventRail';
import { SaveButton } from '@/components/events/SaveButton';
import { StickyBuyBar } from '@/components/events/StickyBuyBar';
import { TicketPicker } from '@/components/events/TicketPicker';
import { VenueMap } from '@/components/events/VenueMap';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getEventBySlug, getRelatedEvents, remainingFor } from '@/lib/events';
import {
  CATEGORY_LABELS,
  formatEventDateLong,
  formatEventWindow,
  priceRangeLabel,
  relativeToNow,
} from '@/lib/format';
import {
  absoluteUrl,
  breadcrumbJsonLd,
  eventJsonLd,
  jsonLdScript,
} from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: PageProps<'/events/[slug]'>) {
  // Next 16: `params` is a Promise.
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: 'Event not found' };

  return {
    title: event.title,
    description: event.summary,
    alternates: { canonical: `/events/${event.slug}` },
    openGraph: {
      title: event.title,
      description: event.summary,
      images: [{ url: event.coverImage, width: 1400, height: 933 }],
      type: 'website',
      url: absoluteUrl(`/events/${event.slug}`),
    },
  };
}

export default async function EventPage({
  params,
}: PageProps<'/events/[slug]'>) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const [user, related] = await Promise.all([
    getCurrentUser(),
    getRelatedEvents(event, 3),
  ]);

  // Whether this visitor has saved it. Scoped to the signed-in user, and
  // skipped entirely when there is none — a signed-out visitor's query would
  // be `userId: undefined`, which matches everything.
  const saved = user
    ? Boolean(
        await db.savedEvent.findUnique({
          where: { userId_eventId: { userId: user.id, eventId: event.id } },
        })
      )
    : false;

  const past = event.endsAt < new Date();
  const cancelled = event.status === 'CANCELLED';
  // One predicate for "you cannot buy this", so the panel, the save button and
  // the sticky bar cannot end up disagreeing about whether it is on sale.
  const unavailable = past || cancelled;
  const soldOut = remainingFor(event.ticketTypes) <= 0;

  // Built as one value rather than checked inline in the JSX: narrowing a
  // property does not carry into the element below it, so the map would still
  // be handed a venue whose coordinates are typed as possibly null.
  const { latitude, longitude } = event.venue;
  const mappableVenue =
    latitude !== null && longitude !== null
      ? { ...event.venue, latitude, longitude }
      : null;

  return (
    <article>
      {/*
        The graph is emitted for cancelled and past events too. Their pages are
        legitimate destinations — someone searching for an event that was called
        off should reach the page that says so — and `eventJsonLd` is what marks
        them EventCancelled and withdraws the offers, so dropping it here would
        remove the very statement that keeps the markup honest.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            eventJsonLd(event),
            breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'Events', path: '/events' },
              { name: event.title, path: `/events/${event.slug}` },
            ]),
          ]),
        }}
      />

      {/* ----------------------------------------------------------- cover */}
      <div className="relative h-[42vh] min-h-[320px] w-full sm:h-[52vh]">
        <Image
          src={event.coverImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="cover-scrim absolute inset-0" />

        <div className="container relative flex h-full flex-col justify-end pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="onCover">{CATEGORY_LABELS[event.category]}</Badge>
            {cancelled ? <Badge tone="danger">Cancelled</Badge> : null}
            {past && !cancelled ? <Badge tone="onCover">Finished</Badge> : null}
            {event.minAge ? (
              <Badge tone="onCover">{event.minAge}+</Badge>
            ) : null}
          </div>

          <h1 className="mt-4 max-w-4xl font-heading text-display-sm text-white">
            {event.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-dark-200">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-primary-400" />
              {formatEventDateLong(event.startsAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary-400" />
              {event.venue.name}, {event.venue.county}
            </span>
            {!past ? (
              <span className="flex items-center gap-1.5 text-dark-300">
                <Clock className="h-4 w-4" />
                {relativeToNow(event.startsAt)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="container pb-16 pt-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
          {/* ------------------------------------------------------- body */}
          <div className="min-w-0 space-y-10">
            {cancelled ? (
              <div className="flex gap-3 rounded-2xl border border-danger-500/25 bg-danger-500/10 p-5">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger-400" />
                <div>
                  <h2 className="text-base font-semibold text-white">
                    This event has been cancelled
                  </h2>
                  <p className="mt-1 text-sm text-dark-300">
                    Anyone who bought a ticket has been refunded to the M-Pesa
                    number or card they paid with.
                  </p>
                </div>
              </div>
            ) : null}

            <section>
              <p className="text-lg leading-relaxed text-dark-200">
                {event.summary}
              </p>
              {/* Descriptions are stored as plain text with blank-line
                  paragraphs, not HTML: organiser-supplied markup is an XSS
                  vector, and nothing here needs more than paragraphs. */}
              <div className="mt-6 space-y-4 leading-relaxed text-dark-300">
                {event.description
                  .split('\n\n')
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <InfoTile icon={Clock} title="When">
                {formatEventWindow(event.startsAt, event.endsAt)}
              </InfoTile>
              <InfoTile icon={MapPin} title="Where">
                <span className="block text-white">{event.venue.name}</span>
                {event.venue.address}
              </InfoTile>
            </section>

            {mappableVenue ? (
              <section>
                <h2 className="eyebrow mb-3">Getting there</h2>
                <VenueMap venue={mappableVenue} />
              </section>
            ) : null}

            <section>
              <h2 className="eyebrow mb-3">Organised by</h2>
              <Link
                href={`/organizers/${event.organizer.slug}`}
                className="surface surface-hover block p-5"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">
                    {event.organizer.name}
                  </h3>
                  {event.organizer.verified ? (
                    <BadgeCheck
                      className="h-4 w-4 text-primary-400"
                      aria-label="Verified organiser"
                    />
                  ) : null}
                </div>
                {event.organizer.bio ? (
                  <p className="mt-2 text-sm leading-relaxed text-dark-400">
                    {event.organizer.bio}
                  </p>
                ) : null}
              </Link>
            </section>
          </div>

          {/* ---------------------------------------------------- sidebar */}
          <aside className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
            <TicketPicker
              event={{ id: event.id, slug: event.slug, title: event.title }}
              ticketTypes={event.ticketTypes}
              disabled={unavailable}
              disabledReason={
                cancelled ? 'This event was cancelled' : 'This event has finished'
              }
              browseHref={`/events?category=${event.category}`}
              signedIn={Boolean(user)}
            />
            {/* Saving is a reminder to come back to something. There is
                nothing to come back to once it has happened or been called
                off, so the button goes rather than sitting there offering to
                bookmark the past. */}
            {!unavailable ? (
              <div className="mt-3">
                <SaveButton
                  eventId={event.id}
                  initialSaved={saved}
                  signedIn={Boolean(user)}
                />
              </div>
            ) : null}
          </aside>
        </div>

        {related.length > 0 ? (
          <section className="mt-20">
            <div className="eyebrow mb-2">You might also like</div>
            <h2 className="mb-6 font-heading text-section">
              More {CATEGORY_LABELS[event.category].toLowerCase()}, and more
              around {event.venue.county}
            </h2>
            <EventRail columns={3}>
              {related.map((item) => (
                <EventRailItem key={item.id}>
                  <EventCard event={item} />
                </EventRailItem>
              ))}
            </EventRail>
          </section>
        ) : null}
      </div>

      {!unavailable ? (
        <StickyBuyBar
          priceLabel={priceRangeLabel(event.ticketTypes)}
          soldOut={soldOut}
        />
      ) : null}
    </article>
  );
}

function InfoTile({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="surface p-5">
      <div className="mb-2 flex items-center gap-2 text-primary-300">
        <Icon className="h-4 w-4" />
        <span className="eyebrow text-primary-300">{title}</span>
      </div>
      <p className="text-sm leading-relaxed text-dark-300">{children}</p>
    </div>
  );
}
