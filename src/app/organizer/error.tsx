'use client';

import { RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/Button';

/**
 * A segment-level boundary, so a failing dashboard query does not blank the
 * whole app. Next walks up to the nearest error.tsx, which means this one
 * catches anything under /organizer while the rest of the site stays usable —
 * and, importantly, the header and nav are still rendered, so there is a way
 * out of the failure that is not the back button.
 *
 * As in the root boundary, `error.message` is not rendered: in production Next
 * replaces it with a generic string anyway, and in development it is exactly
 * where a connection string ends up on screen. The digest is the useful half —
 * meaningless to the person reading it, and the key to the matching server log.
 */
export default function OrganizerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container py-20">
      <div className="surface mx-auto max-w-md p-8 text-center">
        <p className="eyebrow text-danger-400">Dashboard error</p>
        <h1 className="mt-3 text-section">Could not load that</h1>
        <p className="mt-3 text-sm leading-relaxed text-dark-400">
          Your events and sales are safe — this is the page failing to read
          them, not the data going missing.
        </p>
        {error?.digest ? (
          <p className="mt-4 font-mono text-xs text-dark-600">
            ref {error.digest}
          </p>
        ) : null}
        <div className="mt-7 flex justify-center gap-3">
          <Button onClick={reset}>
            <RotateCw className="h-4 w-4" />
            Try again
          </Button>
          <Button href="/organizer" variant="secondary">
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
