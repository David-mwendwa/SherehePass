import { z } from 'zod';

/**
 * The shape every Server Action in this app returns to its form.
 *
 * `useActionState` threads one value between the action and the component, so
 * both ends need to agree on it. Declaring it once means a form cannot read
 * `state.error` when the action returns `state.errors`, which in plain JS was a
 * silent blank where a message should have been.
 *
 * `Fields` names the form's own inputs, so `errors.emial` is a type error
 * rather than an error message nobody ever sees. `form` is the extra key for
 * failures that belong to the submission as a whole rather than to one field —
 * "that email and password do not match", "sold out while you were choosing".
 */
export type FieldErrors<Fields extends string> = Partial<
  Record<Fields | 'form', string[]>
>;

export type FormState<Fields extends string = string> = {
  errors?: FieldErrors<Fields>;
  /** Set by actions that stay on the page after succeeding. */
  ok?: boolean;
  /**
   * A machine-readable reason, for the cases where the UI wants to react to
   * *which* failure rather than only print it — a sold-out checkout sending the
   * buyer back to the event, say. Distinct from the message in `errors.form`,
   * which is the sentence a person reads.
   */
  code?: string;
};

/** The initial value, so no call site has to remember it is `{}`. */
export const EMPTY_FORM_STATE: FormState = {};

/**
 * Zod's flattened field errors, narrowed to this form's own field names.
 *
 * `z.flattenError` returns `Record<string, string[]>` because a schema can
 * describe anything; the cast pins it to the fields the form actually renders.
 * Safe because the schema and the form are written together — and if they drift,
 * the form's own `errors.x` lookups are what fail.
 */
export function fieldErrorsFrom<Fields extends string>(
  error: z.ZodError
): FieldErrors<Fields> {
  return z.flattenError(error).fieldErrors as FieldErrors<Fields>;
}
