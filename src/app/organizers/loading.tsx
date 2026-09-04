import {
  LoadingAnnouncement,
  Skeleton,
  SkeletonPageHeader,
} from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="container py-10 sm:py-14">
      <SkeletonPageHeader />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
      <LoadingAnnouncement>Loading organisers</LoadingAnnouncement>
    </div>
  );
}
