'use client';

import { useId } from 'react';

import { cn } from '@/lib/cn';

/**
 * Form controls.
 *
 * The label is always rendered and always tied to the control by a generated
 * id — no placeholder-as-label, which disappears the moment someone types and
 * leaves them guessing what the field was.
 *
 * `error` renders under the field AND sets `aria-invalid` + `aria-describedby`,
 * so the message is announced rather than only being pink.
 */
export function Field({ label, error, hint, className, children, htmlFor }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-dark-200"
        >
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-sm text-danger-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-dark-400">{hint}</p>
      ) : null}
    </div>
  );
}

const controlClasses =
  'w-full rounded-xl border border-white/10 bg-dark-900/80 px-3.5 py-2.5 text-sm text-white placeholder:text-dark-500 transition-colors focus:border-primary-500/60 focus:bg-dark-900 focus:ring-0 focus-visible:ring-2';

export function Input({ label, error, hint, className, ...props }) {
  const generated = useId();
  const id = props.id ?? generated;
  const errorId = `${id}-error`;

  return (
    <Field label={label} error={error} hint={hint} htmlFor={id}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          controlClasses,
          error && 'border-danger-500/60',
          className
        )}
        {...props}
      />
      {error ? (
        <span id={errorId} className="sr-only">
          {error}
        </span>
      ) : null}
    </Field>
  );
}

export function Textarea({ label, error, hint, className, ...props }) {
  const generated = useId();
  const id = props.id ?? generated;

  return (
    <Field label={label} error={error} hint={hint} htmlFor={id}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(
          controlClasses,
          'min-h-28 resize-y leading-relaxed',
          error && 'border-danger-500/60',
          className
        )}
        {...props}
      />
    </Field>
  );
}

export function Select({ label, error, hint, className, children, ...props }) {
  const generated = useId();
  const id = props.id ?? generated;

  return (
    <Field label={label} error={error} hint={hint} htmlFor={id}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(
          controlClasses,
          'appearance-none bg-[length:1rem] bg-[right_0.85rem_center] bg-no-repeat pr-10',
          // Chevron as a data URI so the control needs no extra element and no
          // network request.
          "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23808095' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
          error && 'border-danger-500/60',
          className
        )}
        {...props}
      >
        {children}
      </select>
    </Field>
  );
}
