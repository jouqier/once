import { useEffect, useLayoutEffect, useRef, useState } from "react"
import TMDBService from "../../services/tmdb.js"
import { API_CONFIG } from "../../config/api.js"
import { userMoviesService } from "../../services/user-movies.js"
import { Skeleton } from "@/components/ui/skeleton"
import { DetailsPoster } from "@/features/details/poster"
import { DetailsInfo } from "@/features/details/info"
import { DetailsCast } from "@/features/details/cast"
import { DetailsRecommendations } from "@/features/details/recommendations"
// Старые блоки отзывов и сезонов до задачи 10b. Оба создают <review-dialog>, но не импортируют его:
// в v1 его регистрировал movie-card-buttons.js
import "../../components/card-review.js"
import "../../components/show-card-seasons.js"
import "../../components/review-dialog.js"

// <movie-review> из card-review.js. Свойства и реакции на события те же, что ставили
// movie-card.js и show-card.js в v1.
function LegacyReview({ media }) {
  const ref = useRef(null)
  const isTv = media.media_type === "tv"

  useLayoutEffect(() => {
    const element = ref.current
    if (isTv) {
      element.movie = { ...media, media_type: "tv" }
    } else {
      const existing = userMoviesService.getReview(media.media_type || "movie", media.id)
      if (existing) {
        element.movie = media
        element.review = existing
        element.style.display = "flex"
      } else {
        element.style.display = "none"
      }
    }
  }, [media, isTv])

  useEffect(() => {
    const element = ref.current

    const handleRemoved = () => {
      element.style.display = "none"
    }
    const handleSubmitted = (event) => {
      if (event.detail.movieId !== media.id) return
      element.movie = media
      element.review = event.detail.review
      element.render()
      element.style.display = "flex"
    }
    const handleSeasonSubmitted = (event) => {
      if (parseInt(event.detail.tvId) !== media.id) return
      element.movie = media
      element._loadAllSeasonReviews()
      element.style.display = "flex"
    }
    const handleSeasonsRemoved = (event) => {
      if (parseInt(event.detail.tvId) !== media.id) return
      element.style.display = "none"
      element._reviews = []
      element.render()
    }

    document.addEventListener("review-removed", handleRemoved)
    document.addEventListener("review-submitted", handleSubmitted)
    if (isTv) {
      document.addEventListener("season-review-submitted", handleSeasonSubmitted)
      document.addEventListener("season-reviews-removed", handleSeasonsRemoved)
    }
    return () => {
      document.removeEventListener("review-removed", handleRemoved)
      document.removeEventListener("review-submitted", handleSubmitted)
      document.removeEventListener("season-review-submitted", handleSeasonSubmitted)
      document.removeEventListener("season-reviews-removed", handleSeasonsRemoved)
    }
  }, [media, isTv])

  return <movie-review ref={ref} />
}

// <tv-seasons> из show-card-seasons.js с теми же свойствами, что ставил show-card.js
function LegacySeasons({ show }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const element = ref.current
    element.tvShow = show
    element.tvId = show.id
    element.seasons = show.seasons
    element.style.display = "flex"
  }, [show])

  return <tv-seasons ref={ref} />
}

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
      {isTv && <LegacySeasons show={media} />}
      <LegacyReview media={media} />
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
