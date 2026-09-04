import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import {
  CATEGORY_LABELS,
  calendarParts,
  formatTime,
  priceRangeLabel,
} from '@/lib/format';
import { remainingFor, type EventCard } from '@/lib/events';

/**
 * The event card, in three sizes that share one component so a card never
 * drifts between the home page and the browse grid.
 *
 *   default — the grid card
 *   feature — the wide editorial row on the home page
 *   compact — the small row used in "related" and organiser lists
 *
 * The date sits in a calendar chip rather than in the metadata line, because
 * scanning a grid of events is a date-first activity: the question is "what is
 * on Saturday", not "what is this called".
 */
export type EventCardProps = {
  event: EventCard;
  variant?: 'default' | 'feature' | 'compact';
  priority?: boolean;
};

export function EventCard({
  event,
  variant = 'default',
  priority = false,
}: EventCardProps) {
  const { month, day, weekday } = calendarParts(event.startsAt);
  const remaining = remainingFor(event.ticketTypes);
  const soldOut = remaining <= 0;
  const scarce = !soldOut && remaining <= 25;
  const price = priceRangeLabel(event.ticketTypes);

  if (variant === 'compact') {
    return (
      <Link
        href={`/events/${event.slug}`}
        className="surface surface-hover group flex gap-4 p-3"
      >
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
          <Image
            src={event.coverImage}
            alt=""
            fill
            sizes="80px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <div className="min-w-0 flex-1 py-0.5">
          <p className="eyebrow mb-1">
            {weekday} {day} {month}
          </p>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white">
            {event.title}
          </h3>
          <p className="mt-1 truncate text-xs text-dark-400">
            {event.venue.name}, {event.venue.county}
          </p>
        </div>
      </Link>
    );
  }

  const feature = variant === 'feature';

  return (
    <Link
      href={`/events/${event.slug}`}
      className={cn(
        'group relative block overflow-hidden rounded-2xl border border-white/[0.07] bg-dark-900 transition-all duration-300 hover:border-white/[0.16] hover:shadow-card-hover',
        feature ? 'sm:flex sm:items-stretch' : ''
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden',
          feature ? 'aspect-[16/10] sm:aspect-auto sm:w-[46%]' : 'aspect-[4/3]'
        )}
      >
        <Image
          src={event.coverImage}
          alt=""
          fill
          priority={priority}
          sizes={
            feature
              ? '(max-width: 640px) 100vw, 46vw'
              : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
          }
          className={cn(
            'object-cover transition-transform duration-700 group-hover:scale-[1.04]',
            soldOut && 'grayscale'
          )}
        />
        <div className="cover-scrim absolute inset-0" />

        {/* Calendar chip. Absolute over the image so the date is readable
            before the eye reaches the title. */}
        <div className="absolute left-3 top-3 flex w-14 flex-col items-center rounded-xl border border-white/15 bg-dark-950/75 py-1.5 backdrop-blur-md">
          <span className="font-mono text-[0.625rem] uppercase tracking-widest text-primary-300">
            {month}
          </span>
          <span className="font-heading text-xl font-bold leading-none text-white">
            {day}
          </span>
        </div>

        <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
          {soldOut ? (
            <Badge tone="onCover">Sold out</Badge>
          ) : scarce ? (
            <Badge tone="onCover">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-400" />
              {remaining} left
            </Badge>
          ) : null}
        </div>

        {!feature ? (
          <div className="absolute inset-x-3 bottom-3">
            <Badge tone="onCover">{CATEGORY_LABELS[event.category]}</Badge>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          'flex flex-col p-5',
          feature ? 'justify-center gap-3 sm:w-[54%] sm:p-8' : 'gap-2'
        )}
      >
        {feature ? (
          <p className="eyebrow">
            {CATEGORY_LABELS[event.category]} · {weekday} {day} {month},{' '}
            {formatTime(event.startsAt)}
          </p>
        ) : null}

        <h3
          className={cn(
            'font-semibold leading-tight text-white',
            feature ? 'text-2xl sm:text-3xl' : 'line-clamp-2 text-base'
          )}
        >
          {event.title}
        </h3>

        <p
          className={cn(
            'text-dark-400',
            feature ? 'text-base leading-relaxed' : 'line-clamp-2 text-sm'
          )}
        >
          {event.summary}
        </p>

        <div
          className={cn(
            'mt-auto flex items-center gap-3 text-sm',
            feature ? 'pt-2' : 'pt-1'
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5 text-dark-400">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{event.venue.name}</span>
          </span>
          <span
            className={cn(
              'ml-auto shrink-0 font-mono text-sm font-medium',
              soldOut ? 'text-dark-500' : 'text-secondary-300'
            )}
          >
            {soldOut ? '—' : price}
          </span>
        </div>
      </div>
    </Link>
  );
}
