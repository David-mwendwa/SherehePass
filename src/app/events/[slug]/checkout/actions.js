'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireUser } from '@/lib/auth';
import { PurchaseError, purchaseTickets } from '@/lib/purchase';
import { requestPayment } from '@/lib/payments';

/**
 * Checkout.
 *
 * The browser sends which tiers and how many. It does not send prices, and it
 * does not send a total — those are read from the database inside the
 * transaction. Anything a client can edit, a client will edit.
 */

const checkoutSchema = z.object({
  eventId: z.string().min(1),
  method: z.enum(['MPESA', 'CARD']),
  name: z.string().trim().min(2, 'Who are the tickets for?').max(80),
  email: z.string().trim().toLowerCase().email('We need a valid email.'),
  phone: z
    .string()
    .trim()
    // Kenyan mobile numbers, in the three forms people actually type them:
    // 0712345678, 254712345678, +254712345678.
    .regex(/^(\+?254|0)7\d{8}$/, 'Use a Kenyan number, e.g. 0712345678.')
    .optional()
    .or(z.literal('')),
  lines: z.string().min(1, 'Choose at least one ticket.'),
});

/** "id:2,id:1" → [{ ticketTypeId, quantity }] */
function parseLines(raw) {
  return raw
    .split(',')
    .filter(Boolean)
    .map((part) => {
      const [ticketTypeId, quantity] = part.split(':');
      return { ticketTypeId, quantity: Number(quantity) };
    })
    .filter((line) => line.ticketTypeId && Number.isInteger(line.quantity));
}

export async function checkoutAction(_prevState, formData) {
  const user = await requireUser('/events');

  const parsed = checkoutSchema.safeParse({
    eventId: formData.get('eventId'),
    method: formData.get('method'),
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone') ?? '',
    lines: formData.get('lines'),
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { eventId, method, name, email, phone, lines } = parsed.data;

  if (method === 'MPESA' && !phone) {
    return { errors: { phone: ['M-Pesa needs the number to send the prompt to.'] } };
  }

  let result;
  try {
    result = await purchaseTickets({
      userId: user.id,
      eventId,
      lines: parseLines(lines),
      method,
      buyer: { name, email, phone },
    });
  } catch (error) {
    if (error instanceof PurchaseError) {
      // A sold-out message has to reach the buyer as a sentence, not a 500.
      // This is the common case, not an exceptional one: someone else got
      // there first.
      return { errors: { form: [error.message] }, code: error.code };
    }
    throw error;
  }

  // The gateway call happens after the stock is claimed, so a slow gateway
  // cannot let someone else take the tickets mid-payment.
  await requestPayment({ order: result.order, method, phone });

  // `redirect` throws by design; it must be outside the try above or the catch
  // would swallow it and the buyer would sit on the checkout page forever.
  redirect(`/orders/${result.order.reference}`);
}
