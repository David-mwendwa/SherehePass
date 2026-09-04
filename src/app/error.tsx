'use client';

import { Button } from '@/components/ui/Button';

/**
 * The error boundary is required to be a Client Component — it has to attach
 * a reset handler, which only runs in the browser.
 *
 * `error.message` is deliberately not rendered. In production Next.js replaces
 * it with a generic string anyway, and showing whatever it holds is how a
 * database hostname or a query fragment ends up on a stranger's screen. The
 * digest is shown instead: it is meaningless to a visitor and it is exactly
 * what someone needs to find the matching server log.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="relative flex min-h-[60vh] items-center justify-center px-6 text-center">
      <div className="bloom" />
      <div className="relative">
        <p className="font-mono text-sm text-danger-400">Something broke</p>
        <h1 className="mt-3 font-heading text-title">
          That did not work
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-dark-400">
          The page failed to load. Trying again often fixes it; if it does not,
          it is on us rather than on you.
        </p>
        {error?.digest ? (
          <p className="mt-4 font-mono text-xs text-dark-600">
            ref {error.digest}
          </p>
        ) : null}
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button href="/" variant="secondary">
            Home
          </Button>
        </div>
      </div>
    </div>
  );
}
