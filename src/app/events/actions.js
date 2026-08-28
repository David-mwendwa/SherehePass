'use server';

import { revalidatePath } from 'next/cache';

import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Saving an event.
 *
 * The identity comes from the session cookie, never from an argument. A Server
 * Action is a POST endpoint that anyone can call directly, so `userId` as a
 * parameter would let one account fill another's saved list.
 */
export async function toggleSaveAction(eventId) {
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
      if (error?.code !== 'P2002') throw error;
    }
  }

  revalidatePath('/saved');
  return { ok: true, saved: !existing };
}
