import { Skeleton } from "@/components/skeleton";
export default function Loading() {
  return (
    <div className="h-screen grid md:grid-cols-2">
      <div className="border-r border-gray-200 dark:border-gray-800 p-6 space-y-3">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-full w-full" />
      </div>
      <div className="p-6 space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
