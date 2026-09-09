import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { requireUser } from '@/lib/auth';
import { getEventBySlug } from '@/lib/events';
import { calendarParts, formatKes } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Checkout', robots: { index: false, follow: false } };

/**
 * The selection arrives in the querystring as "tierId:qty,tierId:qty".
 *
 * It is re-resolved against the database here rather than trusted: the tiers
 * must belong to this event, must still exist, and are priced from their rows.
 * A hand-edited URL therefore cannot invent a tier, borrow one from another
 * event, or set its own price — the worst it can do is ask for tickets that
 * are then checked again inside the purchase transaction.
 */
type RequestedLine = { ticketTypeId: string; quantity: number };

function parseLines(raw: unknown): RequestedLine[] {
  if (typeof raw !== 'string' || raw.length === 0) return [];
  return raw
    .split(',')
    .filter(Boolean)
    .flatMap<RequestedLine>((part) => {
      const [ticketTypeId, quantity] = part.split(':');
      if (!ticketTypeId || quantity === undefined) return [];
      return [{ ticketTypeId, quantity: Number(quantity) }];
    })
    .filter((line) => Number.isInteger(line.quantity) && line.quantity > 0);
}

export default async function CheckoutPage({
  params,
  searchParams,
}: PageProps<'/events/[slug]/checkout'>) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);

  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const user = await requireUser(`/events/${slug}/checkout?lines=${query.lines ?? ''}`);

  if (event.status !== 'PUBLISHED' || event.endsAt < new Date()) {
    redirect(`/events/${slug}`);
  }

  const requested = parseLines(query.lines);
  const tierById = new Map(event.ticketTypes.map((tier) => [tier.id, tier]));

  // `flatMap` returning [] rather than `.map(...).filter(Boolean)`: the filter
  // form drops the nulls at runtime but does not narrow the type, so every
  // reader below would still be handling a `| null` that cannot occur.
  const lines = requested.flatMap((line) => {
    const tier = tierById.get(line.ticketTypeId);
    if (!tier) return [];
    const remaining = Math.max(0, tier.quantity - tier.sold);
    // Clamped rather than rejected: if two of the four you picked went while
    // you were reading, showing two is more useful than an error page.
    const quantity = Math.min(line.quantity, remaining, tier.maxPerOrder);
    if (quantity < 1) return [];
    return [{ tier, quantity, subtotalCents: tier.priceCents * quantity }];
  });

  // Nothing survived — everything sold out, or the URL was nonsense.
  if (lines.length === 0) redirect(`/events/${slug}`);

  const totalCents = lines.reduce((sum, line) => sum + line.subtotalCents, 0);
  const totalTickets = lines.reduce((sum, line) => sum + line.quantity, 0);
  const trimmed = lines.some(
    (line, index) => line.quantity !== requested[index]?.quantity
  );
  const { month, day } = calendarParts(event.startsAt);

  return (
    <div className="container max-w-5xl py-10 sm:py-14">
      <Link
        href={`/events/${slug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-dark-400 transition-colors hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to {event.title}
      </Link>

      <h1 className="font-heading text-title">Checkout</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
        <CheckoutForm
          event={event}
          lines={lines.map((line) => ({
            id: line.tier.id,
            quantity: line.quantity,
          }))}
          user={user}
          totalCents={totalCents}
        />

        {/* ------------------------------------------------------- summary */}
        <aside className="surface overflow-hidden lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          <div className="relative h-32">
            <Image
              src={event.coverImage}
              alt=""
              fill
              sizes="360px"
              className="object-cover"
            />
            <div className="cover-scrim absolute inset-0" />
            <div className="absolute inset-x-4 bottom-3">
              <p className="font-mono text-[0.625rem] uppercase tracking-widest text-primary-300">
                {month} {day}
              </p>
              <h2 className="line-clamp-2 text-sm font-semibold text-white">
                {event.title}
              </h2>
            </div>
          </div>

          <div className="space-y-3 px-5 py-4">
            {lines.map((line) => (
              <div key={line.tier.id} className="flex justify-between gap-4 text-sm">
                <span className="min-w-0 text-dark-300">
                  <span className="font-mono text-dark-500">{line.quantity}×</span>{' '}
                  {line.tier.name}
                </span>
                <span className="shrink-0 font-mono text-dark-200">
                  {formatKes(line.subtotalCents)}
                </span>
              </div>
            ))}
          </div>

          {trimmed ? (
            <p className="mx-5 mb-4 rounded-lg border border-warning-500/25 bg-warning-500/10 px-3 py-2 text-xs text-warning-400">
              Some tiers sold out while you were choosing, so the quantities
              above have been reduced to what is left.
            </p>
          ) : null}

          <div className="flex items-baseline justify-between border-t border-white/[0.06] px-5 py-4">
            <span className="text-sm text-dark-400">
              {totalTickets} ticket{totalTickets === 1 ? '' : 's'}
            </span>
            <span className="font-mono text-xl font-bold text-secondary-300">
              {formatKes(totalCents)}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
