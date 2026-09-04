import { cn } from '@/lib/cn';

/**
 * Loading placeholders.
 *
 * A `loading.tsx` file wraps its route in a Suspense boundary automatically, so
 * the shell — header, footer, page title — paints immediately and only the part
 * waiting on the database is replaced by these. That is the reason to prefer
 * them over a spinner: a spinner says "something is happening somewhere", a
 * skeleton says "the thing you asked for is arriving, and it will be shaped
 * like this".
 *
 * Which is also the rule for using them. A skeleton that does not match the
 * layout it stands in for is worse than none, because the page visibly
 * rearranges itself the moment the data lands. Each block below mirrors the
 * real component's proportions — the card aspect ratio, the row height, the
 * number of items in a grid.
 *
 * The whole tree is `aria-hidden` and each route's `loading.tsx` carries one
 * screen-reader sentence instead. Announcing forty grey rectangles individually
 * is noise; "Loading events" is the information.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg', className)} aria-hidden="true" />;
}

/** Title plus standfirst, matching the header every page opens with. */
export function SkeletonPageHeader({ wide }: { wide?: boolean }) {
  return (
    <div aria-hidden="true">
      <Skeleton className={cn('h-10', wide ? 'w-80' : 'w-56')} />
      <Skeleton className="mt-3 h-4 w-64" />
    </div>
  );
}

/** One event card: cover, title, two lines of meta, price row. */
export function SkeletonEventCard() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/[0.07]"
      aria-hidden="true"
    >
      <div className="skeleton aspect-[4/3]" />
      <div className="space-y-2.5 p-5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-14" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonEventGrid({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className
      )}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <SkeletonEventCard key={i} />
      ))}
    </div>
  );
}

/** The four-across stat strip on the organiser and admin dashboards. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="surface p-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-7 w-28" />
        </div>
      ))}
    </div>
  );
}

/** Dense list rows — the organiser tables, the ticket list. */
export function SkeletonRows({
  count = 5,
  height = 'h-14',
}: {
  count?: number;
  height?: string;
}) {
  return (
    <div className="surface divide-y divide-white/[0.05]" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn('flex items-center gap-4 px-4', height)}>
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24 shrink-0" />
          <Skeleton className="h-4 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * The one visible announcement per loading route. Assertive would interrupt
 * whatever a screen reader is reading to say a page is loading, which is the
 * definition of not urgent.
 */
export function LoadingAnnouncement({ children }: { children: string }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {children}
    </span>
  );
}
