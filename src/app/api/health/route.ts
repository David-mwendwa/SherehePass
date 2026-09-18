import { NextResponse } from 'next/server';

import { db } from '@/lib/db';

/**
 * The health check, and the only route handler in the app.
 *
 * Everything else here is a Server Component or a Server Action, so there is
 * no API surface to hang this off. It exists because Render needs a URL to
 * decide whether a deploy came up and whether a running instance is still
 * worth routing traffic to, and the alternative — pointing the check at `/` —
 * makes the home page's three database queries run on every probe.
 *
 * It checks Postgres rather than only answering 200. This app is a thin layer
 * over its database: with Postgres unreachable every page is a 500, so a
 * process that is technically alive is not usefully healthy, and reporting it
 * as healthy just means the failure shows up as errors for readers instead of
 * a red deploy. `SELECT 1` is the cheapest statement that proves a connection
 * was actually established rather than merely configured.
 */

// Never cached, and never prerendered at build time: a health check answering
// from a static file would report the state of the build, not the instance.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const startedAt = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;
  } catch (error) {
    // The message can carry the connection string, which has the password in
    // it. Log the real error where only the operator sees it and return a
    // fixed string, because this endpoint is public.
    console.error('health: database unreachable', error);

    return NextResponse.json(
      { status: 'unhealthy', database: 'unreachable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    {
      status: 'ok',
      database: 'reachable',
      latencyMs: Date.now() - startedAt,
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
