import { Bookmark } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { EventCard } from '@/components/events/EventCard';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Saved events', robots: { index: false, follow: false } };

export default async function SavedPage() {
  const user = await requireUser('/saved');

  const saves = await db.savedEvent.findMany({
    where: { userId: user.id },
    include: {
      event: {
        select: {
          id: true,
          slug: true,
          title: true,
          summary: true,
          coverImage: true,
          category: true,
          startsAt: true,
          endsAt: true,
          featured: true,
          status: true,
          venue: { select: { name: true, county: true } },
          organizer: { select: { name: true, slug: true, verified: true } },
          ticketTypes: { select: { priceCents: true, quantity: true, sold: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // A saved event that has since finished is kept in the list but shown apart:
  // silently dropping it looks like the save was lost.
  const now = new Date();
  const live = saves.filter((s) => s.event.endsAt >= now);
  const over = saves.filter((s) => s.event.endsAt < now);

  return (
    <div className="container py-10 sm:py-14">
      <h1 className="font-heading text-title">Saved</h1>
      <p className="mt-2 text-dark-400">
        Things you bookmarked. Nothing is held for you — saving is not buying.
      </p>

      {saves.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={Bookmark}
          title="Nothing saved yet"
          description="Hit “Save for later” on anything you are undecided about. It stays here until you decide."
          action={<Button href="/events">Browse events</Button>}
        />
      ) : (
        <>
          {live.length > 0 ? (
            /* The past section below already has its own h2; without one here
               the cards' h3 titles hang straight off the h1. */
            <section className="mt-10">
              <h2 className="sr-only">Still to come</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {live.map((save) => (
                  <EventCard key={save.event.id} event={save.event} />
                ))}
              </div>
            </section>
          ) : null}

          {over.length > 0 ? (
            <section className="mt-14">
              <h2 className="eyebrow mb-4">Already happened</h2>
              <div className="grid gap-5 opacity-50 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {over.map((save) => (
                  <EventCard key={save.event.id} event={save.event} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
