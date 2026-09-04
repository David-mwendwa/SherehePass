import type { Order, PaymentMethod, Prisma } from '@prisma/client';

import { db } from '@/lib/db';

/**
 * Selling tickets.
 *
 * This is the one operation in the product that must not be approximate, and
 * it is the reason the whole thing runs on Postgres rather than a document
 * store. The failure it guards against is mundane and common: two people press
 * "Pay" on the last four tickets at the same moment, both requests read
 * "4 remaining", and the venue sells eight seats it does not have.
 *
 * The shape of the fix:
 *
 *   1. Everything below happens inside one `$transaction`. Either an order
 *      exists with its tickets and the counters moved, or nothing happened.
 *
 *   2. Availability is never "read, then decide, then write". It is a single
 *      conditional UPDATE:
 *
 *          UPDATE "TicketType" SET sold = sold + n
 *          WHERE id = ? AND sold + n <= quantity
 *
 *      Postgres locks the row for the duration of that statement, so concurrent
 *      buyers queue behind each other rather than racing. The loser's UPDATE
 *      matches zero rows, which this code turns into a thrown error, which
 *      rolls the transaction back. There is no window between the check and
 *      the write, because they are the same statement.
 *
 *   3. Prices come from the database inside the transaction, never from the
 *      client. A total posted by the browser is a suggestion from a stranger.
 *
 *   4. A CHECK constraint (`sold <= quantity`) holds the same invariant at the
 *      storage layer, so even a hand-written UPDATE cannot oversell.
 */

/**
 * Every way a purchase can be refused, as a closed set. A caller that switches
 * on this gets told when a new one is added, which is the point — "sold out"
 * has to reach the buyer as a sentence, not a 500.
 */
export type PurchaseErrorCode =
  | 'PURCHASE_FAILED'
  | 'EMPTY'
  | 'NOT_ON_SALE'
  | 'FINISHED'
  | 'UNKNOWN_TIER'
  | 'BAD_QUANTITY'
  | 'OVER_LIMIT'
  | 'NOT_OPEN'
  | 'CLOSED'
  | 'SOLD_OUT'
  | 'NO_ORDER'
  | 'NOT_PENDING';

export class PurchaseError extends Error {
  readonly code: PurchaseErrorCode;
  readonly tierId: string | null;

  constructor(
    message: string,
    {
      code = 'PURCHASE_FAILED',
      tierId = null,
    }: { code?: PurchaseErrorCode; tierId?: string | null } = {}
  ) {
    super(message);
    this.name = 'PurchaseError';
    this.code = code;
    this.tierId = tierId;
  }
}

/** SHRH + 8 unambiguous characters. O/0 and I/1 are excluded: these are read
 *  aloud at a gate and typed in by hand when a phone screen has died. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function ticketCode(): string {
  let body = '';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (const byte of bytes) body += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return `SHRH${body}`;
}

function orderReference(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  let body = '';
  for (const byte of bytes) body += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return `SP-${body}`;
}

/** One "n of this tier", as it arrives from the ticket picker. */
export type PurchaseLine = {
  ticketTypeId: string;
  quantity: number;
};

export type PurchaseInput = {
  /** Who is buying. Always from the session, never from the form. */
  userId: string;
  /** The event, re-verified against every tier inside the transaction. */
  eventId: string;
  lines: PurchaseLine[];
  method: PaymentMethod;
  buyer: { name: string; email: string; phone?: string | undefined };
};

export type PurchaseResult = {
  order: Pick<Order, 'id' | 'reference' | 'totalCents'>;
  event: { id: string; slug: string; title: string };
};

