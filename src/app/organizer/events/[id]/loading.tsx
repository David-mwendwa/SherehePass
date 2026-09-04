import { LoadingAnnouncement, Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="container max-w-3xl py-10 sm:py-14">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-6 h-10 w-80" />
      <Skeleton className="mt-2 h-4 w-32" />
      <Skeleton className="mt-8 h-56 rounded-2xl" />
      <Skeleton className="mt-10 h-[32rem] rounded-2xl" />
      <LoadingAnnouncement>Loading event</LoadingAnnouncement>
    </div>
  );
}
