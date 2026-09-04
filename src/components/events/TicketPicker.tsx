'use client';

import { useRouter } from 'next/navigation';
import { Minus, Plus, Ticket } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { TicketType } from '@prisma/client';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { formatKes } from '@/lib/format';

/**
 * Choosing tickets.
 *
 * The running total is computed here for feedback, and computed again on the
 * server inside the purchase transaction, which is the one that counts. This
 * number is a courtesy; it is never trusted.
 *
 * Each tier's cap is the smaller of what is left and the per-order limit, so
 * the stepper physically cannot ask for more than exists — a form that lets
 * you select 20 of the 6 remaining only to reject it at checkout is a worse
 * experience than one that stops at 6.
 */
export type TicketPickerProps = {
  event: { id: string; slug: string; title: string };
  ticketTypes: TicketType[];
  disabled: boolean;
  disabledReason: string;
  signedIn: boolean;
};

export function TicketPicker({
  event,
  ticketTypes,
  disabled,
  disabledReason,
  signedIn,
}: TicketPickerProps) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const rows = useMemo(
    () =>
      ticketTypes.map((tier) => {
        const remaining = Math.max(0, tier.quantity - tier.sold);
        return {
          ...tier,
          remaining,
          max: Math.min(remaining, tier.maxPerOrder),
          soldOut: remaining === 0,
        };
      }),
    [ticketTypes]
  );

  const totalCents = rows.reduce(
    (sum, tier) => sum + tier.priceCents * (quantities[tier.id] ?? 0),
    0
  );
  const totalTickets = Object.values(quantities).reduce((a, b) => a + b, 0);
  const allSoldOut = rows.every((tier) => tier.soldOut);

  /**
   * Takes a delta and resolves it against the *current* state, rather than
   * taking a finished value computed from a captured one. Two clicks landing
   * in the same React batch both read the same stale `value` otherwise, and
   * the second one overwrites the first with the same number — so a fast
   * double-click on "+" moves the count by one instead of two.
   */
  function adjust(tierId: string, delta: number, max: number): void {
    setQuantities((current) => {
      const next = Math.min(max, Math.max(0, (current[tierId] ?? 0) + delta));
      return { ...current, [tierId]: next };
    });
  }

  function checkout() {
    const lines = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([id, quantity]) => `${id}:${quantity}`)
      .join(',');

    const target = `/events/${event.slug}/checkout?lines=${encodeURIComponent(lines)}`;
    // A signed-out visitor is sent to sign in with the checkout as the return
    // path, so their selection survives the detour instead of being dropped.
    router.push(
      signedIn ? target : `/signin?next=${encodeURIComponent(target)}`
    );
  }

  return (
    <div className="surface overflow-hidden">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <h2 className="flex items-center gap-2 font-heading text-subhead">
          <Ticket className="h-4 w-4 text-primary-400" />
          Tickets
        </h2>
      </div>

      <div className="divide-y divide-white/[0.06]">
        {rows.map((tier) => (
          <div key={tier.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3
                  className={cn(
                    'font-medium',
                    tier.soldOut ? 'text-dark-500 line-through' : 'text-white'
                  )}
                >
                  {tier.name}
                </h3>
                {tier.description ? (
                  <p className="mt-1 text-xs leading-relaxed text-dark-400">
                    {tier.description}
                  </p>
                ) : null}
                {!tier.soldOut && tier.remaining <= 25 ? (
                  <p className="mt-1.5 font-mono text-xs text-primary-400">
                    {tier.remaining} left
                  </p>
                ) : null}
              </div>
              <span
                className={cn(
                  'shrink-0 font-mono text-sm font-medium',
                  tier.soldOut ? 'text-dark-600' : 'text-secondary-300'
                )}
              >
                {formatKes(tier.priceCents)}
              </span>
            </div>

            <div className="mt-3">
              {tier.soldOut ? (
                <span className="text-xs text-dark-500">Sold out</span>
              ) : (
                <Stepper
                  value={quantities[tier.id] ?? 0}
                  max={tier.max}
                  disabled={disabled}
                  label={tier.name}
                  onAdjust={(delta) => adjust(tier.id, delta, tier.max)}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/[0.06] bg-dark-950/50 px-5 py-4">
        {disabled ? (
          <p className="text-center text-sm text-dark-400">{disabledReason}</p>
        ) : allSoldOut ? (
          <p className="text-center text-sm text-dark-400">
            Every tier has sold out.
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-baseline justify-between">
              <span className="text-sm text-dark-400">
                {totalTickets === 0
                  ? 'No tickets selected'
                  : `${totalTickets} ticket${totalTickets === 1 ? '' : 's'}`}
              </span>
              {/* `formatKes(0)` is "Free", which is right on a ticket tier and
                  wrong on an empty basket — nothing selected is not a free
                  ticket. The zero-total case only says Free once something is
                  actually in the basket. */}
              <span className="font-mono text-lg font-semibold text-white">
                {totalTickets === 0 ? '—' : formatKes(totalCents)}
              </span>
            </div>
            <Button
              variant="pay"
              size="lg"
              className="w-full justify-center"
              disabled={totalTickets === 0}
              onClick={checkout}
            >
              {totalCents === 0 && totalTickets > 0
                ? 'Reserve free tickets'
                : 'Get tickets'}
            </Button>
            <p className="mt-2.5 text-center text-xs text-dark-500">
              No booking fee. Prices include VAT.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

type StepperProps = {
  value: number;
  max: number;
  disabled: boolean;
  label: string;
  onAdjust: (delta: number) => void;
};

function Stepper({ value, max, disabled, label, onAdjust }: StepperProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label={`One fewer ${label} ticket`}
        disabled={disabled || value === 0}
        onClick={() => onAdjust(-1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-dark-300 transition-colors hover:border-white/25 hover:text-white disabled:pointer-events-none disabled:opacity-35"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>

      {/* The visible number is hidden from assistive tech and announced by the
          live region beside it instead. A live region containing only the digit
          announces "2", which does not say two of what — and with several tiers
          on the page, that is the only part that matters. */}
      <span
        aria-hidden="true"
        className="w-6 text-center font-mono text-sm text-white"
      >
        {value}
      </span>
      <span aria-live="polite" className="sr-only">
        {value === 0
          ? `No ${label} tickets selected`
          : `${value} ${label} ticket${value === 1 ? '' : 's'} selected`}
      </span>

      <button
        type="button"
        aria-label={`One more ${label} ticket`}
        disabled={disabled || value >= max}
        onClick={() => onAdjust(1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-dark-300 transition-colors hover:border-white/25 hover:text-white disabled:pointer-events-none disabled:opacity-35"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      {value >= max ? (
        <span className="text-xs text-dark-500">max {max}</span>
      ) : null}
    </div>
  );
}
