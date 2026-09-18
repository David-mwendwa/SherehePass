'use client';

import { useActionState, useId, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Check, Play, ShieldCheck, TriangleAlert, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { runDemoAction } from '@/app/engineering/actions';
import {
  EMPTY_DEMO_STATE,
  type AttemptOutcome,
  type DemoState,
} from '@/lib/oversell/contract';

/**
 * The live oversell demonstration.
 *
 * Everything here is presentation. The run itself happens in a Server Action
 * against the real database and the real `claimStock`, and this component only
 * renders what came back — which is why the numbers cannot be flattering: they
 * are read off the row after the fact, not computed here.
 */
export type OversellDemoProps = {
  limits: {
    maxAttempts: number;
    maxCapacity: number;
    defaultAttempts: number;
    defaultCapacity: number;
  };
};

export function OversellDemo({ limits }: OversellDemoProps) {
  const [state, formAction] = useActionState<DemoState, FormData>(
    runDemoAction,
    EMPTY_DEMO_STATE
  );
  const attemptsId = useId();
  const capacityId = useId();

  /**
   * Controlled, not `defaultValue`.
   *
   * `useActionState` re-renders the form when the action returns, and an
   * uncontrolled input snaps back to its default on that render — so after a
   * run with 8 tickets the field read 10 while the result beside it said 8.
   * Holding the values in state keeps the inputs agreeing with the numbers the
   * run was actually performed with.
   */
  const [attempts, setAttempts] = useState(limits.defaultAttempts);
  const [capacity, setCapacity] = useState(limits.defaultCapacity);

  return (
    <div className="surface overflow-hidden">
      <form action={formAction} className="border-b border-white/[0.06] p-5 sm:p-6">
        <div className="flex flex-wrap items-end gap-5">
          <NumberField
            id={attemptsId}
            name="attempts"
            label="Simultaneous buyers"
            value={attempts}
            onValueChange={setAttempts}
            min={2}
            max={limits.maxAttempts}
          />
          <NumberField
            id={capacityId}
            name="capacity"
            label="Tickets that exist"
            value={capacity}
            onValueChange={setCapacity}
            min={1}
            max={limits.maxCapacity}
          />
          <RunButton />
        </div>

        <p className="mt-4 text-xs leading-relaxed text-dark-500">
          Each buyer opens its own transaction and asks for one ticket. They are
          all started before any of them is awaited, so they genuinely overlap
          and contend for the same row lock.
        </p>
      </form>

      <div className="p-5 sm:p-6">
        {state.error ? (
          <p
            role="alert"
            className="rounded-xl border border-danger-500/25 bg-danger-500/10 px-4 py-3 text-sm text-danger-400"
          >
            {state.error}
          </p>
        ) : null}

        {state.run ? (
          <Result run={state.run} />
        ) : state.error ? null : (
          <p className="py-6 text-center text-sm text-dark-500">
            Press run. Nothing is precomputed: this opens real transactions
            against a sandbox ticket tier.
          </p>
        )}
      </div>
    </div>
  );
}

function RunButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? (
        'Running…'
      ) : (
        <>
          <Play className="h-4 w-4" aria-hidden="true" />
          Run it
        </>
      )}
    </Button>
  );
}

function NumberField({
  id,
  name,
  label,
  value,
  onValueChange,
  min,
  max,
}: {
  id: string;
  name: string;
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium text-dark-300"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="number"
        value={value}
        // Not clamped while typing: pinning the value on every keystroke makes
        // the field impossible to clear and to retype. `min`/`max` let the
        // browser object on submit, and the server clamps regardless — that is
        // the control, these are the courtesy.
        onChange={(event) => onValueChange(Number(event.target.value))}
        min={min}
        max={max}
        className="h-11 w-28 rounded-xl border border-white/10 bg-dark-900/80 px-3 font-mono text-sm tabular-nums text-white focus:border-primary-500/60 focus:ring-0"
      />
      <p className="mt-1 font-mono text-[0.6875rem] text-dark-600">
        max {max}
      </p>
    </div>
  );
}

