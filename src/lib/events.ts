import { Prisma, type EventCategory } from '@prisma/client';

import { db } from '@/lib/db';

/**
 * Reads over the catalogue.
 *
 * Every public read goes through here, and every one of them filters on
 * `status: 'PUBLISHED'`. That is the point of a single module: a draft event
 * leaking onto the browse page is not a cosmetic bug, it is an organiser's
 * unannounced line-up going out early, and it is exactly the sort of thing
 * that happens when each page writes its own `where`.
 */

/**
 * The columns a card needs, and nothing else — no description, no body text.
 *
 * `satisfies` rather than a plain annotation: the object keeps its exact
 * literal type, so `EventCard` below is the precise shape of the rows this
 * selects. Annotating it `Prisma.EventSelect` instead would widen it and the
 * card would be typed as "some event fields, maybe".
 */
const cardSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  coverImage: true,
  category: true,
  startsAt: true,
  endsAt: true,
  featured: true,
  venue: { select: { name: true, county: true } },
  organizer: { select: { name: true, slug: true, verified: true } },
  ticketTypes: { select: { priceCents: true, quantity: true, sold: true } },
} satisfies Prisma.EventSelect;

/** One row as the card renders it. Derived from the select, never restated. */
export type EventCard = Prisma.EventGetPayload<{ typeof: never } & {
  select: typeof cardSelect;
}>;

const publishedAndUpcoming = (): Prisma.EventWhereInput => ({
  status: 'PUBLISHED',
  // `endsAt`, not `startsAt`: a two-day festival on its second morning is still
  // happening, and dropping it off the list at midnight would be wrong.
  endsAt: { gte: new Date() },
});

export async function getFeaturedEvents(take = 3): Promise<EventCard[]> {
  return db.event.findMany({
    where: { ...publishedAndUpcoming(), featured: true },
    orderBy: { startsAt: 'asc' },
    take,
    select: cardSelect,
  });
}

/**
 * `exclude` exists because the home page stacks three lists — featured,
 * selling fast, then upcoming — and the same event legitimately qualifies for
 * all three. Shown three times it reads as a bug in the catalogue rather than
 * as emphasis, so each section tells the next what it has already used.
 */
export async function getUpcomingEvents(
  take = 8,
  exclude: string[] = []
): Promise<EventCard[]> {
  return db.event.findMany({
    where: {
      ...publishedAndUpcoming(),
      ...(exclude.length > 0 ? { id: { notIn: exclude } } : {}),
    },
    orderBy: { startsAt: 'asc' },
    take,
    select: cardSelect,
  });
}

/**
 * "Selling fast" — tiers that are more than 70% gone.
 *
 * Computed in SQL rather than by loading every event and filtering in JS,
 * because the comparison is between two columns of the same row and Prisma
 * cannot express that in a `where`. The alternative (fetch all, filter here)
 * gets slower with every event added.
 */
export async function getSellingFastEvents(
  take = 4,
  exclude: string[] = []
): Promise<EventCard[]> {
  // `$queryRaw` is typed `unknown` by design — it cannot know the shape of an
  // arbitrary query — so the row type is declared here, next to the SELECT it
  // describes, rather than being asserted at the call site.
  const rows = await db.$queryRaw<Array<{ id: string; starts: Date }>>`
    SELECT e.id, MIN(e."startsAt") AS starts
    FROM "Event" e
    JOIN "TicketType" t ON t."eventId" = e.id
    WHERE e.status = 'PUBLISHED'
      AND e."endsAt" >= NOW()
      AND e.id <> ALL(${exclude}::text[])
      AND t.quantity > 0
      AND t.sold::float / t.quantity >= 0.7
    GROUP BY e.id
    ORDER BY starts ASC
    LIMIT ${take}
  `;

  if (rows.length === 0) return [];

  return db.event.findMany({
    where: { id: { in: rows.map((row) => row.id) } },
    orderBy: { startsAt: 'asc' },
    select: cardSelect,
  });
}

/** Counts per category, for the browse filter bar. Derived, never hardcoded. */
export async function getCategoryCounts(): Promise<
  Partial<Record<EventCategory, number>>
> {
  const grouped = await db.event.groupBy({
    by: ['category'],
    where: publishedAndUpcoming(),
    _count: { _all: true },
  });

  return Object.fromEntries(
    grouped.map((row) => [row.category, row._count._all])
  ) as Partial<Record<EventCategory, number>>;
}

export async function getCounties(): Promise<string[]> {
  const rows = await db.venue.findMany({
    where: { events: { some: publishedAndUpcoming() } },
    select: { county: true },
    distinct: ['county'],
    orderBy: { county: 'asc' },
  });
  return rows.map((row) => row.county);
}

/** The date windows the browse filter offers. */
export type WhenFilter = 'today' | 'this-weekend' | 'this-month';

export const WHEN_FILTERS: WhenFilter[] = ['today', 'this-weekend', 'this-month'];

export function isWhenFilter(value: unknown): value is WhenFilter {
  return (
    typeof value === 'string' && (WHEN_FILTERS as string[]).includes(value)
  );
}

