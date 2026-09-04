'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import {
  signInAction,
  signUpAction,
  type SignInFields,
  type SignUpFields,
} from '@/app/(auth)/actions';
import { EMPTY_FORM_STATE, type FormState } from '@/lib/forms';

/**
 * `useActionState` wires the Server Action's returned errors straight back into
 * the form. Nothing here fetches: the browser posts to the action and React
 * hands back whatever it returned.
 *
 * `useFormStatus` has to read from a child of the <form>, which is why the
 * submit button is its own component rather than inlined — that is the API's
 * constraint, not a preference.
 */
export type AuthFormProps = {
  mode: 'signin' | 'signup';
  next?: string | undefined;
};

export function AuthForm({ mode, next }: AuthFormProps) {
  const isSignUp = mode === 'signup';
  // One union covers both modes: the two actions differ only in whether they
  // carry a `name` field, and the form already branches on `isSignUp`.
  const [state, formAction] = useActionState<
    FormState<SignUpFields | SignInFields>,
    FormData
  >(isSignUp ? signUpAction : signInAction, EMPTY_FORM_STATE);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="surface space-y-5 p-6 sm:p-8">
      {/* Carried through the form so a successful submit returns the visitor to
          wherever they were headed. Validated server-side against off-site
          redirects — see safeRedirect in the actions file. */}
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {errors.form ? (
        <p
          role="alert"
          className="rounded-xl border border-danger-500/25 bg-danger-500/10 px-4 py-3 text-sm text-danger-400"
        >
          {errors.form[0]}
        </p>
      ) : null}

      {isSignUp ? (
        <Input
          label="Name"
          name="name"
          autoComplete="name"
          required
          placeholder="Amina Otieno"
          error={errors.name?.[0]}
        />
      ) : null}

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
        error={errors.email?.[0]}
      />

      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete={isSignUp ? 'new-password' : 'current-password'}
        required
        placeholder="••••••••"
        hint={isSignUp ? 'At least 8 characters.' : undefined}
        error={errors.password?.[0]}
      />

      <SubmitButton label={isSignUp ? 'Create account' : 'Sign in'} />

      {!isSignUp ? <DemoLogins /> : null}
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      className="w-full justify-center"
      disabled={pending}
    >
      {pending ? 'One moment…' : label}
    </Button>
  );
}

/**
 * Fill buttons for the seeded accounts. A portfolio project that asks a
 * recruiter to invent credentials before it will show them anything has
 * already lost them, so the three roles are one click each.
 */
type Demo = { label: string; email: string; password: string };

const DEMOS: Demo[] = [
  { label: 'Attendee', email: 'demo@sherehepass.ke', password: 'demo12345' },
  {
    label: 'Organiser',
    email: 'wanjiru@sauti.co.ke',
    password: 'organizer12345',
  },
  { label: 'Admin', email: 'admin@sherehepass.ke', password: 'admin12345' },
];

function DemoLogins() {
  function fill(demo: Demo) {
    const form = document.querySelector('form');
    if (!form) return;

    // These inputs are uncontrolled, so a plain `.value =` would submit fine
    // today. The native setter plus an input event is what keeps that true if
    // one of them ever gains a `value` prop: React tracks its own value, and a
    // direct assignment to a controlled input is invisible to it — the field
    // would look filled and submit empty.
    const setValue = (name: string, value: string) => {
      const input = form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      setter?.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };

    setValue('email', demo.email);
    setValue('password', demo.password);
  }

  return (
    <div className="border-t border-white/[0.06] pt-5">
      <p className="mb-3 text-center text-xs text-dark-500">
        Or try a demo account
      </p>
      <div className="grid grid-cols-3 gap-2">
        {DEMOS.map((demo) => (
          <button
            key={demo.label}
            type="button"
            onClick={() => fill(demo)}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-xs text-dark-300 transition-colors hover:border-primary-500/40 hover:text-white"
          >
            {demo.label}
          </button>
        ))}
      </div>
    </div>
  );
}
