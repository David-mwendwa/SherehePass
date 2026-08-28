import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BadgeCheck,
  CalendarDays,
  Clock,
  MapPin,
  ShieldAlert,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { EventCard } from '@/components/events/EventCard';
import { SaveButton } from '@/components/events/SaveButton';
import { TicketPicker } from '@/components/events/TicketPicker';
import { VenueMap } from '@/components/events/VenueMap';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getEventBySlug, getRelatedEvents } from '@/lib/events';
import {
  CATEGORY_LABELS,
  formatEventDateLong,
  formatEventWindow,
  relativeToNow,
} from '@/lib/format';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  // Next 16: `params` is a Promise.
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: 'Event not found' };

  return {
    title: event.title,
    description: event.summary,
    openGraph: {
      title: event.title,
      description: event.summary,
      images: [{ url: event.coverImage, width: 1400, height: 933 }],
      type: 'website',
    },
  };
}

export default async function EventPage({ params }) {
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

  return (
    <article>
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

          <h1 className="mt-4 max-w-4xl font-heading text-3xl font-extrabold leading-[1.08] text-white sm:text-5xl lg:text-6xl">
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

            {event.venue.latitude != null && event.venue.longitude != null ? (
              <section>
                <h2 className="eyebrow mb-3">Getting there</h2>
                <VenueMap venue={event.venue} />
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
                      className="h-4.5 w-4.5 text-primary-400"
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
              disabled={past || cancelled}
              disabledReason={
                cancelled ? 'This event was cancelled.' : 'This event has finished.'
              }
              signedIn={Boolean(user)}
            />
            <div className="mt-3">
              <SaveButton
                eventId={event.id}
                initialSaved={saved}
                signedIn={Boolean(user)}
              />
            </div>
          </aside>
        </div>

        {related.length > 0 ? (
          <section className="mt-20">
            <div className="eyebrow mb-2">You might also like</div>
            <h2 className="mb-6 font-heading text-2xl font-bold">
              More {CATEGORY_LABELS[event.category].toLowerCase()}, and more
              around {event.venue.county}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <EventCard key={item.id} event={item} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </article>
  );
}

function InfoTile({ icon: Icon, title, children }) {
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
