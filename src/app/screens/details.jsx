import { useEffect, useLayoutEffect, useState } from "react"
import TMDBService from "../../services/tmdb.js"
import { API_CONFIG } from "../../config/api.js"
import { Skeleton } from "@/components/ui/skeleton"
import { DetailsPoster } from "@/features/details/poster"
import { DetailsInfo } from "@/features/details/info"
import { DetailsCast } from "@/features/details/cast"
import { DetailsRecommendations } from "@/features/details/recommendations"
import { DetailsReview } from "@/features/details/review"
import { DetailsSeasons } from "@/features/details/seasons"

function DetailsSkeleton() {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-col self-stretch overflow-hidden rounded-[40px] bg-card">
        <div className="flex flex-col self-stretch px-22 pt-8 pb-4">
          <Skeleton className="aspect-2/3 self-stretch rounded-[8px]" />
        </div>
        <div className="flex gap-2 p-4">
          <Skeleton className="h-12 flex-1 rounded-full" />
          <Skeleton className="h-12 flex-1 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 self-stretch rounded-[36px] bg-background px-4 py-6">
        <Skeleton className="h-7 w-48 rounded-[8px]" />
        <Skeleton className="h-4 w-56 rounded-[4px]" />
        <div className="flex flex-col gap-1 self-stretch pt-4">
          <Skeleton className="h-4 rounded-[4px]" />
          <Skeleton className="h-4 rounded-[4px]" />
          <Skeleton className="h-4 w-2/3 rounded-[4px]" />
        </div>
      </div>
    </div>
  )
}

// Экран фильма или сериала (v1 movie-card-details / tv-show-card-details)
export function DetailsScreen({ state }) {
  const { mediaId } = state
  const mediaType = state.mediaType === undefined ? "movie" : state.mediaType
  // undefined: загрузка, null: ошибка TMDB (как в v1, экран остаётся пустым)
  const [media, setMedia] = useState(undefined)

  useEffect(() => {
    let cancelled = false

    TMDBService.getFullMovieInfo(mediaId, mediaType)
      .then((data) => {
        if (cancelled) return
        const movieData = { ...data, media_type: mediaType }
        if (movieData.backdrop_path) {
          document.documentElement.style.setProperty(
            "--movie-backdrop",
            `url(${API_CONFIG.IMAGE_BASE_URL.replace("/w500", "/original")}${movieData.backdrop_path})`
          )
        }
        setMedia(movieData)
      })
      .catch((error) => {
        console.error("Ошибка при показе деталей:", error)
        if (!cancelled) setMedia(null)
      })

    return () => {
      cancelled = true
    }
  }, [mediaId, mediaType])

  useLayoutEffect(() => {
    if (media) window.scrollTo(0, 0)
  }, [media])

  if (media === undefined) return <DetailsSkeleton />
  if (media === null) return null

  const isTv = mediaType === "tv"

  return (
    <div className="flex w-full flex-col gap-2 leading-[normal]">
      {/* Фильм без постера в v1 получал movie-poster.movie = null: пустой блок без кнопок */}
      <DetailsPoster media={isTv || media.poster_path ? media : null} />
      {/* <DetailsStats />: в v1 movie-stats закомментирован */}
      <DetailsInfo media={media} />
      {isTv && <DetailsSeasons show={media} />}
      <DetailsReview media={media} />
      {media.credits && <DetailsCast cast={media.credits.cast} />}
      {media.recommendations && (
        <DetailsRecommendations
          recommendations={media.recommendations}
          currentTitle={isTv ? media.name : media.title}
        />
      )}
    </div>
  )
}
