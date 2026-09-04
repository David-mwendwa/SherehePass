import { LoadingAnnouncement, Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div>
      {/* The cover is the tallest thing on the page and the first thing that
          moves if the placeholder is the wrong height, so it matches the real
          hero rather than standing in as a generic bar. */}
      <div className="skeleton h-[52vh] min-h-[22rem] w-full" aria-hidden="true" />

      <div className="container grid gap-10 py-10 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="mt-8 h-64 w-full rounded-2xl" />
        </div>

        <Skeleton className="h-96 rounded-2xl" />
      </div>

      <LoadingAnnouncement>Loading event</LoadingAnnouncement>
    </div>
  );
}
