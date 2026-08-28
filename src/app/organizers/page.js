import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';

import { listOrganizers } from '@/lib/events';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Organisers',
  description:
    'The promoters, communities and clubs putting on events across Kenya.',
};

export default async function OrganizersPage() {
  const organizers = await listOrganizers();

  return (
    <div className="container max-w-5xl py-10 sm:py-14">
      <h1 className="font-heading text-3xl font-bold sm:text-4xl">Organisers</h1>
      <p className="mt-2 max-w-lg text-dark-400">
        The promoters, communities and clubs putting these on. A verified badge
        means we have confirmed who they are.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {organizers.map((organizer) => (
          <Link
            key={organizer.id}
            href={`/organizers/${organizer.slug}`}
            className="surface surface-hover p-6"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">
                {organizer.name}
              </h2>
              {organizer.verified ? (
                <BadgeCheck
                  className="h-4 w-4 text-primary-400"
                  aria-label="Verified"
                />
              ) : null}
            </div>
            {organizer.bio ? (
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-dark-400">
                {organizer.bio}
              </p>
            ) : null}
            <p className="mt-4 font-mono text-xs text-dark-500">
              {/* Counted from the events relation, so it cannot drift. */}
              {organizer._count.events} upcoming
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
