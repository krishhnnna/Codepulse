/**
 * Reusable skeleton / shimmer loading primitives.
 * Usage:
 *   <Skeleton className="h-4 w-32" />            — single bar
 *   <Skeleton.Card>...</Skeleton.Card>            — card wrapper
 *   <Skeleton.Circle className="w-24 h-24" />    — avatar circle
 */

function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded bg-zinc-200 dark:bg-zinc-800 ${className}`}
    />
  );
}

Skeleton.Circle = function SkeletonCircle({ className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800 ${className}`}
    />
  );
};

Skeleton.Card = function SkeletonCard({ children, className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      {children}
    </div>
  );
};

/* ── Pre-built skeletons for dashboard sections ── */

export function ProfileCardSkeleton() {
  return (
    <div className="card lg:sticky lg:top-20 overflow-hidden">
      <div className="flex justify-center pt-8 pb-4">
        <Skeleton.Circle className="w-[120px] h-[120px]" />
      </div>
      <div className="text-center px-6 pb-4 space-y-2">
        <Skeleton className="h-6 w-36 mx-auto" />
        <Skeleton className="h-4 w-24 mx-auto" />
        <Skeleton className="h-3 w-48 mx-auto" />
      </div>
      <div className="px-6 pb-6 flex justify-center gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton.Circle key={i} className="w-8 h-8" />
        ))}
      </div>
      <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsOverviewSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-4 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function HeatmapSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton className="h-5 w-40" />
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: 52 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            {Array.from({ length: 7 }).map((_, j) => (
              <Skeleton key={j} className="w-[13px] h-[13px] rounded-sm" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContestGraphSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton className="h-5 w-44" />
      <Skeleton className="h-[260px] w-full rounded-lg" />
    </div>
  );
}

export function PlatformStatsSkeleton() {
  return (
    <div className="card p-5 space-y-4">
      <Skeleton className="h-5 w-32" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton.Circle className="w-5 h-5" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TopicStatsSkeleton() {
  return (
    <div className="card p-5 mt-5 space-y-3">
      <Skeleton className="h-5 w-28" />
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function UpcomingContestsSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton className="h-5 w-36" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton.Circle className="w-8 h-8" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
