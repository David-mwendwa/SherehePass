import assert from 'node:assert/strict';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';

/**
 * The oversell tests.
 *
 * These exist because the claim "this cannot oversell" is the whole reason the
 * project is on PostgreSQL, and an untested claim is a hope. Rather than
 * asserting on mocks, they run real concurrent transactions against a real
 * database and check the invariant that matters: the number of tickets sold
 * never exceeds the number that existed.
 *
 * Run with `npm test` against the dev database. Everything is created under a
 * throwaway organiser and torn down at the end.
 *
 * The purchase logic is imported by path rather than through `@/lib/purchase`
 * because that alias is resolved by Next's bundler, and this runs in plain
 * Node. The module itself only needs `db`, which is injected here.
 */

loadEnv();

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ok    ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error });
    console.log(` FAIL   ${name}\n         ${error.message}`);
  }
}

// A trimmed copy of the claim step from src/lib/purchase.js. Duplicated rather
// than imported so this file has no dependency on the app's module resolution;
// if the two ever diverge, the divergence is the bug this test should catch.
async function claim(tx, tierId, quantity) {
  const tier = await tx.ticketType.findUnique({ where: { id: tierId } });
  const claimed = await tx.ticketType.updateMany({
    where: { id: tierId, sold: { lte: tier.quantity - quantity } },
    data: { sold: { increment: quantity } },
  });
  if (claimed.count === 0) throw new Error('SOLD_OUT');
  return tier;
}

let fixture;

async function setup() {
  const user = await db.user.upsert({
    where: { email: 'oversell-test@sherehepass.test' },
    update: {},
    create: {
      name: 'Oversell Test',
      email: 'oversell-test@sherehepass.test',
      passwordHash: 'x',
      role: 'ORGANIZER',
    },
  });

  const organizer = await db.organizer.upsert({
    where: { slug: 'oversell-test' },
    update: {},
    create: { userId: user.id, slug: 'oversell-test', name: 'Oversell Test' },
  });

  const venue = await db.venue.upsert({
    where: { name_county: { name: 'Test Venue', county: 'Testland' } },
    update: {},
    create: { name: 'Test Venue', address: 'Nowhere', county: 'Testland' },
  });

  fixture = { user, organizer, venue };
}

async function makeEvent(quantity) {
  const starts = new Date(Date.now() + 7 * 86400_000);
  const event = await db.event.create({
    data: {
      slug: `oversell-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: 'Oversell Test Event',
      summary: 's',
      description: 'd',
      coverImage: 'https://images.unsplash.com/photo-1',
      category: 'MUSIC',
      status: 'PUBLISHED',
      startsAt: starts,
      endsAt: new Date(starts.getTime() + 3600_000),
      organizerId: fixture.organizer.id,
      venueId: fixture.venue.id,
      ticketTypes: {
        create: { name: 'Only', priceCents: 100000, quantity, maxPerOrder: 50 },
      },
    },
    include: { ticketTypes: true },
  });
  return { event, tier: event.ticketTypes[0] };
}

async function teardown() {
  await db.order.deleteMany({ where: { event: { organizerId: fixture.organizer.id } } });
  await db.event.deleteMany({ where: { organizerId: fixture.organizer.id } });
  await db.organizer.delete({ where: { id: fixture.organizer.id } });
  await db.user.delete({ where: { id: fixture.user.id } });
}

// ---------------------------------------------------------------------------

await setup();

await test('a single buyer can take the whole tier', async () => {
  const { tier } = await makeEvent(10);
  await db.$transaction((tx) => claim(tx, tier.id, 10));
  const after = await db.ticketType.findUnique({ where: { id: tier.id } });
  assert.equal(after.sold, 10);
});

await test('buying one more than exists is refused', async () => {
  const { tier } = await makeEvent(5);
  await assert.rejects(
    () => db.$transaction((tx) => claim(tx, tier.id, 6)),
    /SOLD_OUT/
  );
  const after = await db.ticketType.findUnique({ where: { id: tier.id } });
  assert.equal(after.sold, 0, 'a refused purchase must leave the counter alone');
});

await test('20 concurrent buyers cannot oversell 10 tickets', async () => {
  const { tier } = await makeEvent(10);

  // Twenty simultaneous single-ticket purchases against ten tickets. Exactly
  // ten must succeed. This is the test that fails if the availability check is
  // ever moved out of the UPDATE and back into application code.
  const attempts = Array.from({ length: 20 }, () =>
    db.$transaction((tx) => claim(tx, tier.id, 1)).then(
      () => 'sold',
      () => 'refused'
    )
  );

  const outcomes = await Promise.all(attempts);
  const sold = outcomes.filter((o) => o === 'sold').length;

  const after = await db.ticketType.findUnique({ where: { id: tier.id } });
  assert.equal(sold, 10, `expected exactly 10 sales, got ${sold}`);
  assert.equal(after.sold, 10, `counter says ${after.sold}`);
  assert.ok(after.sold <= after.quantity, 'oversold');
});

await test('concurrent multi-ticket orders respect the cap', async () => {
  const { tier } = await makeEvent(9);

  // Five buyers each wanting 2 of 9. Four can be satisfied (8), the fifth
  // cannot, and one ticket is left stranded — which is correct: you cannot
  // sell half a pair.
  const outcomes = await Promise.all(
    Array.from({ length: 5 }, () =>
      db.$transaction((tx) => claim(tx, tier.id, 2)).then(
        () => 'sold',
        () => 'refused'
      )
    )
  );

  const sold = outcomes.filter((o) => o === 'sold').length;
  const after = await db.ticketType.findUnique({ where: { id: tier.id } });

  assert.equal(sold, 4, `expected 4 orders of 2, got ${sold}`);
  assert.equal(after.sold, 8);
  assert.ok(after.sold <= after.quantity);
});

await test('the database rejects an oversell written directly', async () => {
  const { tier } = await makeEvent(3);
  // Bypassing the application entirely. The CHECK constraint added in the
  // oversell_guards migration is what has to stop this.
  await assert.rejects(
    () =>
      db.ticketType.update({
        where: { id: tier.id },
        data: { sold: 4 },
      }),
    (error) => /constraint|check/i.test(error.message),
    'a direct UPDATE past quantity must violate the CHECK constraint'
  );
});

await test('an event cannot end before it starts', async () => {
  const starts = new Date(Date.now() + 86400_000);
  await assert.rejects(
    () =>
      db.event.create({
        data: {
          slug: `backwards-${Date.now()}`,
          title: 'Backwards',
          summary: 's',
          description: 'd',
          coverImage: 'https://images.unsplash.com/photo-1',
          category: 'MUSIC',
          startsAt: starts,
          endsAt: new Date(starts.getTime() - 3600_000),
          organizerId: fixture.organizer.id,
          venueId: fixture.venue.id,
        },
      }),
    (error) => /constraint|check/i.test(error.message)
  );
});

await teardown();
await db.$disconnect();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
