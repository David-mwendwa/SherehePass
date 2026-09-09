import { ArrowUpRight, CalendarDays, Ticket, TrendingUp, Users } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Stat } from '@/components/ui/Stat';
import { EventTable } from '@/components/organizer/EventTable';
import { requireOrganizer } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatKes } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Organiser dashboard', robots: { index: false, follow: false } };

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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-1.5">Organiser</p>
          <h1 className="font-heading text-title">{organizer.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button
            href={`/organizers/${organizer.slug}`}
            variant="secondary"
            size="sm"
          >
            Public page
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button href="/organizer/events/new" size="sm">
            New event
          </Button>
        </div>
      </header>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          hint={
            ticketsSold
              ? `${Math.round((attendees / ticketsSold) * 100)}% turnout`
              : undefined
          }
        />
        <Stat icon={CalendarDays} label="Upcoming" value={upcoming.length} />
      </div>

      <EventTable title="Upcoming" events={upcoming} />
      {past.length > 0 ? (
        <EventTable title="Past" events={past} muted />
      ) : null}
    </div>
  );
}
