'use server';

import bcrypt from 'bcryptjs';
import type { Role } from '@prisma/client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { db } from '@/lib/db';
import {
  fieldErrorsFrom,
  type FormState,
} from '@/lib/forms';
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
function safeRedirect(next: FormDataEntryValue | null | undefined): string {
  if (typeof next !== 'string') return '/';
  if (!next.startsWith('/') || next.startsWith('//')) return '/';
  return next;
}

/**
 * Where each role lands when nothing else was asked for.
 *
 * An admin signing in wants the console, not the attendee's home page; an
 * organiser wants their events. Only used when there is no `next` — a reader
 * bounced here from a protected route still goes back to the page they wanted,
 * which is the more specific intent.
 */
const LANDING_BY_ROLE: Record<Role, string> = {
  ADMIN: '/admin',
  ORGANIZER: '/organizer',
  ATTENDEE: '/',
};

function destinationFor(
  role: Role,
  next: FormDataEntryValue | null | undefined
): string {
  return typeof next === 'string' && next ? safeRedirect(next) : LANDING_BY_ROLE[role];
}

async function startSession(user: { id: string; role: Role }): Promise<void> {
  const token = await signSession({ sub: user.id, role: user.role });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

export type SignUpFields = 'name' | 'email' | 'password';

export async function signUpAction(
  _prevState: FormState<SignUpFields>,
  formData: FormData
): Promise<FormState<SignUpFields>> {
  const parsed = signUpSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { errors: fieldErrorsFrom<SignUpFields>(parsed.error) };
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
  redirect(destinationFor(user.role, formData.get('next')));
}

export type SignInFields = 'email' | 'password';

export async function signInAction(
  _prevState: FormState<SignInFields>,
  formData: FormData
): Promise<FormState<SignInFields>> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { errors: fieldErrorsFrom<SignInFields>(parsed.error) };
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
  redirect(destinationFor(user.role, formData.get('next')));
}

export async function signOutAction(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/');
}
