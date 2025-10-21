// components/shared/ArticleCardSkeleton.tsx
'use client';

export function ArticleCardSkeleton() {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl backdrop-blur-xl bg-white/5 dark:bg-black/20 border border-white/10 dark:border-white/5 animate-pulse">
      {/* Image skeleton */}
      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-white/10 via-white/5 to-transparent">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skeleton-shimmer" />
      </div>

      {/* Content skeleton */}
      <div className="flex flex-1 flex-col gap-4 p-6">
        {/* Category badge */}
        <div className="h-5 w-24 rounded-full bg-white/10" />

        {/* Title */}
        <div className="space-y-2">
          <div className="h-6 w-full rounded bg-white/10" />
          <div className="h-6 w-3/4 rounded bg-white/10" />
        </div>

        {/* Summary */}
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-white/5" />
          <div className="h-4 w-full rounded bg-white/5" />
          <div className="h-4 w-2/3 rounded bg-white/5" />
        </div>

        {/* Meta info */}
        <div className="mt-auto flex items-center justify-between">
          <div className="h-4 w-32 rounded bg-white/5" />
          <div className="h-4 w-20 rounded bg-white/5" />
        </div>
      </div>
    </article>
  );
}

export function ArticleGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}
