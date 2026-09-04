import { CalendarX } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export const metadata = { title: 'Event not found' };

/**
 * Specific to an event URL, rather than falling through to the site-wide 404.
 * The two cases that land here — a mistyped slug and an event an organiser has
 * unpublished — look identical to the visitor, and in both the useful next step
 * is the same: the rest of what is on.
 */
export default function EventNotFound() {
  return (
    <div className="container max-w-xl py-24">
      <EmptyState
        icon={CalendarX}
        title="That event is not on sale"
        description="It has either finished, been taken down by the organiser, or never existed at this address."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button href="/events">Browse what’s on</Button>
            <Button href="/" variant="secondary">
              Home
            </Button>
          </div>
        }
      />
    </div>
  );
}