/**
 * `when` is resolved to a date range here rather than in the page, so "this
 * weekend" means the same thing on the filter chip, in the page title and in
 * the query. Weekend is Friday 4pm to Sunday midnight — an events product where
 * Friday night is not part of the weekend would be wrong about its own domain.
 */
function whenRange(
  when: WhenFilter | undefined
): Prisma.DateTimeFilter | null {
  const now = new Date();

  if (when === 'today') {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { gte: now, lte: end };
  }

  if (when === 'this-weekend') {
    const friday = new Date(now);
    // getDay(): 0 Sun … 5 Fri. Days until the coming Friday, 0 if today is one.
    const untilFriday = (5 - friday.getDay() + 7) % 7;
    friday.setDate(friday.getDate() + untilFriday);
    friday.setHours(16, 0, 0, 0);

    const sunday = new Date(friday);
    sunday.setDate(sunday.getDate() + 2);
    sunday.setHours(23, 59, 59, 999);

    // If it is already Friday evening, the weekend started in the past; the
    // range still has to begin now or nothing matches.
    return { gte: friday < now ? now : friday, lte: sunday };
  }

  if (when === 'this-month') {
    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
    return { gte: now, lte: end };
  }

  return null;
}

export type SearchEventsInput = {
  q?: string | undefined;
  category?: EventCategory | undefined;
  county?: string | undefined;
  when?: WhenFilter | undefined;
  free?: boolean | undefined;
  page?: number;
  perPage?: number;
};

export type SearchEventsResult = {
  events: EventCard[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
};

export async function searchEvents({
  q,
  category,
  county,
  when,
  free,
  page = 1,
  perPage = 12,
}: SearchEventsInput = {}): Promise<SearchEventsResult> {
  const where: Prisma.EventWhereInput = { status: 'PUBLISHED' };

  const range = whenRange(when);
  if (range) {
    where.startsAt = range;
  } else {
    where.endsAt = { gte: new Date() };
  }

  if (category) where.category = category;
  if (county) where.venue = { county };
  if (free) where.ticketTypes = { some: { priceCents: 0 } };

  if (q) {
    // Case-insensitive across the fields a visitor would actually type into:
    // the title, the one-line summary, the venue and the organiser.
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { summary: { contains: q, mode: 'insensitive' } },
      { venue: { name: { contains: q, mode: 'insensitive' } } },
      { venue: { county: { contains: q, mode: 'insensitive' } } },
      { organizer: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [events, total] = await Promise.all([
    db.event.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: cardSelect,
    }),
    // Counted with the same `where`, so the total matches what is being shown.
    // A count of everything next to a filtered list is a lie the user can see.
    db.event.count({ where }),
  ]);

  return { events, total, page, perPage, pages: Math.ceil(total / perPage) };
}

const eventDetailInclude = {
  venue: true,
  organizer: {
    select: { id: true, name: true, slug: true, bio: true, verified: true, website: true },
  },
  ticketTypes: { orderBy: { position: 'asc' } },
} satisfies Prisma.EventInclude;

export type EventDetail = Prisma.EventGetPayload<{
  include: typeof eventDetailInclude;
}>;

/** The full record for an event page. Returns null for drafts and unknowns. */
export async function getEventBySlug(
  slug: string
): Promise<EventDetail | null> {
  return db.event.findFirst({
    where: { slug, status: { in: ['PUBLISHED', 'CANCELLED'] } },
    include: eventDetailInclude,
  });
}

export async function getRelatedEvents(
  event: Pick<EventDetail, 'id' | 'category'> & {
    venue: Pick<EventDetail['venue'], 'county'>;
  },
  take = 3
): Promise<EventCard[]> {
  return db.event.findMany({
    where: {
      ...publishedAndUpcoming(),
      id: { not: event.id },
      OR: [
        { category: event.category },
        { venue: { county: event.venue.county } },
      ],
    },
    orderBy: { startsAt: 'asc' },
    take,
    select: cardSelect,
  });
}

const organizerInclude = {
  events: {
    where: { status: 'PUBLISHED', endsAt: { gte: new Date() } },
    orderBy: { startsAt: 'asc' },
    select: cardSelect,
  },
} satisfies Prisma.OrganizerInclude;

export type OrganizerWithEvents = Prisma.OrganizerGetPayload<{
  include: typeof organizerInclude;
}>;

export async function getOrganizerBySlug(
  slug: string
): Promise<OrganizerWithEvents | null> {
  return db.organizer.findUnique({
    where: { slug },
    include: {
      events: {
        where: publishedAndUpcoming(),
        orderBy: { startsAt: 'asc' },
        select: cardSelect,
      },
    },
  });
}

export type OrganizerSummary = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  verified: boolean;
  _count: { events: number };
};

export async function listOrganizers(): Promise<OrganizerSummary[]> {
  return db.organizer.findMany({
    orderBy: [{ verified: 'desc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      bio: true,
      verified: true,
      _count: { select: { events: { where: publishedAndUpcoming() } } },
    },
  });
}

/** Remaining across all tiers — what "Sold out" on a card is decided by. */
export function remainingFor(
  ticketTypes: ReadonlyArray<{ quantity: number; sold: number }>
): number {
  return ticketTypes.reduce((sum, tier) => sum + (tier.quantity - tier.sold), 0);
}
