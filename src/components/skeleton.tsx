export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-gray-200 dark:bg-gray-800 ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-5 space-y-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <Skeleton className="h-9 w-64" />
      <div className="grid sm:grid-cols-2 gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
