import Link from 'next/link';
import { SearchX } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { EventCard } from '@/components/events/EventCard';
import { FilterBar } from '@/components/events/FilterBar';
import { SearchBar } from '@/components/events/SearchBar';
import { CATEGORY_LABELS } from '@/lib/format';
import { getCategoryCounts, getCounties, searchEvents } from '@/lib/events';

export const dynamic = 'force-dynamic';

/**
 * The title reflects the filters, so a shared link says what it is showing
 * before the page has painted — "Music events in Nairobi", not "Events".
 */
export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const parts = [];
  if (params.category) parts.push(CATEGORY_LABELS[params.category] ?? null);
  parts.push('events');
  if (params.county) parts.push(`in ${params.county}`);
  if (params.q) parts.push(`matching “${params.q}”`);

  return { title: parts.filter(Boolean).join(' ') };
}

export default async function EventsPage({ searchParams }) {
  // `searchParams` is a Promise in Next 16 — synchronous access was removed.
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [result, categoryCounts, counties] = await Promise.all([
    searchEvents({
      q: params.q,
      category: params.category,
      county: params.county,
      when: params.when,
      free: params.free === '1',
      page,
    }),
    getCategoryCounts(),
    getCounties(),
  ]);

  const { events, total, pages } = result;

  return (
    <div className="container py-10 sm:py-14">
      <header className="max-w-2xl">
        <h1 className="font-heading text-3xl font-bold sm:text-4xl">
          {params.q ? (
            <>
              Results for <span className="text-primary-400">“{params.q}”</span>
            </>
          ) : (
            'What’s on'
          )}
        </h1>
        <p className="mt-2 text-dark-400">
          {total === 0
            ? 'Nothing matches those filters.'
            : `${total} event${total === 1 ? '' : 's'} on sale.`}
        </p>
      </header>

      <div className="mt-8 max-w-2xl">
        <SearchBar />
      </div>

      <div className="mt-6">
        <FilterBar categoryCounts={categoryCounts} counties={counties} />
      </div>

      {events.length === 0 ? (
        <EmptyResults />
      ) : (
        <>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {events.map((event, index) => (
              <EventCard key={event.id} event={event} priority={index < 4} />
            ))}
          </div>
          {pages > 1 ? (
            <Pagination page={page} pages={pages} params={params} />
          ) : null}
        </>
      )}
    </div>
  );
}

function EmptyResults() {
  return (
    <div className="surface mt-10 flex flex-col items-center px-6 py-20 text-center">
      <SearchX className="h-10 w-10 text-dark-500" aria-hidden="true" />
      <h2 className="mt-5 text-xl font-semibold">No events match</h2>
      <p className="mt-2 max-w-sm text-sm text-dark-400">
        Try widening the date range, or clearing the county filter — most events
        are in Nairobi but not all of them.
      </p>
      <Button href="/events" variant="secondary" className="mt-6">
        Clear all filters
      </Button>
    </div>
  );
}

/**
 * Pagination preserves every other filter, because a visitor on page two of a
 * filtered search expects page three of the same search, not page three of
 * everything.
 */
function Pagination({ page, pages, params }) {
  const linkTo = (target) => {
    const next = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value != null)
    );
    next.set('page', String(target));
    return `/events?${next.toString()}`;
  };

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 flex items-center justify-center gap-2"
    >
      {page > 1 ? (
        <Button href={linkTo(page - 1)} variant="secondary" size="sm">
          Previous
        </Button>
      ) : null}

      <span className="px-4 font-mono text-sm text-dark-400">
        {page} / {pages}
      </span>

      {page < pages ? (
        <Button href={linkTo(page + 1)} variant="secondary" size="sm">
          Next
        </Button>
      ) : null}
    </nav>
  );
}
