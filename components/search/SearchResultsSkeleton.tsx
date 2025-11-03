export function SearchResultsSkeleton() {
  return (
    <div className="container mx-auto px-4">
      <div className="mb-6 h-6 w-48 bg-muted animate-pulse rounded" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden border bg-card"
          >
            <div className="w-full h-48 bg-muted animate-pulse" />
            <div className="p-6 space-y-3">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-6 bg-muted animate-pulse rounded" />
              <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
              <div className="space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded" />
                <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
