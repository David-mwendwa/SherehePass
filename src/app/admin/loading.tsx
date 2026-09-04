import {
  LoadingAnnouncement,
  Skeleton,
  SkeletonRows,
  SkeletonStats,
} from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="container py-10 sm:py-14">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="mt-3 h-4 w-72" />
      <div className="mt-8">
        <SkeletonStats />
      </div>
      <div className="mt-12">
        <Skeleton className="h-3 w-24" />
        <div className="mt-4">
          <SkeletonRows count={6} height="h-12" />
        </div>
      </div>
      <LoadingAnnouncement>Loading admin overview</LoadingAnnouncement>
    </div>
  );
}
