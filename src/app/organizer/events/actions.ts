'use server';

import type { EventCategory } from '@prisma/client';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireOrganizer } from '@/lib/auth';
import { fieldErrorsFrom, type FormState } from '@/lib/forms';
import { db } from '@/lib/db';

/**
 * Organiser writes.
 *
 * Every action re-derives the organiser from the session and scopes its query
 * by `organizerId`, rather than trusting the id in the form. A Server Action is
 * a public POST endpoint; "the form only offered your own events" is not a
 * control.
 */

// Spelled out rather than derived from Prisma's enum object, because `z.enum`
// needs a literal tuple. `satisfies` is what keeps it honest: adding a category
// to schema.prisma and not here is a type error, not a silently unusable option.
const CATEGORIES = [
  'MUSIC',
  'TECH',
  'SPORTS',
  'FOOD',
  'ARTS',
  'BUSINESS',
  'FESTIVAL',
  'COMMUNITY',
] as const satisfies readonly EventCategory[];

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
  minAge: z.coerce.number().int().min(0).max(99).nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']),
});

/** "sauti rooftop vol 9" → "sauti-rooftop-vol-9", uniqued against the table. */
async function uniqueSlug(title: string): Promise<string> {
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
function parseTiers(formData: FormData) {
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

function readEvent(formData: FormData) {
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

export type EventFormFields =
  | 'title'
  | 'summary'
  | 'description'
  | 'coverImage'
  | 'category'
  | 'venueId'
  | 'startsAt'
  | 'endsAt'
  | 'minAge'
  | 'status';

export async function createEventAction(
  _prevState: FormState<EventFormFields>,
  formData: FormData
): Promise<FormState<EventFormFields>> {
  const { organizer } = await requireOrganizer();

  const parsed = readEvent(formData);
  if (!parsed.success) {
    return { errors: fieldErrorsFrom<EventFormFields>(parsed.error) };
  }
  if (parsed.data.endsAt < parsed.data.startsAt) {
    return { errors: { endsAt: ['It cannot end before it starts.'] } };
  }

  // Validate every tier up front and keep only the parsed data, so the create
  // below works on a plain array of known-good values. Mapping over
  // `safeParse` results instead would leave `.data` optional at every use, and
  // the old JS version reached into `Object.values(...)[0][0]` to find a
  // message — three unchecked index lookups that would have thrown on a tier
  // whose only problem was a field the schema does not name.
  const tierResults = parseTiers(formData).map((tier) =>
    tierSchema.safeParse(tier)
  );

  const validTiers: z.infer<typeof tierSchema>[] = [];
  for (const result of tierResults) {
    if (!result.success) {
      const [firstMessage] = result.error.issues;
      return {
        errors: {
          form: [firstMessage?.message ?? 'That ticket tier is not valid.'],
        },
      };
    }
    validTiers.push(result.data);
  }

  if (validTiers.length === 0) {
    return { errors: { form: ['An event needs at least one ticket tier.'] } };
  }

  const event = await db.event.create({
    data: {
      ...parsed.data,
      slug: await uniqueSlug(parsed.data.title),
      organizerId: organizer.id,
      publishedAt: parsed.data.status === 'PUBLISHED' ? new Date() : null,
      ticketTypes: {
        create: validTiers.map((tier, index) => ({
          name: tier.name,
          description: tier.description || null,
          // KES in, cents stored. The form asks for shillings because that is
          // what an organiser thinks in; the column holds the smallest unit.
          priceCents: tier.priceKes * 100,
          quantity: tier.quantity,
          position: index,
        })),
      },
    },
  });

  revalidatePath('/organizer');
  redirect(`/organizer/events/${event.id}`);
}

export async function updateEventAction(
  eventId: string,
  _prevState: FormState<EventFormFields>,
  formData: FormData
): Promise<FormState<EventFormFields>> {
  const { organizer } = await requireOrganizer();

  const owned = await db.event.findFirst({
    where: { id: eventId, organizerId: organizer.id },
    select: { id: true, status: true, publishedAt: true },
  });
  if (!owned) return { errors: { form: ['That is not your event.'] } };

  const parsed = readEvent(formData);
  if (!parsed.success) {
    return { errors: fieldErrorsFrom<EventFormFields>(parsed.error) };
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
export type TierFields = 'name' | 'priceKes' | 'quantity' | 'description';

export async function addTierAction(
  eventId: string,
  _prevState: FormState<TierFields>,
  formData: FormData
): Promise<FormState<TierFields>> {
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
    return { errors: fieldErrorsFrom<TierFields>(parsed.error) };
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
