/**
 * The skeleton the browse page shows while its query runs.
 *
 * `loading.js` wraps the route in a Suspense boundary automatically, so the
 * shell — header, heading, filters — paints immediately and only the grid
 * waits. The card count and proportions match the real grid, so nothing jumps
 * when the data lands.
 */
export default function Loading() {
  return (
    <div className="container py-10 sm:py-14">
      <div className="skeleton h-9 w-48 rounded-lg" />
      <div className="skeleton mt-3 h-5 w-32 rounded" />
      <div className="skeleton mt-8 h-14 max-w-2xl rounded-2xl" />

      <div className="mt-6 flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-8 w-24 rounded-full" />
        ))}
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-white/[0.07]">
            <div className="skeleton aspect-[4/3]" />
            <div className="space-y-2 p-5">
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-2/3 rounded" />
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">Loading events…</span>
    </div>
  );
}
