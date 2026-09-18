import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/**
 * A row of event cards: a snapping horizontal rail on a phone, an ordinary
 * grid from `sm` up.
 *
 * Stacked full-width, four "selling fast" cards and eight "coming soon" ones
 * ran the home page past nine thousand pixels on a 390px screen — most of a
 * catalogue nobody scrolls to the end of, and the sections below it
 * effectively unreachable. Sideways, the same four cards cost one screen and
 * the shape itself says there is more to the right.
 *
 * The negative margin is exactly the container's padding, so the rail bleeds
 * to both edges of the viewport while its first card still lines up with the
 * heading above it. `snap-start` is what stops a swipe leaving a card half cut
 * off at the edge.
 */
export function EventRail({
  children,
  columns = 4,
}: {
  children: ReactNode;
  /** How many columns the grid settles into on a wide screen. */
  columns?: 3 | 4;
}) {
  return (
    <div
      className={cn(
        // `scroll-pl-6` matters as much as the padding does: a snap point is
        // measured against the scrollport edge, not the padding edge, so
        // without it the first card snaps flush to the left of the screen and
        // the inset that lines it up with the heading is scrolled away the
        // moment anyone touches the rail.
        '-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 scroll-pl-6',
        'no-scrollbar sm:mx-0 sm:grid sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0',
        'sm:grid-cols-2',
        columns === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
      )}
    >
      {children}
    </div>
  );
}

/**
 * One cell of the rail. A fixed width while scrolling sideways, and nothing at
 * all once the parent becomes a grid and the track defines the width.
 */
export function EventRailItem({ children }: { children: ReactNode }) {
  return (
    <div className="w-[78vw] shrink-0 snap-start sm:w-auto">{children}</div>
  );
}
