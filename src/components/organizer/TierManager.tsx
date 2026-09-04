'use client';

import { Plus } from 'lucide-react';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import type { TicketType } from '@prisma/client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { addTierAction } from '@/app/organizer/events/actions';
import { formatKes } from '@/lib/format';

/**
 * Tiers on a live event.
 *
 * Existing tiers are shown read-only with their sell-through. Editing them is
 * deliberately not offered: a tier with orders against it carries the price
 * people paid, and the database will refuse to drop its quantity below what
 * has already sold. Offering a control that would be rejected is worse than
 * not offering it, so the only write here is adding a new tier.
 */
export type TierManagerProps = {
  eventId: string;
  tiers: TicketType[];
};

export function TierManager({ eventId, tiers }: TierManagerProps) {
  const [adding, setAdding] = useState(false);
  const [state, formAction] = useActionState(
    addTierAction.bind(null, eventId),
    {}
  );
  const errors = state?.errors ?? {};

  return (
    <section className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
        <h2 className="font-heading text-lg font-bold">Ticket tiers</h2>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setAdding((v) => !v)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add tier
        </Button>
      </div>

      <div className="divide-y divide-white/[0.06]">
        {tiers.map((tier) => {
          const pct = tier.quantity
            ? Math.round((tier.sold / tier.quantity) * 100)
            : 0;
          return (
            <div key={tier.id} className="px-6 py-4">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-medium text-white">{tier.name}</span>
                <span className="font-mono text-sm text-secondary-300">
                  {formatKes(tier.priceCents)}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <span className="shrink-0 font-mono text-xs text-dark-400">
                  {tier.sold}/{tier.quantity}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {adding ? (
        <form
          action={formAction}
          className="space-y-4 border-t border-white/[0.06] bg-dark-950/40 p-6"
        >
          {errors.form ? (
            <p role="alert" className="text-sm text-danger-400">
              {errors.form[0]}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Name" name="name" required error={errors.name?.[0]} />
            <Input
              label="Price (KES)"
              name="priceKes"
              type="number"
              min="0"
              required
              error={errors.priceKes?.[0]}
            />
            <Input
              label="Quantity"
              name="quantity"
              type="number"
              min="1"
              required
              error={errors.quantity?.[0]}
            />
          </div>
          <Input label="Note (optional)" name="description" />
          <AddButton />
        </form>
      ) : null}
    </section>
  );
}

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Adding…' : 'Add tier'}
    </Button>
  );
}
