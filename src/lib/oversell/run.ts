import 'server-only';

import { db } from '@/lib/db';
import { claimStock } from '@/lib/purchase';
import {
  DEMO_LIMITS,
  type AttemptOutcome,
  type DemoRun,
} from '@/lib/oversell/contract';

/**
 * The live demonstration behind /engineering.
 *
 * It fires N genuinely concurrent transactions at one ticket tier that has
 * fewer than N tickets, and reports what the database did. The point is that
 * the answer is never "N sold" — it is always exactly the capacity, however
 * many times it is run and however hard it is pushed.
 *
 * Two things make this a demonstration rather than a mock-up:
 *
 *   1. It calls `claimStock` — the same exported function the real checkout
 *      uses, in the same kind of `$transaction`. Nothing here re-implements the
 *      guarantee it is claiming to show. The only thing the real path does that
 *      this does not is write the Order row afterwards.
 *   2. The requests really do overlap. They are started together and awaited
 *      together, so they are in flight at the same time and contend for the
 *      same row lock.
 *
 * It runs against a sandbox tier on a DRAFT event, so nothing it does touches a
 * real event's sales — DRAFT is excluded from every public listing and from
 * `purchaseTickets`, which refuses anything that is not PUBLISHED.
 */

const SANDBOX_SLUG = '__oversell-sandbox';

/**
 * The sandbox event and its one tier.
 *
 * Idempotent, and it reuses whatever organiser and venue the seed created
 * rather than inventing its own, so it adds exactly one event and one tier to
 * the database no matter how many times the page is opened.
 */
async function ensureSandboxTier(capacity: number): Promise<{
  id: string;
  quantity: number;
  sold: number;
}> {
  const existing = await db.event.findUnique({
    where: { slug: SANDBOX_SLUG },
    select: { id: true },
  });

  let eventId = existing?.id;

  if (!eventId) {
    const [organizer, venue] = await Promise.all([
      db.organizer.findFirst({ select: { id: true } }),
      db.venue.findFirst({ select: { id: true } }),
    ]);

    if (!organizer || !venue) {
      throw new Error(
        'The sandbox needs at least one organiser and venue. Run `npm run seed`.'
      );
    }

    const created = await db.event.create({
      data: {
        slug: SANDBOX_SLUG,
        title: 'Concurrency sandbox',
        summary: 'Not a real event. Backs the demonstration on /engineering.',
        description:
          'A DRAFT event that exists only so the oversell demonstration has a ticket tier to contend for. It is excluded from every listing.',
        coverImage: '',
        category: 'TECH',
        // DRAFT is what keeps it out of browse, search, the home page and the
        // organiser's own dashboard totals.
        status: 'DRAFT',
        startsAt: new Date('2099-01-01T18:00:00Z'),
        endsAt: new Date('2099-01-01T23:00:00Z'),
        organizerId: organizer.id,
        venueId: venue.id,
      },
      select: { id: true },
    });
    eventId = created.id;
  }

  // Reset to a known state for every run: full capacity, nothing sold.
  const tier = await db.ticketType.findFirst({
    where: { eventId },
    select: { id: true },
  });

  if (tier) {
    return db.ticketType.update({
      where: { id: tier.id },
      data: { quantity: capacity, sold: 0 },
      select: { id: true, quantity: true, sold: true },
    });
  }

  return db.ticketType.create({
    data: {
      eventId,
      name: 'Sandbox',
      priceCents: 0,
      quantity: capacity,
      sold: 0,
      position: 0,
    },
    select: { id: true, quantity: true, sold: true },
  });
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export async function runOversellDemo({
  attempts: requestedAttempts,
  capacity: requestedCapacity,
}: {
  attempts: number;
  capacity: number;
}): Promise<DemoRun> {
  const attempts = clamp(requestedAttempts, 2, DEMO_LIMITS.maxAttempts);
  const capacity = clamp(requestedCapacity, 1, DEMO_LIMITS.maxCapacity);

  const tier = await ensureSandboxTier(capacity);
  const startedAt = Date.now();

  /**
   * Every transaction is created before any of them is awaited, which is what
   * makes them concurrent — `await` inside the loop would serialise them and
   * the demonstration would prove nothing, because nothing would race.
   *
   * `allSettled`, not `all`: a refusal is the expected outcome for most of
   * these, and `all` would reject on the first one and discard the rest.
   */
  const settled = await Promise.allSettled(
    Array.from({ length: attempts }, async (_, i): Promise<AttemptOutcome> => {
      const began = Date.now();
      const claim = await db.$transaction((tx) => claimStock(tx, tier, 1));
      const outcome: AttemptOutcome = {
        index: i + 1,
        claimed: claim.ok,
        ms: Date.now() - began,
      };
      return claim.ok ? outcome : { ...outcome, remaining: claim.remaining };
    })
  );

  const totalMs = Date.now() - startedAt;

  const outcomes = settled.map((result, i): AttemptOutcome => {
    if (result.status === 'fulfilled') return result.value;
    // A transaction that failed outright — a pool timeout, say — is reported
    // as a refusal rather than hidden. It did not get a ticket, which is the
    // only thing the invariant cares about.
    return { index: i + 1, claimed: false, ms: 0 };
  });

  const claimed = outcomes.filter((outcome) => outcome.claimed).length;

  const after = await db.ticketType.findUniqueOrThrow({
    where: { id: tier.id },
    select: { sold: true },
  });

  return {
    attempts,
    capacity,
    outcomes,
    claimed,
    refused: attempts - claimed,
    finalSold: after.sold,
    totalMs,
    // Both halves matter: the counter must not exceed capacity, and it must
    // agree with the number of transactions that were told they succeeded. A
    // mismatch would mean someone was charged for a ticket that was never
    // taken from the pool.
    held: after.sold <= capacity && after.sold === claimed,
  };
}
