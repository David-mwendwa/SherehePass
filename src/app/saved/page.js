import { Bookmark } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { EventCard } from '@/components/events/EventCard';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Saved events' };

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
      <h1 className="font-heading text-3xl font-bold sm:text-4xl">Saved</h1>
      <p className="mt-2 text-dark-400">
        Things you bookmarked. Nothing is held for you — saving is not buying.
      </p>

      {saves.length === 0 ? (
        <div className="surface mt-10 flex flex-col items-center px-6 py-20 text-center">
          <Bookmark className="h-10 w-10 text-dark-500" aria-hidden="true" />
          <h2 className="mt-5 text-xl font-semibold">Nothing saved yet</h2>
          <p className="mt-2 max-w-sm text-sm text-dark-400">
            Hit “Save for later” on anything you are undecided about.
          </p>
          <Button href="/events" className="mt-6">
            Browse events
          </Button>
        </div>
      ) : (
        <>
          {live.length > 0 ? (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {live.map((save) => (
                <EventCard key={save.event.id} event={save.event} />
              ))}
            </div>
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
