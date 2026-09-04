import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { EventForm } from '@/components/organizer/EventForm';
import { TierManager } from '@/components/organizer/TierManager';
import { requireOrganizer } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatKes } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Manage event' };

export default async function ManageEventPage({
  params,
}: PageProps<'/organizer/events/[id]'>) {
  const { id } = await params;
  const { organizer } = await requireOrganizer();

  // Scoped by organizer as well as id — the id alone is guessable.
  const event = await db.event.findFirst({
    where: { id, organizerId: organizer.id },
    include: { ticketTypes: { orderBy: { position: 'asc' } } },
  });
  if (!event) notFound();

  const [venues, revenue] = await Promise.all([
    db.venue.findMany({ orderBy: [{ county: 'asc' }, { name: 'asc' }] }),
    db.order.aggregate({
      where: { eventId: event.id, status: 'PAID' },
      _sum: { totalCents: true },
    }),
  ]);

  return (
    <div className="container max-w-3xl py-10 sm:py-14">
      <Link
        href="/organizer"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-dark-400 transition-colors hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        Dashboard
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">{event.title}</h1>
          <p className="mt-1 font-mono text-sm text-secondary-300">
            {formatKes(revenue._sum.totalCents ?? 0)} taken
          </p>
        </div>
        <div className="flex gap-2">
          <Button href={`/events/${event.slug}`} variant="secondary" size="sm">
            View <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button href={`/organizer/events/${event.id}/door`} size="sm">
            Door
          </Button>
        </div>
      </div>

      <TierManager eventId={event.id} tiers={event.ticketTypes} />

      <div className="mt-10">
        <EventForm event={event} venues={venues} />
      </div>
    </div>
  );
}
