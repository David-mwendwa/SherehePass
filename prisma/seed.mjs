import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';

import { EVENTS, ORGANIZERS } from './data/events.mjs';
import { VENUES } from './data/venues.mjs';

loadEnv();

const here = dirname(fileURLToPath(import.meta.url));

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/**
 * Seeding.
 *
 * An events product with an empty database demos as broken, so this builds a
 * catalogue that looks like a working site: real venues, six organisers with
 * distinct voices, upcoming and past events, and a demo account that already
 * has tickets in its wallet.
 *
 * The whole thing is idempotent — every write is an upsert keyed on a natural
 * unique (a slug, an email, a name+county pair) — so `npm run seed` can be run
 * repeatedly without duplicating anything or needing a wipe first.
 */

/** Cover photos, harvested once by scripts/fetch-covers.mjs and committed. */
async function loadCovers() {
  const raw = await readFile(join(here, 'covers.json'), 'utf8');
  return JSON.parse(raw);
}

/**
 * Deterministic pick, so the same event gets the same cover on every reseed.
 * A random pick would reshuffle every image each time the seed ran, which
 * makes screenshots and bug reports impossible to compare.
 */
function pickCover(covers, category, seed) {
  const pool = covers[category] ?? covers.MUSIC;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return pool[hash % pool.length].url;
}

/**
 * Clears orders, which is what makes the seed re-runnable.
 *
 * `OrderItem` references `TicketType` *without* a cascade — deliberately, so
 * that deleting a tier can never quietly delete the record of what someone
 * paid. That means a second seed run cannot replace the old tiers while last
 * run's orders still point at them, so the orders have to go first. Deleting
 * an order does cascade, to its items and its tickets.
 *
 * Correct against a development database and catastrophic against a live one,
 * where an order is somebody's ticket to something they paid for. So the
 * delete is refused when it would actually destroy rows on a database that is
 * not local.
 *
 * Note what is *not* gated: seeding a fresh deployment. That database is empty,
 * there is nothing to destroy, and the count check passes without any flag.
 * Only a re-run against real sales is stopped, which is the case where running
 * the seed a second time out of habit is the mistake.
 */
async function clearOrders() {
  const existing = await db.order.count();
  if (existing === 0) return;

  const url = process.env.DATABASE_URL ?? '';
  const local = /@(localhost|127\.0\.0\.1|host\.docker\.internal)[:/]/.test(url);

  if (!local && process.env.SEED_ALLOW_DESTRUCTIVE !== '1') {
    const host = url.replace(/\/\/[^@]*@/, '//').split('?')[0];
    throw new Error(
      `Refusing to delete ${existing} order(s) on a non-local database.\n\n` +
        `  ${host}\n\n` +
        'Every one of those is a ticket somebody holds, and deleting an order\n' +
        'cascades to its tickets. If you genuinely mean to reset this database,\n' +
        're-run with SEED_ALLOW_DESTRUCTIVE=1.'
    );
  }

  await db.order.deleteMany({});
}

function at(daysFromNow, hour) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, 0, 0, 0);
  return date;
}

