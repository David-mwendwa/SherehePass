'use client';

import { CreditCard, Smartphone, type LucideIcon } from 'lucide-react';

import type { PaymentMethod } from '@prisma/client';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import {
  checkoutAction,
  type CheckoutFields,
} from '@/app/events/[slug]/checkout/actions';
import { EMPTY_FORM_STATE, type FormState } from '@/lib/forms';
import { cn } from '@/lib/cn';
import { formatKes } from '@/lib/format';

export type CheckoutFormProps = {
  event: { id: string };
  lines: Array<{ id: string; quantity: number }>;
  user: { name: string; email: string; phone: string | null };
  totalCents: number;
};

export function CheckoutForm({
  event,
  lines,
  user,
  totalCents,
}: CheckoutFormProps) {
  const [state, formAction] = useActionState<
    FormState<CheckoutFields>,
    FormData
  >(checkoutAction, EMPTY_FORM_STATE);
  const [method, setMethod] = useState<PaymentMethod>('MPESA');
  const errors = state?.errors ?? {};
  const free = totalCents === 0;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="eventId" value={event.id} />
      {/* The selection travels as ids and quantities only. No prices: the
          server reads those from the ticket-type rows inside the purchase
          transaction, so a tampered form cannot set its own total. */}
      <input
        type="hidden"
        name="lines"
        value={lines.map((line) => `${line.id}:${line.quantity}`).join(',')}
      />
      <input type="hidden" name="method" value={free ? 'MPESA' : method} />

      {errors.form ? (
        <p
          role="alert"
          className="rounded-xl border border-danger-500/25 bg-danger-500/10 px-4 py-3 text-sm text-danger-400"
        >
          {errors.form[0]}
        </p>
      ) : null}

      <section className="surface p-6">
        <h2 className="mb-5 font-heading text-subhead">Who is going</h2>
        <div className="space-y-4">
          <Input
            label="Name on the tickets"
            name="name"
            defaultValue={user.name}
            autoComplete="name"
            required
            error={errors.name?.[0]}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            defaultValue={user.email}
            autoComplete="email"
            required
            hint="Your tickets are attached to your account; this is where the receipt goes."
            error={errors.email?.[0]}
          />
        </div>
      </section>

      {!free ? (
        <section className="surface p-6">
          <h2 className="mb-5 font-heading text-subhead">How you’ll pay</h2>

          <div
            role="radiogroup"
            aria-label="Payment method"
            className="grid gap-3 sm:grid-cols-2"
          >
            <MethodOption
              icon={Smartphone}
              title="M-Pesa"
              body="An STK push to your phone."
              selected={method === 'MPESA'}
              onSelect={() => setMethod('MPESA')}
            />
            <MethodOption
              icon={CreditCard}
              title="Card"
              body="Visa or Mastercard."
              selected={method === 'CARD'}
              onSelect={() => setMethod('CARD')}
            />
          </div>

          {method === 'MPESA' ? (
            <div className="mt-5">
              <Input
                label="M-Pesa number"
                name="phone"
                type="tel"
                inputMode="tel"
                defaultValue={user.phone ?? ''}
                autoComplete="tel"
                placeholder="0712345678"
                hint="The prompt goes to this number. It must be the phone you have on you."
                error={errors.phone?.[0]}
              />
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-white/10 bg-dark-950/50 px-4 py-3 text-sm text-dark-400">
              Card details are collected by the payment provider on the next
              screen. They never touch this server.
            </p>
          )}

          <p className="mt-5 border-t border-white/[0.06] pt-4 text-xs text-dark-500">
            Payments are simulated. No money moves, and no card or M-Pesa
            credentials are ever collected.
          </p>
        </section>
      ) : null}

      <SubmitButton totalCents={totalCents} free={free} />
    </form>
  );
}

function MethodOption({
  icon: Icon,
  title,
  body,
  selected,
  onSelect,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 text-left transition-all',
        selected
          ? 'border-primary-500/50 bg-primary-500/10'
          : 'border-white/10 bg-white/[0.03] hover:border-white/20'
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 h-5 w-5 shrink-0',
          selected ? 'text-primary-300' : 'text-dark-400'
        )}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-white">{title}</span>
        <span className="block text-xs text-dark-400">{body}</span>
      </span>
    </button>
  );
}

function SubmitButton({
  totalCents,
  free,
}: {
  totalCents: number;
  free: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="pay"
      size="lg"
      className="w-full justify-center"
      disabled={pending}
    >
      {pending
        ? 'Holding your tickets…'
        : free
          ? 'Reserve tickets'
          : `Pay ${formatKes(totalCents)}`}
    </Button>
  );
}
