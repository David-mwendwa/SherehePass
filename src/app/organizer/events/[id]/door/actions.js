'use server';

import { requireOrganizer } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Admitting someone.
 *
 * The whole job is making a second scan of the same code fail. That is done
 * with a conditional UPDATE, the same shape as the oversell guard: the state
 * transition and its precondition are one statement, so two door staff
 * scanning the same ticket at two gates in the same second cannot both be told
 * "admit".
 *
 * Scoped to the organiser's own event, so a valid ticket for somebody else's
 * show is not admissible here.
 */
export async function checkInAction(eventId, rawCode) {
  const { organizer } = await requireOrganizer();

  const code = String(rawCode ?? '')
    .toUpperCase()
    // Codes are read off a screen and typed by hand as often as they are
    // scanned. Strip the display hyphens and any stray whitespace.
    .replace(/[^A-Z0-9]/g, '');

  if (!code) return { ok: false, status: 'EMPTY', message: 'Scan or type a code.' };

  const event = await db.event.findFirst({
    where: { id: eventId, organizerId: organizer.id },
    select: { id: true, title: true },
  });
  if (!event) {
    return { ok: false, status: 'FORBIDDEN', message: 'Not your event.' };
  }

  const ticket = await db.ticket.findUnique({
    where: { code },
    include: {
      ticketType: { select: { name: true } },
      event: { select: { id: true, title: true } },
    },
  });

  if (!ticket) {
    return { ok: false, status: 'UNKNOWN', message: 'No such ticket.' };
  }
  if (ticket.eventId !== event.id) {
    return {
      ok: false,
      status: 'WRONG_EVENT',
      message: `That ticket is for ${ticket.event.title}.`,
    };
  }
  if (ticket.status === 'VOID') {
    return { ok: false, status: 'VOID', message: 'This ticket was voided.' };
  }

  // The atomic bit. Only a ticket still marked VALID transitions, so the
  // second scan matches zero rows.
  const claimed = await db.ticket.updateMany({
    where: { id: ticket.id, status: 'VALID' },
    data: { status: 'CHECKED_IN', checkedInAt: new Date() },
  });

  if (claimed.count === 0) {
    const already = await db.ticket.findUnique({
      where: { id: ticket.id },
      select: { checkedInAt: true },
    });
    return {
      ok: false,
      status: 'ALREADY_IN',
      message: 'Already checked in.',
      holderName: ticket.holderName,
      tierName: ticket.ticketType.name,
      checkedInAt: already?.checkedInAt?.toISOString() ?? null,
    };
  }

  return {
    ok: true,
    status: 'ADMITTED',
    message: 'Admitted.',
    holderName: ticket.holderName,
    tierName: ticket.ticketType.name,
  };
}
