import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { db } from '@/lib/db';
import { SESSION_COOKIE, verifySession } from '@/lib/session';

/**
 * Who is asking.
 *
 * Everything server-side reads identity through this module and never trusts a
 * user id passed in from a component, a form field or a URL. The cookie is the
 * only input; the row is re-read from the database on every request, so a role
 * change or a deleted account takes effect immediately rather than lasting
 * until a week-old token expires.
 *
 * Wrapped in React's `cache` so that a page, its layout and three components
 * all calling `getCurrentUser()` in one render share a single query.
 */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const claims = await verifySession(token);
  if (!claims?.sub) return null;

  return db.user.findUnique({
    where: { id: claims.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      phone: true,
      organizer: { select: { id: true, name: true, slug: true, verified: true } },
    },
  });
});

/**
 * For pages that cannot render at all without a user. Redirects rather than
 * returning null, so the caller can use the result without a null check and no
 * page can accidentally render a signed-out view of private data.
 *
 * `next` carries the original path so sign-in can return the visitor to where
 * they were headed instead of dumping them on the homepage.
 */
export async function requireUser(nextPath = '/') {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/signin?next=${encodeURIComponent(nextPath)}`);
  }
  return user;
}

/**
 * Role gate. ADMIN passes every check: an admin who cannot open an organiser
 * screen cannot support the organisers using it.
 */
export async function requireRole(roles, nextPath = '/') {
  const user = await requireUser(nextPath);
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (user.role !== 'ADMIN' && !allowed.includes(user.role)) {
    redirect('/');
  }
  return user;
}

/**
 * An organiser's own brand row, which is what every organiser screen scopes
 * its queries by. Returned separately from the user so a caller cannot forget
 * the scoping and list somebody else's events.
 */
export async function requireOrganizer(nextPath = '/organizer') {
  const user = await requireRole(['ORGANIZER'], nextPath);
  const organizer = await db.organizer.findUnique({
    where: { userId: user.id },
  });
  if (!organizer) redirect('/organizer/new');
  return { user, organizer };
}
