'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Waits for the gateway callback to land.
 *
 * Polling rather than a websocket: this is one page, watching one row, for a
 * few seconds. A socket server for that would be a lot of moving parts to save
 * three requests, and it is the wrong reach for the problem.
 *
 * `router.refresh()` re-runs the Server Component on the server and patches the
 * result into the existing tree — no full reload, no client-side copy of the
 * order state that could disagree with the database. The page renders the
 * order once, and this just asks for that render again.
 *
 * It gives up after 40 seconds. A poller that runs forever on a payment that
 * silently died is a tab quietly hammering the server all afternoon.
 */
const INTERVAL_MS = 2000;
const GIVE_UP_MS = 40_000;

export function OrderPoller() {
  const router = useRouter();

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - startedAt > GIVE_UP_MS) {
        clearInterval(timer);
        return;
      }
      router.refresh();
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, [router]);

  return null;
}