export async function purchaseTickets({
  userId,
  eventId,
  lines,
  method,
  buyer,
}: PurchaseInput): Promise<PurchaseResult> {
  const wanted = lines.filter((line) => line.quantity > 0);
  if (wanted.length === 0) {
    throw new PurchaseError('Choose at least one ticket.', { code: 'EMPTY' });
  }

  return db.$transaction(async (tx) => {
    const event = await tx.event.findUnique({
      where: { id: eventId },
      select: { id: true, slug: true, title: true, status: true, endsAt: true },
    });

    if (!event || event.status !== 'PUBLISHED') {
      throw new PurchaseError('That event is not on sale.', { code: 'NOT_ON_SALE' });
    }
    if (event.endsAt < new Date()) {
      throw new PurchaseError('That event has already finished.', { code: 'FINISHED' });
    }

    const tiers = await tx.ticketType.findMany({
      where: {
        id: { in: wanted.map((line) => line.ticketTypeId) },
        // Scoped to the event as well as the id, so a tier id lifted from a
        // different event's page cannot be bought through this one.
        eventId: event.id,
      },
    });

    if (tiers.length !== wanted.length) {
      throw new PurchaseError('Those tickets are no longer available.', {
        code: 'UNKNOWN_TIER',
      });
    }

    // Each requested line is paired with its tier exactly once, here, and
    // everything below works on the pair. The count check above already
    // guarantees a tier exists for every line, but a `Map.get` returns
    // `T | undefined` regardless — so rather than assert that away at eight
    // separate call sites, the lookup happens once and its failure is handled
    // where it can still say something useful.
    const tierById = new Map(tiers.map((tier) => [tier.id, tier]));

    const resolved = wanted.map((line) => {
      const tier = tierById.get(line.ticketTypeId);
      if (!tier) {
        throw new PurchaseError('Those tickets are no longer available.', {
          code: 'UNKNOWN_TIER',
        });
      }
      return { line, tier };
    });

    const now = new Date();
    let totalCents = 0;

    for (const { line, tier } of resolved) {
      if (!Number.isInteger(line.quantity) || line.quantity < 1) {
        throw new PurchaseError('That is not a valid number of tickets.', {
          code: 'BAD_QUANTITY',
          tierId: tier.id,
        });
      }
      if (line.quantity > tier.maxPerOrder) {
        throw new PurchaseError(
          `${tier.name} is limited to ${tier.maxPerOrder} per order.`,
          { code: 'OVER_LIMIT', tierId: tier.id }
        );
      }
      if (tier.salesStart && tier.salesStart > now) {
        throw new PurchaseError(`${tier.name} is not on sale yet.`, {
          code: 'NOT_OPEN',
          tierId: tier.id,
        });
      }
      if (tier.salesEnd && tier.salesEnd < now) {
        throw new PurchaseError(`${tier.name} has closed.`, {
          code: 'CLOSED',
          tierId: tier.id,
        });
      }

      // The price is the database's, not the browser's.
      totalCents += tier.priceCents * line.quantity;
    }

    // ---- the claim ------------------------------------------------------
    // One conditional UPDATE per tier. `updateMany` is what makes this atomic:
    // it compiles to an UPDATE ... WHERE, so the availability test happens
    // inside the same statement that takes the stock. `update` with a prior
    // read would reintroduce exactly the race this exists to close.
    for (const { line, tier } of resolved) {
      const claimed = await tx.ticketType.updateMany({
        where: {
          id: tier.id,
          sold: { lte: tier.quantity - line.quantity },
        },
        data: { sold: { increment: line.quantity } },
      });

      if (claimed.count === 0) {
        const remaining = tier.quantity - tier.sold;
        throw new PurchaseError(
          remaining <= 0
            ? `${tier.name} has sold out.`
            : `Only ${remaining} ${tier.name} ticket${remaining === 1 ? '' : 's'} left.`,
          { code: 'SOLD_OUT', tierId: tier.id }
        );
      }
    }

    // ---- the record -----------------------------------------------------
    const order = await tx.order.create({
      data: {
        reference: orderReference(),
        userId,
        eventId: event.id,
        // PENDING, not PAID. The gateway has not been called yet; see
        // markOrderPaid below for the other half.
        status: 'PENDING',
        method,
        totalCents,
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        buyerPhone: buyer.phone ?? null,
        items: {
          create: resolved.map(({ line, tier }) => ({
            ticketTypeId: line.ticketTypeId,
            quantity: line.quantity,
            // Snapshot. Repricing the tier later must not rewrite this.
            unitPriceCents: tier.priceCents,
          })),
        },
      },
      select: { id: true, reference: true, totalCents: true },
    });

    return { order, event };
  });
}

/**
 * The gateway said yes.
 *
 * Tickets are minted here rather than at checkout, because a scannable code
 * issued before payment lands is a free ticket. Stock was already claimed by
 * `purchaseTickets`, so this cannot fail on availability — it only turns a
 * paid order into the rows that get scanned at the door.
 *
 * Idempotent: a gateway that delivers its callback twice (they do) finds the
 * order already PAID and returns without minting a second set of tickets.
 */
export async function markOrderPaid(
  orderId: string,
  { gatewayRef }: { gatewayRef?: string | undefined } = {}
): Promise<Order> {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new PurchaseError('Unknown order.', { code: 'NO_ORDER' });
    if (order.status === 'PAID') return order;
    if (order.status !== 'PENDING') {
      throw new PurchaseError('That order can no longer be paid.', {
        code: 'NOT_PENDING',
      });
    }

    const buyerName = order.buyerName;
    const tickets = order.items.flatMap((item) =>
      Array.from({ length: item.quantity }, () => ({
        code: ticketCode(),
        orderId: order.id,
        eventId: order.eventId,
        ticketTypeId: item.ticketTypeId,
        holderName: buyerName,
      }))
    );

    await tx.ticket.createMany({ data: tickets });

    return tx.order.update({
      where: { id: order.id },
      data: { status: 'PAID', paidAt: new Date(), gatewayRef: gatewayRef ?? null },
    });
  });
}

/**
 * The gateway said no, or the buyer walked away.
 *
 * Releases the stock the pending order was holding. Without this, an abandoned
 * checkout silently retires those tickets: `sold` stays incremented and nobody
 * can ever buy them.
 */
export async function releaseOrder(
  orderId: string,
  status: 'CANCELLED' | 'FAILED' = 'CANCELLED'
): Promise<Order | null> {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order || order.status !== 'PENDING') return order;

    for (const item of order.items) {
      await tx.ticketType.update({
        where: { id: item.ticketTypeId },
        data: { sold: { decrement: item.quantity } },
      });
    }

    return tx.order.update({ where: { id: order.id }, data: { status } });
  });
}
