/**
 * The shared vocabulary of the /engineering demonstration: the shapes that
 * cross the network, and the bounds on what may be asked for.
 *
 * Split from `run.ts` because that file imports the database and is marked
 * `server-only`, and the browser needs these. A type-only import would have
 * been erased safely, but `EMPTY_DEMO_STATE` is a real value the client reads,
 * and importing it from the server module would drag Prisma toward the client
 * bundle.
 *
 * The immediate cause was narrower and worth writing down: these lived in the
 * action file, and a `'use server'` module may export **nothing but async
 * functions**. Exporting a plain object from one fails at module evaluation
 * with "a 'use server' file can only export async functions, found object" —
 * which surfaces as a console error in the browser and a button that silently
 * does nothing, not as a build failure. `src/lib/forms.ts` exists for exactly
 * this reason and this is the same split.
 */

/** Kept small: this is a public button that opens database transactions. */
export const DEMO_LIMITS = {
  maxAttempts: 24,
  maxCapacity: 12,
  defaultAttempts: 20,
  defaultCapacity: 10,
} as const;

export type AttemptOutcome = {
  /** 1-based, in the order they were started. */
  index: number;
  claimed: boolean;
  /** How long that transaction took, milliseconds. */
  ms: number;
  /** Only when refused: what the loser was told was left. */
  remaining?: number;
};

export type DemoRun = {
  attempts: number;
  capacity: number;
  outcomes: AttemptOutcome[];
  claimed: number;
  refused: number;
  /** `sold` read back from the row after everything settled. */
  finalSold: number;
  /** The whole batch, wall-clock. */
  totalMs: number;
  /**
   * The invariant, checked rather than asserted. If this is ever false the page
   * says so in red — a demo that can only report success is a picture.
   */
  held: boolean;
};

/** What the Server Action hands back to `useActionState`. */
export type DemoState = {
  run?: DemoRun;
  error?: string;
};

export const EMPTY_DEMO_STATE: DemoState = {};
