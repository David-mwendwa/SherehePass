import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

import { EventForm } from '@/components/organizer/EventForm';
import { requireOrganizer } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'New event', robots: { index: false, follow: false } };

export default async function NewEventPage() {
  await requireOrganizer();
  const venues = await db.venue.findMany({ orderBy: [{ county: 'asc' }, { name: 'asc' }] });

  return (
    <div className="container max-w-3xl py-10 sm:py-14">
      <Link
        href="/organizer"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-dark-400 transition-colors hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        Dashboard
      </Link>
      <h1 className="mb-8 font-heading text-title">New event</h1>
      <EventForm venues={venues} />
    </div>
  );
}
