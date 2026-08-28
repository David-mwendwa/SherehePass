'use server';

import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { db } from '@/lib/db';
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from '@/lib/session';

/**
 * Authentication, as Server Actions.
 *
 * Server Actions are reachable by direct POST, not only through the form that
 * renders them, so each one validates its own input and trusts nothing about
 * how it was called. That is why the schemas live here rather than only in the
 * client component: client-side validation is a courtesy to the user, never a
 * control.
 */

const signUpSchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name.').max(80),
  email: z.string().trim().toLowerCase().email('That does not look like an email.'),
  password: z
    .string()
    .min(8, 'Passwords need at least 8 characters.')
    .max(200, 'That password is too long.'),
});

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email('That does not look like an email.'),
  password: z.string().min(1, 'Enter your password.'),
});

/**
 * `next` decides where a successful sign-in lands. It is user-controlled input
 * and is therefore restricted to same-site absolute paths: without this check,
 * `?next=https://evil.example` turns the sign-in page into an open redirect
 * that borrows this site's credibility. `//host` is rejected too — the browser
 * reads a protocol-relative URL as another origin.
 */
function safeRedirect(next) {
  if (typeof next !== 'string') return '/';
  if (!next.startsWith('/') || next.startsWith('//')) return '/';
  return next;
}

async function startSession(user) {
  const token = await signSession({ sub: user.id, role: user.role });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function signUpAction(_prevState, formData) {
  const parsed = signUpSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { errors: { email: ['An account with that email already exists.'] } };
  }

  const user = await db.user.create({
    data: {
      name,
      email,
      // Cost 10 rather than the default 12: this runs on a free-tier host where
      // 12 adds noticeable latency to every sign-in, and 10 is still far past
      // the point where an offline attack on a stolen dump is worth the effort.
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  await startSession(user);
  redirect(safeRedirect(formData.get('next')));
}

export async function signInAction(_prevState, formData) {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  // One message for "no such account" and "wrong password", and the hash is
  // compared even when there is no user, so the response time does not reveal
  // which emails are registered.
  const fallbackHash = '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
  const ok = await bcrypt.compare(
    parsed.data.password,
    user?.passwordHash ?? fallbackHash
  );

  if (!user || !ok) {
    return { errors: { form: ['That email and password do not match.'] } };
  }

  await startSession(user);
  redirect(safeRedirect(formData.get('next')));
}

export async function signOutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/');
}
