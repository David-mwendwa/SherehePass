import { LoadingAnnouncement, Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="container max-w-2xl py-14">
      <div className="flex flex-col items-center text-center">
        <Skeleton className="h-14 w-14 rounded-full" />
        <Skeleton className="mt-5 h-10 w-64" />
        <Skeleton className="mt-3 h-4 w-80" />
      </div>
      <Skeleton className="mt-10 h-56 rounded-2xl" />
      <LoadingAnnouncement>Checking your order</LoadingAnnouncement>
    </div>
  );
}
