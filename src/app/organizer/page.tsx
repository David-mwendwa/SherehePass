import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarDays,
  Ticket,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge, EVENT_TONE } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { requireOrganizer } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatEventDate, formatKes } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Organiser dashboard' };

/**
 * Named so `DashboardEvent` below can be derived from it. Typing the table's
 * rows by hand would let the query and the component drift — the whole reason
 * for the migration.
 */
async function loadDashboard(organizerId: string) {
  const [events, revenue, ticketsSold, attendees] = await Promise.all([
    db.event.findMany({
      where: { organizerId },
      orderBy: { startsAt: 'desc' },
      include: {
        venue: { select: { name: true, county: true } },
        ticketTypes: { select: { quantity: true, sold: true, priceCents: true } },
        _count: { select: { tickets: true } },
      },
    }),
    // Revenue counts PAID orders only. Counting pending ones would report money
    // that has not arrived and may never arrive.
    db.order.aggregate({
      where: { event: { organizerId }, status: 'PAID' },
      _sum: { totalCents: true },
    }),
    db.ticket.count({ where: { event: { organizerId } } }),
    db.ticket.count({
      where: { event: { organizerId }, status: 'CHECKED_IN' },
    }),
  ]);

  return { events, revenue, ticketsSold, attendees };
}

export default async function OrganizerDashboard() {
  const { organizer } = await requireOrganizer();
  const { events, revenue, ticketsSold, attendees } = await loadDashboard(
    organizer.id
  );

  // One query, sorted descending, then split — but the two halves want
  // opposite orders. Upcoming reads soonest-first (the next door you have to
  // staff is the one that matters); past reads most-recent-first.
  const now = new Date();
  const upcoming = events
    .filter((event) => event.endsAt >= now)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = events.filter((event) => event.endsAt < now);

  return (
    <div className="container py-10 sm:py-14">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Organiser</p>
          <h1 className="font-heading text-3xl font-bold sm:text-4xl">
            {organizer.name}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button href={`/organizers/${organizer.slug}`} variant="secondary" size="sm">
            Public page
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
          <Button href="/organizer/events/new" size="sm">
            New event
          </Button>
        </div>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={TrendingUp}
          label="Revenue"
          value={formatKes(revenue._sum.totalCents ?? 0)}
          hint="Paid orders only"
        />
        <Stat icon={Ticket} label="Tickets issued" value={ticketsSold} />
        <Stat
          icon={Users}
          label="Checked in"
          value={attendees}
          hint={ticketsSold ? `${Math.round((attendees / ticketsSold) * 100)}% turnout` : undefined}
        />
        <Stat icon={CalendarDays} label="Upcoming" value={upcoming.length} />
      </div>

      <EventTable title="Upcoming" events={upcoming} empty="Nothing scheduled." />
      {past.length > 0 ? (
        <EventTable title="Past" events={past} muted />
      ) : null}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string | undefined;
}) {
  return (
    <div className="surface p-5">
      <div className="flex items-center gap-2 text-dark-400">
        <Icon className="h-4 w-4" />
        <span className="eyebrow">{label}</span>
      </div>
      <p className="mt-3 font-heading text-2xl font-bold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-dark-500">{hint}</p> : null}
    </div>
  );
}

type DashboardEvent = Awaited<ReturnType<typeof loadDashboard>>['events'][number];

function EventTable({
  title,
  events,
  empty,
  muted,
}: {
  title: string;
  events: DashboardEvent[];
  empty?: string;
  muted?: boolean;
}) {
  return (
    <section className="mt-12">
      <h2 className="eyebrow mb-4">{title}</h2>
      {events.length === 0 ? (
        <p className="surface px-6 py-10 text-center text-sm text-dark-400">
          {empty}
        </p>
      ) : (
        <div className={`space-y-2 ${muted ? 'opacity-60' : ''}`}>
          {events.map((event) => {
            const capacity = event.ticketTypes.reduce((s, t) => s + t.quantity, 0);
            const sold = event.ticketTypes.reduce((s, t) => s + t.sold, 0);
            const pct = capacity ? Math.round((sold / capacity) * 100) : 0;

            return (
              <div key={event.id} className="surface p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/events/${event.slug}`}
                        className="font-medium text-white transition-colors hover:text-primary-300"
                      >
                        {event.title}
                      </Link>
                      <Badge tone={EVENT_TONE[event.status]}>
                        {event.status.toLowerCase()}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-dark-500">
                      {formatEventDate(event.startsAt)} · {event.venue.name}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      href={`/organizer/events/${event.id}`}
                      variant="ghost"
                      size="sm"
                    >
                      Manage
                    </Button>
                    <Button
                      href={`/organizer/events/${event.id}/door`}
                      variant="secondary"
                      size="sm"
                    >
                      Door
                    </Button>
                  </div>
                </div>

                {/* Sell-through as a bar. A percentage on its own is a number;
                    the bar is what makes "nearly gone" visible at a glance. */}
                <div className="mt-4 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <span className="shrink-0 font-mono text-xs text-dark-400">
                    {sold}/{capacity}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
