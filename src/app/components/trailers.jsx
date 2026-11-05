import { useEffect, useMemo, useReducer, useState } from "react"
import { trailersStore } from "../../services/trailers-store.js"
import { useHaptic } from "@/hooks/use-telegram"
import { cn } from "@/lib/utils"
import { PosterSkeleton } from "@/components/poster-skeleton"
import { ScrollRow } from "@/components/scroll-row"

const youtubeImage = (key) => `https://img.youtube.com/vi/${key}/maxresdefault.jpg`

// Пропсы: trailers — фильмы или сериалы с полем trailer.key (пусто: показываем скелетоны, как в v1).
// Непросмотренные идут первыми; порядок считается один раз при получении списка.
export function Trailers({ trailers }) {
  const haptic = useHaptic()
  const [, rerender] = useReducer((n) => n + 1, 0)
  const [hidden, setHidden] = useState(() => new Set())

  const sorted = useMemo(() => {
    const list = [...(trailers || [])]
    return list.sort((a, b) => {
      const aWatched = trailersStore.isWatched(a.trailer.key)
      const bWatched = trailersStore.isWatched(b.trailer.key)
      return aWatched === bWatched ? 0 : aWatched ? 1 : -1
    })
  }, [trailers])

  // Обложка YouTube может не существовать: такой трейлер скрываем
  useEffect(() => {
    const images = sorted.map((movie) => {
      const key = movie.trailer.key
      const img = new Image()
      img.onerror = () => setHidden((prev) => new Set(prev).add(key))
      img.src = youtubeImage(key)
      return img
    })
    return () => {
      images.forEach((img) => {
        img.onerror = null
      })
    }
  }, [sorted])

  const handleOpen = (key) => {
    haptic.medium()
    trailersStore.markAsWatched(key)
    rerender()
    window.open(`https://www.youtube.com/watch?v=${key}`, "_blank")
  }

  const hasTrailers = sorted.length > 0

  return (
    <ScrollRow innerScrolls={false}>
      {hasTrailers
        ? sorted.map((movie) => {
            const key = movie.trailer.key
            const watched = trailersStore.isWatched(key)
            const title = movie.title || movie.name
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleOpen(key)}
                className={cn(
                  "flex w-18 flex-none cursor-pointer flex-col items-start border-0 bg-transparent p-0 text-foreground",
                  hidden.has(key) && "hidden"
                )}
              >
                <span className={cn("block size-18 rounded-full p-0.5", watched ? "bg-[#666]" : "bg-primary")}>
                  <span
                    className={cn(
                      "block size-17 rounded-full bg-background bg-cover bg-center shadow-[inset_0_0_0_2px_var(--color-scrim)] transition-[filter] duration-300 ease-in-out",
                      watched && "grayscale"
                    )}
                    style={{ backgroundImage: `url(${youtubeImage(key)})` }}
                  />
                </span>
                <span className="mt-2 line-clamp-2 self-stretch overflow-hidden text-center text-xs/4 font-semibold text-ellipsis">
                  {title.length > 50 ? `${title.substring(0, 50)}...` : title}
                </span>
              </button>
            )
          })
        : [0, 1, 2, 3, 4].map((index) => <PosterSkeleton key={index} size="trailer" />)}
      <div className="shrink-0 pr-1">&nbsp;</div>
    </ScrollRow>
  )
}
