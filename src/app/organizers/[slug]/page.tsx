import { notFound } from 'next/navigation';
import { BadgeCheck } from 'lucide-react';

import { EventCard } from '@/components/events/EventCard';
import { getOrganizerBySlug } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: PageProps<'/organizers/[slug]'>) {
  const { slug } = await params;
  const organizer = await getOrganizerBySlug(slug);
  if (!organizer) return { title: 'Organiser not found' };
  return { title: organizer.name, description: organizer.bio ?? undefined };
}

export default async function OrganizerPage({
  params,
}: PageProps<'/organizers/[slug]'>) {
  const { slug } = await params;
  const organizer = await getOrganizerBySlug(slug);
  if (!organizer) notFound();

  return (
    <div className="container max-w-5xl py-10 sm:py-14">
      <header className="max-w-2xl">
        <div className="flex items-center gap-2.5">
          <h1 className="font-heading text-title">
            {organizer.name}
          </h1>
          {organizer.verified ? (
            <BadgeCheck
              className="h-6 w-6 text-primary-400"
              aria-label="Verified organiser"
            />
          ) : null}
        </div>
        {organizer.bio ? (
          <p className="mt-4 leading-relaxed text-dark-300">{organizer.bio}</p>
        ) : null}
        {organizer.website ? (
          <a
            href={organizer.website}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mt-3 inline-block text-sm text-primary-300 transition-colors hover:text-primary-200"
          >
            {organizer.website.replace(/^https?:\/\//, '')}
          </a>
        ) : null}
      </header>

      <section className="mt-12">
        <h2 className="eyebrow mb-5">
          {organizer.events.length} upcoming event
          {organizer.events.length === 1 ? '' : 's'}
        </h2>
        {organizer.events.length === 0 ? (
          <p className="surface px-6 py-12 text-center text-sm text-dark-400">
            Nothing on sale from {organizer.name} right now.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {organizer.events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
