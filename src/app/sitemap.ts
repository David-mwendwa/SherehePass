import type { MetadataRoute } from 'next';

import { db } from '@/lib/db';
import { absoluteUrl } from '@/lib/seo';

/**
 * The sitemap, built from the database rather than a list kept by hand.
 *
 * Only what a stranger can usefully open is listed. The account area, the
 * organizer console, checkout and a single order's page are all either behind a
 * session or specific to one buyer, so advertising them would fill the index
 * with URLs that answer a sign-in redirect.
 *
 * Drafts are excluded by the status filter; cancelled events are kept, because
 * someone searching for an event that was called off should still find the page
 * that says so rather than a 404.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, organizers] = await Promise.all([
    db.event.findMany({
      where: { status: { in: ['PUBLISHED', 'CANCELLED'] } },
      select: { slug: true, updatedAt: true, startsAt: true },
      orderBy: { startsAt: 'desc' },
    }),
    db.organizer.findMany({
      select: { slug: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const now = Date.now();
  // An event that has already happened is still a legitimate page, but it will
  // never change again and should not compete for crawl budget with the ones
  // people can still buy into.
  const over = (event: { startsAt: Date }) => event.startsAt.getTime() < now;

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/events'), changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/organizers'), changeFrequency: 'weekly', priority: 0.6 },
    { url: absoluteUrl('/sell'), changeFrequency: 'monthly', priority: 0.5 },
    { url: absoluteUrl('/help'), changeFrequency: 'monthly', priority: 0.4 },
    { url: absoluteUrl('/engineering'), changeFrequency: 'monthly', priority: 0.4 },
  ];

  // Annotated rather than inferred: `map` widens the changeFrequency ternary to
  // `string`, which is not one of the values a sitemap accepts.
  const eventPages: MetadataRoute.Sitemap = events.map((event) => ({
    url: absoluteUrl(`/events/${event.slug}`),
    lastModified: event.updatedAt,
    changeFrequency: over(event) ? 'yearly' : 'daily',
    priority: over(event) ? 0.3 : 0.8,
  }));

  const organizerPages: MetadataRoute.Sitemap = organizers.map((organizer) => ({
    url: absoluteUrl(`/organizers/${organizer.slug}`),
    changeFrequency: 'weekly',
    priority: 0.5,
  }));

  return [...staticPages, ...eventPages, ...organizerPages];
}
