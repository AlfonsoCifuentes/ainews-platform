export function CourseLibrarySkeleton() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header Skeleton */}
      <div className="text-center mb-12 space-y-4">
        <div className="h-12 w-96 mx-auto bg-white/5 rounded-lg animate-pulse" />
        <div className="h-6 w-[600px] mx-auto bg-white/5 rounded-lg animate-pulse" />
        <div className="h-4 w-32 mx-auto bg-white/5 rounded-lg animate-pulse" />
      </div>

      {/* Search & Filters Skeleton */}
      <div className="mb-8 space-y-4">
        <div className="h-12 max-w-2xl mx-auto bg-white/5 rounded-xl animate-pulse" />
        <div className="flex flex-wrap gap-4 justify-center">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-32 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>

      {/* Course Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-80 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
