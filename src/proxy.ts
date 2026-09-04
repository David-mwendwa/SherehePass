import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_COOKIE, verifySession } from '@/lib/session';

/**
 * Next 16 renamed `middleware` to `proxy`. Same position in the request
 * lifecycle, clearer name: it runs at the network boundary, before routing.
 *
 * This is a *cheap* gate, not the security boundary. It only checks that a
 * signed cookie is present and well-formed, so a signed-out visitor is bounced
 * to sign-in without paying for a render. The real authorisation — is this
 * person an organiser, do they own this event — happens in the page itself,
 * against the database, every time. A proxy check can be skipped by any route
 * that forgets to match the matcher below; a `requireOrganizer()` inside the
 * page cannot be.
 */
const PROTECTED = ['/tickets', '/saved', '/account', '/organizer', '/admin', '/orders'];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!PROTECTED.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const claims = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value
  );

  if (!claims) {
    const signin = new URL('/signin', request.url);
    signin.searchParams.set('next', pathname + search);
    return NextResponse.redirect(signin);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/tickets/:path*', '/saved/:path*', '/account/:path*', '/organizer/:path*', '/admin/:path*', '/orders/:path*'],
};
