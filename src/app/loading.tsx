import {
  LoadingAnnouncement,
  Skeleton,
  SkeletonEventGrid,
} from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="bloom" />
        <div className="container relative py-20 sm:py-28">
          <div className="max-w-3xl">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="mt-5 h-16 w-full max-w-xl sm:h-20" />
            <Skeleton className="mt-3 h-16 w-4/5 max-w-lg sm:h-20" />
            <Skeleton className="mt-7 h-5 w-full max-w-md" />
            <Skeleton className="mt-9 h-14 max-w-xl rounded-2xl" />
            <div className="mt-6 flex flex-wrap gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-24 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container pt-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-8 w-72" />
        <SkeletonEventGrid count={4} className="mt-8" />
      </section>

      <LoadingAnnouncement>Loading events</LoadingAnnouncement>
    </>
  );
}
