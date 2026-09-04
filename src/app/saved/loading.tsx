import {
  LoadingAnnouncement,
  SkeletonEventGrid,
  SkeletonPageHeader,
} from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="container py-10 sm:py-14">
      <SkeletonPageHeader />
      <SkeletonEventGrid count={4} className="mt-10" />
      <LoadingAnnouncement>Loading saved events</LoadingAnnouncement>
    </div>
  );
}
