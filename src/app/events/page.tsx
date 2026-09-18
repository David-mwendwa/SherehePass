import Link from 'next/link';
import { SearchX } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { EventCard } from '@/components/events/EventCard';
import { FilterBar } from '@/components/events/FilterBar';
import { SearchBar } from '@/components/events/SearchBar';
import type { EventCategory } from '@prisma/client';

import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/format';
import {
  getCategoryCounts,
  getCounties,
  isWhenFilter,
  searchEvents,
} from '@/lib/events';

export const dynamic = 'force-dynamic';

/**
 * A querystring is user input, so `?category=DROP` must not reach the query as
 * if it were an enum member. These narrow it to the values Prisma accepts and
 * drop anything else, which is also what makes a hand-edited URL harmless.
 */
function readCategory(value: unknown): EventCategory | undefined {
  return typeof value === 'string' &&
    (CATEGORY_ORDER as string[]).includes(value)
    ? (value as EventCategory)
    : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * The title reflects the filters, so a shared link says what it is showing
 * before the page has painted — "Music events in Nairobi", not "Events".
 */
export async function generateMetadata({
  searchParams,
}: PageProps<'/events'>) {
  const params = await searchParams;
  const parts: (string | null)[] = [];
  const category = readCategory(params.category);
  if (category) parts.push(CATEGORY_LABELS[category]);
  parts.push('events');
  if (params.county) parts.push(`in ${params.county}`);
  if (params.q) parts.push(`matching “${params.q}”`);

  /*
   * What a filtered listing claims to be.
   *
   * Category x county x search x page multiplies into effectively unlimited
   * URLs over the same events. Left alone a crawler treats each as its own
   * page, spends the budget on permutations, and has to guess which near
   * identical one to rank. So: a search is a query someone typed rather than a
   * page this site offers and is not indexed at all; a category or county
   * filter consolidates onto /events; and pagination stays self-referential,
   * because pointing page 2 at page 1 declares page 2 a duplicate and the
   * events reachable only from it stop being discovered.
   */
  const search = readString(params.q);
  const page = Math.max(1, Number(params.page) || 1);

  return {
    title: parts.filter(Boolean).join(' '),
    ...(search ? { robots: { index: false, follow: true } } : null),
    alternates: {
      canonical: page > 1 ? `/events?page=${page}` : '/events',
    },
  };
}

export default async function EventsPage({
  searchParams,
}: PageProps<'/events'>) {
  // `searchParams` is a Promise in Next 16 — synchronous access was removed.
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [result, categoryCounts, counties] = await Promise.all([
    searchEvents({
      q: readString(params.q),
      category: readCategory(params.category),
      county: readString(params.county),
      when: isWhenFilter(params.when) ? params.when : undefined,
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
        <h1 className="font-heading text-title">
          {params.q ? (
            <>
              Results for <span className="text-primary-400">“{params.q}”</span>
            </>
          ) : (
            'What’s on'
          )}
        </h1>
        {/* Filtering swaps the results without moving focus, so the count is a
            live region: otherwise a screen reader user presses a filter chip
            and gets no confirmation that anything changed. */}
        <p role="status" aria-live="polite" className="mt-2 text-dark-400">
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
          {/* The cards' own titles are h3, so without this the page jumps h1 to
              h3 and a screen-reader user loses the nesting. It also gives the
              results a name in a landmark list. */}
          <section aria-labelledby="results-heading" className="mt-10">
            <h2 id="results-heading" className="sr-only">
              {total} event{total === 1 ? '' : 's'} matching these filters
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {events.map((event, index) => (
                <EventCard key={event.id} event={event} priority={index < 4} />
              ))}
            </div>
          </section>
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
    <EmptyState
      className="mt-10"
      icon={SearchX}
      title="No events match"
      description="Try widening the date range, or clearing the county filter. Most events are in Nairobi, but not all of them."
      action={
        <Button href="/events" variant="secondary">
          Clear all filters
        </Button>
      }
    />
  );
}

/**
 * Pagination preserves every other filter, because a visitor on page two of a
 * filtered search expects page three of the same search, not page three of
 * everything.
 */
function Pagination({
  page,
  pages,
  params,
}: {
  page: number;
  pages: number;
  params: Awaited<PageProps<'/events'>['searchParams']>;
}) {
  const linkTo = (target: number) => {
    // Only the scalar params survive: a repeated key arrives as an array, and
    // URLSearchParams would stringify it as "a,b" — a filter value that
    // matches nothing.
    const next = new URLSearchParams(
      Object.entries(params).flatMap(([key, value]) =>
        typeof value === 'string' ? [[key, value] as [string, string]] : []
      )
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
          Previous<span className="sr-only"> page</span>
        </Button>
      ) : null}

      {/* `aria-current="page"` is what tells a screen reader this is a position
          indicator rather than a link it failed to find. The visible "3 / 12"
          is hidden from it and read out in full instead. */}
      <span
        aria-current="page"
        className="px-4 font-mono text-sm text-dark-400"
      >
        <span aria-hidden="true">
          {page} / {pages}
        </span>
        <span className="sr-only">
          Page {page} of {pages}
        </span>
      </span>

      {page < pages ? (
        <Button href={linkTo(page + 1)} variant="secondary" size="sm">
          Next<span className="sr-only"> page</span>
        </Button>
      ) : null}
    </nav>
  );
}
