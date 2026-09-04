import {
  LoadingAnnouncement,
  Skeleton,
  SkeletonPageHeader,
} from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="container max-w-3xl py-10 sm:py-14">
      <SkeletonPageHeader />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mt-8 h-64 rounded-2xl" />
      <LoadingAnnouncement>Loading your account</LoadingAnnouncement>
    </div>
  );
}
