import { useLayoutEffect, useRef } from "react"
import { navigationManager } from "../../config/navigation.js"
import { analytics } from "../../services/analytics.js"
import { i18n } from "../../services/i18n.js"
import { useHaptic } from "@/hooks/use-telegram"
import { useNavigation } from "@/hooks/use-navigation"
import { cn } from "@/lib/utils"

const TABS = [
  {
    name: "profile",
    label: "profile",
    path: "M3 20C5.33579 17.5226 8.50702 16 12 16C15.493 16 18.6642 17.5226 21 20M16.5 7.5C16.5 9.98528 14.4853 12 12 12C9.51472 12 7.5 9.98528 7.5 7.5C7.5 5.01472 9.51472 3 12 3C14.4853 3 16.5 5.01472 16.5 7.5Z",
  },
  {
    name: "movies",
    label: "movies",
    path: "M2.80005 12H22.8M2.80005 7H7.80005M17.8 7H22.8M2.80005 17H7.80005M17.8 17H22.8M7.80005 22V2M17.8 22V2M7.60005 22H18C19.6802 22 20.5203 22 21.162 21.673C21.7265 21.3854 22.1854 20.9265 22.4731 20.362C22.8 19.7202 22.8 18.8802 22.8 17.2V6.8C22.8 5.11984 22.8 4.27976 22.4731 3.63803C22.1854 3.07354 21.7265 2.6146 21.162 2.32698C20.5203 2 19.6802 2 18 2H7.60005C5.91989 2 5.07981 2 4.43808 2.32698C3.87359 2.6146 3.41465 3.07354 3.12703 3.63803C2.80005 4.27976 2.80005 5.11984 2.80005 6.8V17.2C2.80005 18.8802 2.80005 19.7202 3.12703 20.362C3.41465 20.9265 3.87359 21.3854 4.43808 21.673C5.07981 22 5.91989 22 7.60005 22Z",
  },
  {
    name: "tv",
    label: "tvShows",
    path: "M7.57181 21C8.90661 20.3598 10.41 20 12 20C13.59 20 15.0934 20.3598 16.4282 21M6.8 17H17.2C18.8802 17 19.7202 17 20.362 16.673C20.9265 16.3854 21.3854 15.9265 21.673 15.362C22 14.7202 22 13.8802 22 12.2V7.8C22 6.11984 22 5.27976 21.673 4.63803C21.3854 4.07354 20.9265 3.6146 20.362 3.32698C19.7202 3 18.8802 3 17.2 3H6.8C5.11984 3 4.27976 3 3.63803 3.32698C3.07354 3.6146 2.6146 4.07354 2.32698 4.63803C2 5.27976 2 6.11984 2 7.8V12.2C2 13.8802 2 14.7202 2.32698 15.362C2.6146 15.9265 3.07354 16.3854 3.63803 16.673C4.27976 17 5.11984 17 6.8 17Z",
  },
  {
    name: "search",
    label: "search",
    path: "M21.4001 21L17.057 16.6569M17.0501 16.65L17.057 16.6569M17.057 16.6569C18.5047 15.2091 19.4001 13.2091 19.4001 11C19.4001 6.58172 15.8184 3 11.4001 3C6.98187 3 3.40015 6.58172 3.40015 11C3.40015 15.4183 6.98187 19 11.4001 19C13.6093 19 15.6093 18.1046 17.057 16.6569Z",
  },
]

export function TabBar() {
  const { state } = useNavigation()
  const haptic = useHaptic()
  const ref = useRef(null)
  // currentTab меняется до события navigation-changed, поэтому читаем его при рендере
  // и подсветка переключается в том же кадре, что и экран
  const activeTab = state && navigationManager.currentTab

  // Высота таб-бара (с safe area) нужна старым экранам: поиск ставит «Surprise me» на 16px выше
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const root = document.documentElement
    const update = () => root.style.setProperty("--tab-bar-height", `${el.offsetHeight}px`)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.removeProperty("--tab-bar-height")
    }
  }, [])

  const handleSelect = (tab) => {
    haptic.light()
    // Как в v1: повторный тап по активной вкладке тоже отправляет tab-changed
    analytics.trackTabChange(tab)
    navigationManager.navigateToTab(tab, false)
  }

  return (
    <nav
      ref={ref}
      className="sticky bottom-0 z-40 flex items-center justify-around gap-2 bg-scrim px-3 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] transform-gpu"
    >
      {TABS.map((tab) => (
        <button
          type="button"
          key={tab.name}
          aria-label={i18n.t(tab.label)}
          aria-current={activeTab === tab.name ? "page" : undefined}
          onClick={() => handleSelect(tab.name)}
          className={cn(
            "relative flex h-10 flex-1 cursor-pointer border-0 bg-transparent p-0 items-center justify-center self-stretch rounded-full text-white",
            activeTab === tab.name && "bg-card"
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className={cn("size-6", activeTab === tab.name && "text-foreground")}
            aria-hidden="true"
          >
            <path
              d={tab.path}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ))}
    </nav>
  )
}