function Result({ run }: { run: NonNullable<DemoState['run']> }) {
  const oversold = run.finalSold - run.capacity;

  return (
    <div>
      {/* The verdict. Assertive rather than polite: this is the answer to the
          thing the visitor just pressed a button to find out, and it replaces
          the previous run's answer. */}
      <div
        role="status"
        aria-live="assertive"
        className={cn(
          'flex items-start gap-3 rounded-xl border px-4 py-3.5',
          run.held
            ? 'border-success-500/25 bg-success-500/[0.07]'
            : 'border-danger-500/30 bg-danger-500/10'
        )}
      >
        {run.held ? (
          <ShieldCheck
            className="mt-0.5 h-5 w-5 shrink-0 text-success-400"
            aria-hidden="true"
          />
        ) : (
          <TriangleAlert
            className="mt-0.5 h-5 w-5 shrink-0 text-danger-400"
            aria-hidden="true"
          />
        )}
        <div>
          <p
            className={cn(
              'font-medium',
              run.held ? 'text-success-400' : 'text-danger-400'
            )}
          >
            {run.held
              ? `${run.attempts} buyers, ${run.capacity} tickets, ${run.finalSold} sold.`
              : `Invariant broken: ${oversold} ticket${oversold === 1 ? '' : 's'} oversold.`}
          </p>
          <p className="mt-1 text-sm text-dark-300">
            {run.held
              ? `${run.refused} were refused. The counter never exceeded capacity, and it agrees exactly with the number of transactions that were told they had succeeded.`
              : 'The database sold more tickets than exist. This should be impossible; if you are seeing it, the guarantee has regressed.'}
          </p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Sold" value={run.finalSold} tone="success" />
        <Metric label="Capacity" value={run.capacity} />
        <Metric label="Refused" value={run.refused} />
        <Metric label="Wall clock" value={`${run.totalMs}ms`} />
      </dl>

      <h3 className="eyebrow mb-3 mt-7">Every attempt</h3>
      <ol className="flex flex-wrap gap-1.5">
        {run.outcomes.map((outcome) => (
          <Attempt key={outcome.index} outcome={outcome} />
        ))}
      </ol>

      <p className="mt-4 text-xs leading-relaxed text-dark-500">
        Refused transactions are not errors. They are the guarantee working.
        Each one rolled back in full, so no order, no ticket and no counter
        movement survived it.
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: 'success';
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3">
      <dt className="eyebrow">{label}</dt>
      <dd
        className={cn(
          'mt-1.5 font-mono text-xl font-semibold tabular-nums',
          tone === 'success' ? 'text-secondary-300' : 'text-white'
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Attempt({ outcome }: { outcome: AttemptOutcome }) {
  const description = outcome.claimed
    ? `Buyer ${outcome.index} got a ticket in ${outcome.ms} milliseconds`
    : `Buyer ${outcome.index} was refused after ${outcome.ms} milliseconds`;

  return (
    <li
      // The tooltip is a title, and the same sentence is available to a screen
      // reader as the item's label — a colour-coded square with a number in it
      // says nothing on its own.
      title={description}
      aria-label={description}
      className={cn(
        'flex h-9 w-9 flex-col items-center justify-center rounded-lg border font-mono text-[0.625rem] tabular-nums',
        outcome.claimed
          ? 'border-secondary-400/30 bg-secondary-400/10 text-secondary-300'
          : 'border-white/[0.08] bg-white/[0.02] text-dark-500'
      )}
    >
      {outcome.claimed ? (
        <Check className="h-3 w-3" aria-hidden="true" />
      ) : (
        <X className="h-3 w-3" aria-hidden="true" />
      )}
      <span aria-hidden="true">{outcome.index}</span>
    </li>
  );
}
