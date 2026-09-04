import {
  LoadingAnnouncement,
  Skeleton,
  SkeletonEventGrid,
  SkeletonPageHeader,
} from '@/components/ui/Skeleton';

/**
 * The skeleton the browse page shows while its query runs.
 *
 * `loading.tsx` wraps the route in a Suspense boundary automatically, so the
 * shell — header, footer — paints immediately and only the grid waits. The card
 * count and proportions come from the shared skeleton kit so they match the
 * real grid, and stay matching when the grid changes.
 */
export default function Loading() {
  return (
    <div className="container py-10 sm:py-14">
      <SkeletonPageHeader />

      <Skeleton className="mt-8 h-14 max-w-2xl rounded-2xl" />

      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      <SkeletonEventGrid count={8} className="mt-10" />

      <LoadingAnnouncement>Loading events</LoadingAnnouncement>
    </div>
  );
}
