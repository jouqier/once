import { cn } from "@/lib/utils"

// Затемнение краёв под цвет фона, на котором лежит ряд
const FADES = {
  scrim: "before:from-scrim after:from-scrim",
  background: "before:from-background after:from-background",
}

// Горизонтальный ряд карточек с затемнением по краям, как в v1 (movies-scroll-container).
// innerScrolls: как у .movies-scroll в v1 скроллится сам ряд. Отступ в конце даёт отдельный элемент
// (gap-2 + w-2 = 16px), а не padding-right: WebKit может не учитывать padding в конце overflow-flex.
// У трейлеров в v1 скроллился только внешний блок (innerScrolls={false}), отступ в конце добавляют сами ряды.
// fade: 'scrim' на фоне страницы, 'background' внутри блоков экрана деталей (v1 surface).
export function ScrollRow({ className, innerScrolls = true, fade = "scrim", children }) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-start self-stretch py-2",
        "before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:z-1 before:w-4 before:bg-linear-to-r before:to-transparent before:content-['']",
        "after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:z-1 after:w-4 after:bg-linear-to-l after:to-transparent after:content-['']",
        FADES[fade]
      )}
    >
      <div className="w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          className={cn(
            "flex flex-nowrap items-start gap-2",
            innerScrolls ? "overflow-x-auto pl-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "px-4",
            className
          )}
        >
          {children}
          {innerScrolls && <div aria-hidden="true" className="w-2 shrink-0" />}
        </div>
      </div>
    </div>
  )
}
