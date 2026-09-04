import { LoadingAnnouncement, Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="container max-w-5xl py-10 sm:py-14">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-6 h-10 w-48" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-6">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <LoadingAnnouncement>Loading checkout</LoadingAnnouncement>
    </div>
  );
}
