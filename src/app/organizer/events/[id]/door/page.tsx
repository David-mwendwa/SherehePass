import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

import { DoorScanner } from '@/components/organizer/DoorScanner';
import { requireOrganizer } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatEventDateLong } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Door' };

export default async function DoorPage({
  params,
}: PageProps<'/organizer/events/[id]/door'>) {
  const { id } = await params;
  const { organizer } = await requireOrganizer();

  const event = await db.event.findFirst({
    // Both conditions, always: the id alone would open any event's door screen
    // to any organiser who could guess it.
    where: { id, organizerId: organizer.id },
    include: {
      venue: { select: { name: true } },
      _count: {
        select: {
          tickets: true,
        },
      },
    },
  });

  if (!event) notFound();

  const admitted = await db.ticket.count({
    where: { eventId: event.id, status: 'CHECKED_IN' },
  });

  return (
    <div className="container max-w-2xl py-10">
      <Link
        href="/organizer"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-dark-400 transition-colors hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        Dashboard
      </Link>

      <p className="eyebrow mb-2">Door</p>
      <h1 className="font-heading text-2xl font-bold sm:text-3xl">
        {event.title}
      </h1>
      <p className="mt-1 text-sm text-dark-400">
        {formatEventDateLong(event.startsAt)} · {event.venue.name}
      </p>

      <DoorScanner
        eventId={event.id}
        initialAdmitted={admitted}
        totalIssued={event._count.tickets}
      />
    </div>
  );
}
