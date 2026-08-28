'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireOrganizer } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Organiser writes.
 *
 * Every action re-derives the organiser from the session and scopes its query
 * by `organizerId`, rather than trusting the id in the form. A Server Action is
 * a public POST endpoint; "the form only offered your own events" is not a
 * control.
 */

const CATEGORIES = [
  'MUSIC', 'TECH', 'SPORTS', 'FOOD', 'ARTS', 'BUSINESS', 'FESTIVAL', 'COMMUNITY',
];

const tierSchema = z.object({
  name: z.string().trim().min(1, 'Name the tier.').max(60),
  priceKes: z.coerce.number().int().min(0, 'Price cannot be negative.'),
  quantity: z.coerce.number().int().min(1, 'A tier needs at least one ticket.'),
  description: z.string().trim().max(200).optional().or(z.literal('')),
});

const eventSchema = z.object({
  title: z.string().trim().min(3, 'Give it a title.').max(140),
  summary: z.string().trim().min(10, 'One line about it.').max(240),
  description: z.string().trim().min(20, 'Tell people what to expect.').max(6000),
  coverImage: z.url('That is not a valid image URL.'),
  category: z.enum(CATEGORIES),
  venueId: z.string().min(1, 'Pick a venue.'),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  minAge: z.coerce.number().int().min(0).max(99).optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']),
});

/** "sauti rooftop vol 9" → "sauti-rooftop-vol-9", uniqued against the table. */
async function uniqueSlug(title) {
  const base =
    title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'event';

  let slug = base;
  let n = 2;
  // Loops rather than appending a random suffix unconditionally, so the common
  // case gets the clean URL and only genuine collisions get "-2".
  while (await db.event.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

/** Tiers arrive as repeated fields: tierName[], tierPrice[], tierQuantity[]. */
function parseTiers(formData) {
  const names = formData.getAll('tierName');
  const prices = formData.getAll('tierPrice');
  const quantities = formData.getAll('tierQuantity');
  const descriptions = formData.getAll('tierDescription');

  return names
    .map((name, index) => ({
      name,
      priceKes: prices[index],
      quantity: quantities[index],
      description: descriptions[index] ?? '',
    }))
    .filter((row) => String(row.name).trim().length > 0);
}

function readEvent(formData) {
  return eventSchema.safeParse({
    title: formData.get('title'),
    summary: formData.get('summary'),
    description: formData.get('description'),
    coverImage: formData.get('coverImage'),
    category: formData.get('category'),
    venueId: formData.get('venueId'),
    startsAt: formData.get('startsAt'),
    endsAt: formData.get('endsAt'),
    minAge: formData.get('minAge') || null,
    status: formData.get('status'),
  });
}

export async function createEventAction(_prevState, formData) {
  const { organizer } = await requireOrganizer();

  const parsed = readEvent(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  if (parsed.data.endsAt < parsed.data.startsAt) {
    return { errors: { endsAt: ['It cannot end before it starts.'] } };
  }

  const tiers = parseTiers(formData).map((tier) => tierSchema.safeParse(tier));
  const badTier = tiers.find((result) => !result.success);
  if (badTier) {
    return { errors: { form: [Object.values(z.flattenError(badTier.error).fieldErrors)[0][0]] } };
  }
  if (tiers.length === 0) {
    return { errors: { form: ['An event needs at least one ticket tier.'] } };
  }

  const event = await db.event.create({
    data: {
      ...parsed.data,
      slug: await uniqueSlug(parsed.data.title),
      organizerId: organizer.id,
      publishedAt: parsed.data.status === 'PUBLISHED' ? new Date() : null,
      ticketTypes: {
        create: tiers.map((result, index) => ({
          name: result.data.name,
          description: result.data.description || null,
          // KES in, cents stored. The form asks for shillings because that is
          // what an organiser thinks in; the column holds the smallest unit.
          priceCents: result.data.priceKes * 100,
          quantity: result.data.quantity,
          position: index,
        })),
      },
    },
  });

  revalidatePath('/organizer');
  redirect(`/organizer/events/${event.id}`);
}

export async function updateEventAction(eventId, _prevState, formData) {
  const { organizer } = await requireOrganizer();

  const owned = await db.event.findFirst({
    where: { id: eventId, organizerId: organizer.id },
    select: { id: true, status: true, publishedAt: true },
  });
  if (!owned) return { errors: { form: ['That is not your event.'] } };

  const parsed = readEvent(formData);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }
  if (parsed.data.endsAt < parsed.data.startsAt) {
    return { errors: { endsAt: ['It cannot end before it starts.'] } };
  }

  await db.event.update({
    where: { id: owned.id },
    data: {
      ...parsed.data,
      // Stamped once, on the first publish, and never moved afterwards.
      publishedAt:
        parsed.data.status === 'PUBLISHED'
          ? (owned.publishedAt ?? new Date())
          : owned.publishedAt,
    },
  });

  revalidatePath('/organizer');
  revalidatePath(`/organizer/events/${owned.id}`);
  return { ok: true };
}

/**
 * Adding a tier to a live event. Tiers are added rather than replaced, because
 * an existing tier has orders pointing at it and deleting it would take the
 * record of what people paid with it.
 */
export async function addTierAction(eventId, _prevState, formData) {
  const { organizer } = await requireOrganizer();

  const owned = await db.event.findFirst({
    where: { id: eventId, organizerId: organizer.id },
    select: { id: true, _count: { select: { ticketTypes: true } } },
  });
  if (!owned) return { errors: { form: ['That is not your event.'] } };

  const parsed = tierSchema.safeParse({
    name: formData.get('name'),
    priceKes: formData.get('priceKes'),
    quantity: formData.get('quantity'),
    description: formData.get('description') ?? '',
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  await db.ticketType.create({
    data: {
      eventId: owned.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      priceCents: parsed.data.priceKes * 100,
      quantity: parsed.data.quantity,
      position: owned._count.ticketTypes,
    },
  });

  revalidatePath(`/organizer/events/${owned.id}`);
  return { ok: true };
}
