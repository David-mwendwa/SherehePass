'use server';

import { DEMO_LIMITS, type DemoState } from '@/lib/oversell/contract';
import { runOversellDemo } from '@/lib/oversell/run';

/**
 * The button on /engineering.
 *
 * A Server Action rather than a route handler because it is a mutation invoked
 * by a form, which is exactly what actions are for — and because it keeps the
 * demo's numbers on the server, where the browser cannot suggest them.
 *
 * This is an unauthenticated endpoint that opens up to two dozen database
 * transactions, so it is deliberately bounded in three ways: the counts are
 * clamped in `runOversellDemo`, there is a global cooldown below, and the work
 * is confined to a sandbox tier that no real sale touches.
 *
 * Nothing but the action is exported from here, and that is a hard constraint
 * rather than a preference: a `'use server'` module may export only async
 * functions. `DemoState` and its initial value live in `oversell/contract.ts`
 * for that reason — see the note there.
 */

/**
 * One global cooldown, not per-visitor.
 *
 * Per-IP would be the right shape for real rate limiting, and this is not that
 * — it is a guard on a portfolio demo. Deliberately the crude version: module
 * state resets on redeploy and is per-instance, which is fine for something
 * whose worst case is a slow page, and the honest alternative (Redis, a token
 * bucket keyed by IP) is a dependency this project does not otherwise need.
 */
const COOLDOWN_MS = 1200;
let lastRunAt = 0;

export async function runDemoAction(
  _prevState: DemoState,
  formData: FormData
): Promise<DemoState> {
  const now = Date.now();
  if (now - lastRunAt < COOLDOWN_MS) {
    return { error: 'One run at a time. Give it a second.' };
  }
  lastRunAt = now;

  const attempts = Number(formData.get('attempts'));
  const capacity = Number(formData.get('capacity'));

  try {
    const run = await runOversellDemo({
      attempts: Number.isFinite(attempts) ? attempts : DEMO_LIMITS.defaultAttempts,
      capacity: Number.isFinite(capacity) ? capacity : DEMO_LIMITS.defaultCapacity,
    });
    return { run };
  } catch (error) {
    // The message is shown, because on this page the failure is the content:
    // if the sandbox cannot be built the visitor should be told why rather
    // than watching a button do nothing.
    return {
      error:
        error instanceof Error
          ? error.message
          : 'The run could not be started.',
    };
  }
}
