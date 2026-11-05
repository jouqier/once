import { useState } from "react"
import { API_CONFIG } from "../../config/api.js"
import { useHaptic } from "@/hooks/use-telegram"
import { cn } from "@/lib/utils"
import { EpisodesBadge } from "@/components/episodes-badge"
import { RatingBadge } from "@/components/rating-badge"

// Загруженные постеры запоминаются между экземплярами, как в v1
const loadedImages = new Set()

// Пропсы: item (запись TMDB), type ('movie' | 'tv'), onSelect(item, type).
// Прогресс и оценка приходят снаружи, как атрибуты watched-episodes, total-episodes, user-rating.
export function MediaPoster({
  item,
  type,
  onSelect,
  watchedEpisodes,
  totalEpisodes,
  userRating,
  className,
}) {
  const haptic = useHaptic()
  const title = item.title || item.name || "?"
  const src = item.poster_path ? `${API_CONFIG.IMAGE_BASE_URL}${item.poster_path}` : null

  const [failedSrc, setFailedSrc] = useState(null)
  const [loadedSrc, setLoadedSrc] = useState(() => (src && loadedImages.has(src) ? src : null))
  const showImage = src && failedSrc !== src
  const isLoaded = loadedSrc === src

  const isTVShow = (Number(watchedEpisodes) || 0) > 0 || (Number(totalEpisodes) || 0) > 0

  const handleClick = (event) => {
    haptic.light()
    if (onSelect) {
      onSelect(item, type)
      return
    }
    event.currentTarget.dispatchEvent(
      new CustomEvent("movie-selected", {
        detail: { movieId: item.id, type, movie: item },
        bubbles: true,
        composed: true,
      })
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "relative block size-full cursor-pointer overflow-hidden rounded-[8px] bg-card p-0 text-foreground",
        className
      )}
    >
      {showImage && (
        <img
          src={src}
          alt={title}
          loading="lazy"
          onLoad={() => {
            loadedImages.add(src)
            setLoadedSrc(src)
          }}
          onError={() => setFailedSrc(src)}
          className={cn(
            "block size-full object-cover transition-opacity duration-300 ease-in-out",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
      {!(showImage && isLoaded) && (
        <div className="absolute inset-0 flex items-center justify-center p-2 text-center text-sm leading-[1.2] font-semibold wrap-anywhere">
          {title}
        </div>
      )}
      <EpisodesBadge watchedEpisodes={watchedEpisodes} totalEpisodes={totalEpisodes} />
      {!isTVShow && <RatingBadge userRating={userRating} />}
    </button>
  )
}
