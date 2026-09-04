import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { Role } from '@prisma/client';

/**
 * Session tokens.
 *
 * Split out from auth.js deliberately: this module touches no database and no
 * Node-only API, so `proxy.js` can import it to read a cookie without dragging
 * Prisma into the proxy bundle. auth.js is the half that talks to the database
 * and is server-components-only.
 *
 * `jose` rather than `jsonwebtoken` because it is built on Web Crypto, which
 * means the same verification code runs unchanged in every runtime Next.js
 * might execute it in.
 */

export const SESSION_COOKIE = 'sherehe_session';

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // one week

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Failing loudly beats signing with a fallback: a predictable secret is
    // the same as no authentication at all, and a silent default is the kind
    // of thing that reaches production.
    throw new Error('JWT_SECRET is not set.');
  }
  return new TextEncoder().encode(secret);
}

/** What this app puts in a token, and all it is ever allowed to read back. */
export type SessionClaims = JWTPayload & {
  sub: string;
  role: Role;
};

export async function signSession(payload: {
  sub: string;
  role: Role;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

/**
 * Returns the token's claims, or null. Never throws for an invalid token: an
 * expired or forged cookie is an ordinary "logged out", not an error, and the
 * callers all want to treat it that way.
 */
export async function verifySession(
  token: string | undefined
): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ['HS256'],
    });
    return payload as SessionClaims;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: MAX_AGE_SECONDS,
  // Only over HTTPS in production. Hard-coding `secure: true` would mean the
  // cookie is silently dropped on http://localhost and every login "succeeds"
  // while leaving you logged out.
  secure: process.env.NODE_ENV === 'production',
};
