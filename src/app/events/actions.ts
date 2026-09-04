'use server';

import { revalidatePath } from 'next/cache';

import { getCurrentUser } from '@/lib/auth';
import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';

/**
 * Saving an event.
 *
 * The identity comes from the session cookie, never from an argument. A Server
 * Action is a POST endpoint that anyone can call directly, so `userId` as a
 * parameter would let one account fill another's saved list.
 */
export type ToggleSaveResult =
  | { ok: false; error: 'signed-out' }
  | { ok: true; saved: boolean };

export async function toggleSaveAction(
  eventId: string
): Promise<ToggleSaveResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'signed-out' };

  const key = { userId_eventId: { userId: user.id, eventId } };
  const existing = await db.savedEvent.findUnique({ where: key });

  if (existing) {
    await db.savedEvent.delete({ where: key });
  } else {
    // `create` inside a try rather than an upsert: two rapid clicks can race,
    // and a duplicate-key error here means the row already exists, which is
    // the state we wanted anyway.
    try {
      await db.savedEvent.create({ data: { userId: user.id, eventId } });
    } catch (error) {
      // P2002 is the unique-constraint violation: the row this was about to
      // create already exists, which is the state we wanted anyway.
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }
    }
  }

  revalidatePath('/saved');
  return { ok: true, saved: !existing };
}
