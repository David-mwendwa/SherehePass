import {
  LoadingAnnouncement,
  Skeleton,
  SkeletonRows,
  SkeletonStats,
} from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="container py-10 sm:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-10 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>
      <div className="mt-8">
        <SkeletonStats />
      </div>
      <div className="mt-12">
        <Skeleton className="h-3 w-20" />
        <div className="mt-4">
          <SkeletonRows count={4} height="h-12" />
        </div>
      </div>
      <LoadingAnnouncement>Loading your dashboard</LoadingAnnouncement>
    </div>
  );
}
