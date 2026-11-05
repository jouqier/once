import { useEffect, useState } from "react"
import TMDBService from "../../services/tmdb.js"
import { userMoviesService } from "../../services/user-movies.js"
import { useMediaProgress } from "@/hooks/use-media-progress"
import { selectMedia } from "@/lib/select-media"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { MediaPoster } from "@/components/media-poster"

// Как в v1: три страницы TMDB, из них первые 42 элемента
const PAGES = [1, 2, 3]
const MAX_ITEMS = 42
const SKELETON_COUNT = 6

export function GenreScreen({ state }) {
  const { genreId, genreName, from } = state
  const mediaType = state.mediaType || "movie"
  const isTv = mediaType === "tv"

  const [items, setItems] = useState(null)
  // Оценки фильмов читаются при рендере, поэтому событие отзыва просто перерисовывает экран.
  // Прогресс сериалов обновляется по событиям сезонов и эпизодов
  const { progress, resetProgress } = useMediaProgress({ ratings: !isTv, episodes: isTv })

  useEffect(() => {
    let cancelled = false
    setItems(null)
    resetProgress()

    async function load() {
      try {
        const pages = await Promise.all(
          PAGES.map((page) =>
            isTv
              ? TMDBService.getTVShowsByGenre(genreId, page)
              : TMDBService.getMoviesByGenre(genreId, page)
          )
        )
        const allResults = pages.reduce((acc, page) => acc.concat(page.results), [])

        // Исключаем текущий фильм/сериал, с которого открыли жанр
        const currentId = from ? parseInt(from, 10) : null
        const filtered =
          currentId && !isNaN(currentId)
            ? allResults.filter((item) => item.id !== currentId)
            : allResults
        const list = filtered.slice(0, MAX_ITEMS)

        // Для сериалов прогресс подгружается до показа сетки, как в v1
        const next = {}
        if (isTv) {
          const shows = await Promise.all(list.map((item) => userMoviesService.getShowProgress(item.id)))
          list.forEach((item, index) => {
            if (shows[index]) next[item.id] = shows[index]
          })
        }
        if (cancelled) return
        resetProgress(next)
        setItems(list)
      } catch (error) {
        console.error("Error loading genre:", error)
        if (!cancelled) setItems([])
      }
    }
    load()

    return () => {
      cancelled = true
    }
  }, [genreId, from, isTv, resetProgress])

  return (
    <div className="flex flex-col gap-2 leading-[normal]">
      <div className="flex flex-col items-center gap-4 self-stretch p-8">
        <div className="text-center text-[120px]/[120px] text-foreground">
          {TMDBService.getGenreEmoji(genreName)}
        </div>
        <div className="text-center text-[22px]/7 font-semibold text-foreground">{genreName}</div>
      </div>
      <div className="flex flex-col items-start self-stretch overflow-hidden rounded-[36px] py-2">
        <div className="grid w-full grid-cols-2 gap-2 px-4 py-2">
          {items === null
            ? Array.from({ length: SKELETON_COUNT }, (_, index) => (
                <Skeleton key={index} className="aspect-2/3 rounded-[8px]" />
              ))
            : items.map((item) => {
                const itemProgress = isTv ? progress[item.id] : undefined
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "aspect-2/3 cursor-pointer transition-transform duration-200 will-change-transform",
                      "active:scale-95 [@media(hover:hover)]:hover:scale-[1.02] [@media(hover:hover)]:active:scale-95"
                    )}
                  >
                    <MediaPoster
                      item={item}
                      type={mediaType}
                      onSelect={selectMedia}
                      userRating={isTv ? undefined : userMoviesService.getReview("movie", item.id)?.rating}
                      watchedEpisodes={itemProgress?.watchedEpisodes}
                      totalEpisodes={itemProgress?.totalEpisodes}
                    />
                  </div>
                )
              })}
        </div>
      </div>
    </div>
  )
}
