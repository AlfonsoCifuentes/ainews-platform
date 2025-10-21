export function EntityCardSkeleton() {
  return (
    <div className="group rounded-2xl border p-5 backdrop-blur-xl bg-card/60 animate-pulse">
      <div className="h-3 w-20 bg-muted rounded mb-2" />
      <div className="h-6 w-3/4 bg-muted rounded mb-2" />
      <div className="h-4 w-full bg-muted rounded" />
      <div className="h-4 w-2/3 bg-muted rounded mt-1" />
    </div>
  );
}

export function EntityListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <EntityCardSkeleton key={i} />
      ))}
    </div>
  );
}
