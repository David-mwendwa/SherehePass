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

/** The columns a card needs, and nothing else — no description, no body text. */
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
};

const publishedAndUpcoming = () => ({
  status: 'PUBLISHED',
  // `endsAt`, not `startsAt`: a two-day festival on its second morning is still
  // happening, and dropping it off the list at midnight would be wrong.
  endsAt: { gte: new Date() },
});

export async function getFeaturedEvents(take = 3) {
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
export async function getUpcomingEvents(take = 8, exclude = []) {
  return db.event.findMany({
    where: {
      ...publishedAndUpcoming(),
      ...(exclude.length ? { id: { notIn: exclude } } : {}),
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
export async function getSellingFastEvents(take = 4, exclude = []) {
  // `<> ALL(array)` rather than branching the SQL on whether there is anything
  // to exclude: Postgres evaluates `id <> ALL('{}')` as true for every row, so
  // the empty case needs no second query text.
  const rows = await db.$queryRaw`
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
    where: { id: { in: rows.map((r) => r.id) } },
    orderBy: { startsAt: 'asc' },
    select: cardSelect,
  });
}

/** Counts per category, for the browse filter bar. Derived, never hardcoded. */
export async function getCategoryCounts() {
  const grouped = await db.event.groupBy({
    by: ['category'],
    where: publishedAndUpcoming(),
    _count: { _all: true },
  });

  return Object.fromEntries(grouped.map((row) => [row.category, row._count._all]));
}

export async function getCounties() {
  const rows = await db.venue.findMany({
    where: { events: { some: publishedAndUpcoming() } },
    select: { county: true },
    distinct: ['county'],
    orderBy: { county: 'asc' },
  });
  return rows.map((r) => r.county);
}

/**
 * The browse query.
 *
 * `when` is resolved to a date range here rather than in the page, so "this
 * weekend" means the same thing on the filter chip, in the page title and in
 * the query. Weekend is Friday 4pm to Sunday midnight — an events product where
 * Friday night is not part of the weekend would be wrong about its own domain.
 */
function whenRange(when) {
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
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { gte: now, lte: end };
  }
  return null;
}

export async function searchEvents({
  q,
  category,
  county,
  when,
  free,
  page = 1,
  perPage = 12,
} = {}) {
  const where = { status: 'PUBLISHED' };

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

/** The full record for an event page. Returns null for drafts and unknowns. */
export async function getEventBySlug(slug) {
  return db.event.findFirst({
    where: { slug, status: { in: ['PUBLISHED', 'CANCELLED'] } },
    include: {
      venue: true,
      organizer: {
        select: { id: true, name: true, slug: true, bio: true, verified: true },
      },
      ticketTypes: { orderBy: { position: 'asc' } },
    },
  });
}

export async function getRelatedEvents(event, take = 3) {
  return db.event.findMany({
    where: {
      ...publishedAndUpcoming(),
      id: { not: event.id },
      OR: [{ category: event.category }, { venue: { county: event.venue.county } }],
    },
    orderBy: { startsAt: 'asc' },
    take,
    select: cardSelect,
  });
}

export async function getOrganizerBySlug(slug) {
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

export async function listOrganizers() {
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
export function remainingFor(ticketTypes) {
  return ticketTypes.reduce((sum, tier) => sum + (tier.quantity - tier.sold), 0);
}
