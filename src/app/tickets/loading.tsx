import {
  LoadingAnnouncement,
  Skeleton,
  SkeletonPageHeader,
} from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="container max-w-4xl py-10 sm:py-14">
      <SkeletonPageHeader />
      {/* Ticket stubs are tall and perforated rather than list rows, so the
          placeholder is too — otherwise the page grows by 200px per ticket
          the moment the query returns. */}
      <div className="mt-10 space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
      <LoadingAnnouncement>Loading your tickets</LoadingAnnouncement>
    </div>
  );
}
