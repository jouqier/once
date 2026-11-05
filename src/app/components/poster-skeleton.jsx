import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Проп size соответствует атрибуту <poster-skeleton size>: 'large' | 'small' | 'trailer'
export function PosterSkeleton({ size = "large", className }) {
  if (size === "trailer") {
    return (
      <div className={cn("flex w-17 shrink-0 flex-col items-center", className)}>
        <Skeleton className="size-18 rounded-full" />
        <Skeleton className="mt-2 mb-5 h-3 w-15 rounded-[4px]" />
      </div>
    )
  }

  return (
    <Skeleton
      className={cn(
        "shrink-0 rounded-[8px]",
        size === "small" ? "h-48 w-32" : "h-85.5 w-57",
        className
      )}
    />
  )
}
