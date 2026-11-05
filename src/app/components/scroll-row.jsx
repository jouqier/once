import { cn } from "@/lib/utils"

// Горизонтальный ряд карточек с затемнением по краям, как в v1 (movies-scroll-container).
export function ScrollRow({ className, children }) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-start self-stretch py-2",
        "before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:z-1 before:w-4 before:bg-linear-to-r before:from-scrim before:to-transparent before:content-['']",
        "after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:z-1 after:w-4 after:bg-linear-to-l after:from-scrim after:to-transparent after:content-['']"
      )}
    >
      <div className="w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className={cn("flex flex-nowrap items-start gap-2 px-4", className)}>{children}</div>
      </div>
    </div>
  )
}
