import Link from 'next/link';
import { CalendarPlus } from 'lucide-react';

import { Badge, EVENT_TONE } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatEventDate, formatKes } from '@/lib/format';
import { cn } from '@/lib/cn';

import type { EventStatus } from '@prisma/client';

/**
 * The organiser's event list.
 *
 * A real `<table>`, not a stack of cards. The previous version gave every event
 * a padded panel with its own progress bar, which looked considered and meant
 * four events filled a laptop screen — on a dashboard whose entire job is
 * comparing events against each other. Sell-through is only useful next to the
 * other sell-throughs, and that comparison needs the rows aligned in a column.
 *
 * The table element is doing real work here beyond density: column headers are
 * associated with their cells, so a screen reader reading the sold figure says
 * which event and which column it belongs to. A grid of divs announces "412
 * slash 500" with no anchor at all.
 *
 * It scrolls sideways below `sm` rather than collapsing into cards. Reflowing a
 * table into stacked blocks throws away the alignment that is the reason for
 * the table, and this is a desktop tool that is occasionally checked on a phone
 * — not the other way round.
 */
export type OrganizerEventRow = {
  id: string;
  slug: string;
  title: string;
  status: EventStatus;
  startsAt: Date;
  venue: { name: string; county: string };
  ticketTypes: { quantity: number; sold: number; priceCents: number }[];
};

export function EventTable({
  title,
  events,
  emptyDescription,
  muted,
}: {
  title: string;
  events: OrganizerEventRow[];
  emptyDescription?: string;
  muted?: boolean;
}) {
  return (
    <section className="mt-10">
      <h2 className="eyebrow mb-3">{title}</h2>

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="Nothing scheduled"
          description={
            emptyDescription ??
            'Once you publish an event it shows here with its live sales.'
          }
          action={<Button href="/organizer/events/new">Create an event</Button>}
        />
      ) : (
        <div
          className={cn(
            'surface overflow-x-auto',
            muted && 'opacity-70 transition-opacity hover:opacity-100'
          )}
        >
          <table className="w-full min-w-[46rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                <Th className="w-[38%]">Event</Th>
                <Th>When</Th>
                <Th className="w-40">Sold</Th>
                <Th className="text-right">Gross</Th>
                <Th className="w-px whitespace-nowrap text-right">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const capacity = event.ticketTypes.reduce(
                  (sum, tier) => sum + tier.quantity,
                  0
                );
                const sold = event.ticketTypes.reduce(
                  (sum, tier) => sum + tier.sold,
                  0
                );
                // Face value of what has sold. Not the same as banked revenue,
                // which counts paid orders only — this is "what these seats are
                // worth", and the dashboard's Revenue stat is the money.
                const gross = event.ticketTypes.reduce(
                  (sum, tier) => sum + tier.sold * tier.priceCents,
                  0
                );
                const pct = capacity
                  ? Math.round((sold / capacity) * 100)
                  : 0;

                return (
                  <tr
                    key={event.id}
                    className="border-b border-white/[0.05] transition-colors last:border-0 hover:bg-white/[0.025]"
                  >
                    <Td>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/organizer/events/${event.id}`}
                          className="truncate font-medium text-white transition-colors hover:text-primary-300"
                        >
                          {event.title}
                        </Link>
                        {event.status !== 'PUBLISHED' ? (
                          <Badge tone={EVENT_TONE[event.status]}>
                            {event.status.toLowerCase()}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-dark-500">
                        {event.venue.name}, {event.venue.county}
                      </p>
                    </Td>

                    <Td className="whitespace-nowrap text-xs text-dark-400">
                      {formatEventDate(event.startsAt)}
                    </Td>

                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        {/* Tabular figures so the counts line up down the
                            column instead of drifting with digit widths. */}
                        <span className="shrink-0 font-mono text-xs tabular-nums text-dark-400">
                          {sold}/{capacity}
                        </span>
                      </div>
                    </Td>

                    <Td className="whitespace-nowrap text-right font-mono text-xs tabular-nums text-secondary-300">
                      {formatKes(gross)}
                    </Td>

                    <Td className="whitespace-nowrap text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          href={`/organizer/events/${event.id}`}
                          variant="ghost"
                          size="sm"
                        >
                          Manage
                          <span className="sr-only"> {event.title}</span>
                        </Button>
                        <Button
                          href={`/organizer/events/${event.id}/door`}
                          variant="secondary"
                          size="sm"
                        >
                          Door
                          <span className="sr-only"> for {event.title}</span>
                        </Button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-2.5 font-mono text-[0.6875rem] font-normal uppercase tracking-[0.14em] text-dark-500',
        className
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn('px-4 py-2.5 align-middle text-sm', className)}>
      {children}
    </td>
  );
}