/** SHRH + 8 unambiguous characters. No O/0 or I/1 — these get read aloud. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function ticketCode() {
  let body = '';
  for (let i = 0; i < 8; i += 1) {
    body += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `SHRH${body}`;
}

async function main() {
  const covers = await loadCovers();
  const hash = (plain) => bcrypt.hash(plain, 10);

  // ------------------------------------------------------------- accounts
  const [demoHash, adminHash, organizerHash] = await Promise.all([
    hash('demo12345'),
    hash('admin12345'),
    hash('organizer12345'),
  ]);

  const demo = await db.user.upsert({
    where: { email: 'demo@sherehepass.ke' },
    update: {},
    create: {
      name: 'Demo Attendee',
      email: 'demo@sherehepass.ke',
      passwordHash: demoHash,
      role: 'ATTENDEE',
      phone: '+254700000001',
    },
  });

  await db.user.upsert({
    where: { email: 'admin@sherehepass.ke' },
    update: {},
    create: {
      name: 'Platform Admin',
      email: 'admin@sherehepass.ke',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });

  // ------------------------------------------------------------- organisers
  const organizerBySlug = new Map();
  for (const org of ORGANIZERS) {
    const user = await db.user.upsert({
      where: { email: org.user.email },
      update: { role: 'ORGANIZER' },
      create: {
        name: org.user.name,
        email: org.user.email,
        passwordHash: organizerHash,
        role: 'ORGANIZER',
      },
    });

    const organizer = await db.organizer.upsert({
      where: { slug: org.slug },
      update: { name: org.name, bio: org.bio, website: org.website, verified: org.verified },
      create: {
        userId: user.id,
        slug: org.slug,
        name: org.name,
        bio: org.bio,
        website: org.website,
        verified: org.verified,
      },
    });

    organizerBySlug.set(org.slug, organizer);
  }

  // ----------------------------------------------------------------- venues
  const venueByName = new Map();
  for (const venue of VENUES) {
    const row = await db.venue.upsert({
      where: { name_county: { name: venue.name, county: venue.county } },
      update: venue,
      create: venue,
    });
    venueByName.set(venue.name, row);
  }

  // ----------------------------------------------------------------- events
  await clearOrders();

  const eventBySlug = new Map();
  for (const event of EVENTS) {
    const startsAt = at(event.daysFromNow, event.startHour);
    const endsAt = new Date(startsAt.getTime() + event.durationHours * 3600_000);
    const organizer = organizerBySlug.get(event.organizer);
    const venue = venueByName.get(event.venue);

    const shared = {
      title: event.title,
      summary: event.summary,
      description: event.description,
      coverImage: pickCover(covers, event.category, event.slug),
      category: event.category,
      status: 'PUBLISHED',
      startsAt,
      endsAt,
      publishedAt: new Date(startsAt.getTime() - 30 * 86400_000),
      featured: Boolean(event.featured),
      minAge: event.minAge ?? null,
      organizerId: organizer.id,
      venueId: venue.id,
    };

    const row = await db.event.upsert({
      where: { slug: event.slug },
      update: shared,
      create: { slug: event.slug, ...shared },
    });
    eventBySlug.set(event.slug, row);

    // Ticket types are replaced wholesale on reseed, which is safe only
    // because orders were cleared above.
    await db.ticketType.deleteMany({ where: { eventId: row.id } });
    await db.ticketType.createMany({
      data: event.tiers.map((tier, index) => ({
        eventId: row.id,
        name: tier.name,
        description: tier.description ?? null,
        priceCents: tier.priceCents,
        quantity: tier.quantity,
        // A catalogue where every tier reads "0 sold" looks unlaunched. These
        // are plausible sell-through rates, weighted so cheap tiers go first.
        sold: Math.min(
          tier.quantity,
          Math.floor(tier.quantity * (index === 0 ? 0.72 : index === 1 ? 0.41 : 0.16))
        ),
        maxPerOrder: 10,
        position: index,
      })),
    });
  }

  // ------------------------------------------------- demo orders + tickets
  // The demo account opens with a used ticket and two live ones, so the wallet
  // has all three states to render rather than an empty shelf.
  const demoPurchases = [
    { slug: 'sauti-rooftop-sessions-vol-9', tier: 'Advance', quantity: 2, status: 'PAID' },
    { slug: 'nairobi-devs-monthly-march', tier: 'General', quantity: 1, status: 'PAID' },
    { slug: 'rooftop-sessions-vol-8', tier: 'Gate', quantity: 1, status: 'PAID', checkedIn: true },
    { slug: 'pwani-beach-festival', tier: 'Weekend Pass', quantity: 2, status: 'PENDING' },
  ];

  for (const purchase of demoPurchases) {
    const event = eventBySlug.get(purchase.slug);
    const tier = await db.ticketType.findFirst({
      where: { eventId: event.id, name: purchase.tier },
    });
    if (!tier) continue;

    const totalCents = tier.priceCents * purchase.quantity;
    const paid = purchase.status === 'PAID';

    await db.order.create({
      data: {
        reference: `SP-${event.slug.slice(0, 6).toUpperCase()}-${Math.floor(Math.random() * 9000) + 1000}`,
        userId: demo.id,
        eventId: event.id,
        status: purchase.status,
        method: 'MPESA',
        totalCents,
        buyerName: demo.name,
        buyerEmail: demo.email,
        buyerPhone: demo.phone,
        paidAt: paid ? new Date(Date.now() - 5 * 86400_000) : null,
        items: {
          create: {
            ticketTypeId: tier.id,
            quantity: purchase.quantity,
            unitPriceCents: tier.priceCents,
          },
        },
        // Tickets exist only for paid orders. A pending order has bought
        // nothing yet, and issuing a scannable code before payment lands is
        // how a free ticket happens.
        tickets: paid
          ? {
              create: Array.from({ length: purchase.quantity }, () => ({
                code: ticketCode(),
                eventId: event.id,
                ticketTypeId: tier.id,
                holderName: demo.name,
                status: purchase.checkedIn ? 'CHECKED_IN' : 'VALID',
                checkedInAt: purchase.checkedIn ? event.startsAt : null,
              })),
            }
          : undefined,
      },
    });
  }

  // A couple of saved events, so the saved screen is not empty either.
  for (const slug of ['pwani-beach-festival', 'devfest-nairobi', 'jiji-night-market']) {
    const event = eventBySlug.get(slug);
    await db.savedEvent.upsert({
      where: { userId_eventId: { userId: demo.id, eventId: event.id } },
      update: {},
      create: { userId: demo.id, eventId: event.id },
    });
  }

  const counts = {
    users: await db.user.count(),
    organizers: await db.organizer.count(),
    venues: await db.venue.count(),
    events: await db.event.count(),
    ticketTypes: await db.ticketType.count(),
    tickets: await db.ticket.count(),
  };

  console.log('Seeded:', counts);
  console.log('\n  demo@sherehepass.ke / demo12345         (attendee)');
  console.log('  wanjiru@sauti.co.ke / organizer12345   (organiser)');
  console.log('  admin@sherehepass.ke / admin12345      (admin)\n');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
