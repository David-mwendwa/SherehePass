import {
  LoadingAnnouncement,
  Skeleton,
  SkeletonEventGrid,
} from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="container py-10 sm:py-14">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <div className="flex-1">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="mt-2 h-4 w-40" />
        </div>
      </div>
      <SkeletonEventGrid count={4} className="mt-10" />
      <LoadingAnnouncement>Loading organiser</LoadingAnnouncement>
    </div>
  );
}
