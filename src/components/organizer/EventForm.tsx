'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useActionState, useState } from 'react';

import type { Event, Venue } from '@prisma/client';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Field';
import {
  createEventAction,
  updateEventAction,
  type EventFormFields,
} from '@/app/organizer/events/actions';
import { EMPTY_FORM_STATE, type FormState } from '@/lib/forms';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/format';

/**
 * Create and edit share one form.
 *
 * Tiers are only editable at creation. On an existing event they are managed
 * separately, because a tier that has sold tickets cannot be freely rewritten:
 * changing its price would misrepresent what buyers paid, and lowering its
 * quantity below `sold` is a state the database will refuse outright. The form
 * reflects that rather than offering a control that would fail.
 */
export type EventFormProps = {
  /** Absent when creating. Its presence is what switches the form to edit mode. */
  event?: Event | undefined;
  venues: Venue[];
};

/** One tier row in the create form, before it has been submitted. */
type DraftTier = {
  key: number;
  name: string;
  priceKes: string;
  quantity: string;
  description: string;
};

export function EventForm({ event, venues }: EventFormProps) {
  const editing = Boolean(event);
  const [state, formAction] = useActionState<
    FormState<EventFormFields>,
    FormData
  >(
    // `event` is non-null whenever `editing` is true, but the compiler cannot
    // see that through the boolean, so the check is on the value itself.
    event ? updateEventAction.bind(null, event.id) : createEventAction,
    EMPTY_FORM_STATE
  );
  const errors = state?.errors ?? {};

  const [tiers, setTiers] = useState<DraftTier[]>([
    { key: 1, name: 'General', priceKes: '', quantity: '', description: '' },
  ]);

  return (
    <form action={formAction} className="space-y-6">
      {errors.form ? (
        <p
          role="alert"
          className="rounded-xl border border-danger-500/25 bg-danger-500/10 px-4 py-3 text-sm text-danger-400"
        >
          {errors.form[0]}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="rounded-xl border border-success-500/25 bg-success-500/10 px-4 py-3 text-sm text-success-400">
          Saved.
        </p>
      ) : null}

      <section className="surface space-y-4 p-6">
        <h2 className="font-heading text-subhead">The event</h2>

        <Input
          label="Title"
          name="title"
          defaultValue={event?.title}
          required
          error={errors.title?.[0]}
        />
        <Input
          label="One-line summary"
          name="summary"
          defaultValue={event?.summary}
          required
          hint="Shown on cards and in search results. Make it the interesting bit."
          error={errors.summary?.[0]}
        />
        <Textarea
          label="Description"
          name="description"
          defaultValue={event?.description}
          required
          rows={10}
          hint="Blank lines become paragraphs. Plain text only — no HTML."
          error={errors.description?.[0]}
        />
        <Input
          label="Cover image URL"
          name="coverImage"
          type="url"
          defaultValue={event?.coverImage}
          required
          hint="Must be an images.unsplash.com URL in this build."
          error={errors.coverImage?.[0]}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Category"
            name="category"
            defaultValue={event?.category ?? 'MUSIC'}
            error={errors.category?.[0]}
          >
            {CATEGORY_ORDER.map((key) => (
              <option key={key} value={key}>
                {CATEGORY_LABELS[key]}
              </option>
            ))}
          </Select>
          <Select
            label="Venue"
            name="venueId"
            defaultValue={event?.venueId}
            error={errors.venueId?.[0]}
          >
            <option value="">Choose a venue…</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name} — {venue.county}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Starts"
            name="startsAt"
            type="datetime-local"
            defaultValue={toLocalInput(event?.startsAt)}
            required
            error={errors.startsAt?.[0]}
          />
          <Input
            label="Ends"
            name="endsAt"
            type="datetime-local"
            defaultValue={toLocalInput(event?.endsAt)}
            required
            error={errors.endsAt?.[0]}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Minimum age"
            name="minAge"
            type="number"
            min="0"
            max="99"
            defaultValue={event?.minAge ?? ''}
            hint="Leave blank if all ages are welcome."
            error={errors.minAge?.[0]}
          />
          <Select
            label="Status"
            name="status"
            defaultValue={event?.status ?? 'DRAFT'}
            hint="Drafts are invisible to everyone but you."
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>
      </section>

      {!editing ? (
        <section className="surface space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-subhead">Ticket tiers</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setTiers((rows) => [
                  ...rows,
                  { key: Date.now(), name: '', priceKes: '', quantity: '', description: '' },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              Add tier
            </Button>
          </div>

          <div className="space-y-4">
            {tiers.map((tier, index) => (
              <div
                key={tier.key}
                className="rounded-xl border border-white/[0.07] bg-dark-950/40 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="eyebrow">Tier {index + 1}</span>
                  {tiers.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setTiers((rows) => rows.filter((r) => r.key !== tier.key))
                      }
                      className="text-dark-500 transition-colors hover:text-danger-400"
                      aria-label={`Remove tier ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Input label="Name" name="tierName" defaultValue={tier.name} required />
                  <Input
                    label="Price (KES)"
                    name="tierPrice"
                    type="number"
                    min="0"
                    defaultValue={tier.priceKes}
                    required
                    hint="0 for free"
                  />
                  <Input
                    label="Quantity"
                    name="tierQuantity"
                    type="number"
                    min="1"
                    defaultValue={tier.quantity}
                    required
                  />
                </div>
                <div className="mt-3">
                  <Input
                    label="Note (optional)"
                    name="tierDescription"
                    defaultValue={tier.description}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <SubmitButton editing={editing} />
    </form>
  );
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? 'Saving…' : editing ? 'Save changes' : 'Create event'}
    </Button>
  );
}

/**
 * `datetime-local` wants "YYYY-MM-DDTHH:mm" in the *viewer's* zone.
 * `toISOString()` would give UTC and silently shift every time by three hours
 * in Nairobi, so the offset is subtracted first.
 */
function toLocalInput(date: Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
