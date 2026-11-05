import { useEffect, useReducer, useState } from "react"
import TMDBService from "../../../services/tmdb.js"
import { API_CONFIG } from "../../../config/api.js"
import { userMoviesService } from "../../../services/user-movies.js"
import { shareLinkService } from "../../../services/share-link.js"
import { i18n } from "../../../services/i18n.js"
import { useHaptic } from "@/hooks/use-telegram"
import { MediaPoster } from "@/components/media-poster"
import { DetailsActions } from "./actions"
import { ActionMenu, useActionMenu } from "./action-menu"
import { useListState } from "./list-state"

// События, после которых v1 пересчитывал бейдж на постере (movie-poster._updateContent)
const TV_EVENTS = [
  "season-review-submitted",
  "episode-checkbox-changed",
  "season-marked-watched",
  "season-marked-unwatched",
  "tv-action",
]

function useBadgeRefresh(media) {
  const [, refresh] = useReducer((n) => n + 1, 0)

  useEffect(() => {
    const isTv = media.media_type === "tv"
    const handle = (event) => {
      if (isTv) {
        if (String(event.detail.tvId) === String(media.id)) refresh()
      } else if (event.detail.movieId === media.id) {
        refresh()
      }
    }
    const events = isTv ? TV_EVENTS : ["review-submitted"]
    events.forEach((name) => document.addEventListener(name, handle))
    return () => events.forEach((name) => document.removeEventListener(name, handle))
  }, [media])
}

// Прогресс по уже загруженным сезонам, как в v1: эпизоды сезона или episode_count, без спецвыпусков
function episodeProgress(show) {
  const seasons = (show.seasons || []).filter((season) => season.season_number > 0)
  let total = 0
  let watched = 0
  for (const season of seasons) {
    const count = season.episodes?.length || season.episode_count || 0
    total += count
    for (let episode = 1; episode <= count; episode++) {
      if (userMoviesService.isEpisodeWatched(show.id, season.season_number, episode)) watched++
    }
  }
  return total > 0 ? { watched, total } : null
}

function useTrailer(media) {
  const [trailer, setTrailer] = useState(null)

  useEffect(() => {
    if (!media.poster_path) return
    let cancelled = false
    TMDBService.getVideos(media.id, media.media_type || "movie")
      .then((videos) => {
        const found = videos.results.find((video) => video.type === "Trailer" && video.site === "YouTube")
        if (!cancelled && found) setTrailer(found)
      })
      .catch((error) => console.error("Error loading videos:", error))
    return () => {
      cancelled = true
    }
  }, [media])

  return trailer
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="size-5" aria-hidden="true">
      <path
        d="M5.83333 9.16667C5.05836 9.16667 4.67087 9.16667 4.35295 9.25185C3.49022 9.48302 2.81635 10.1569 2.58519 11.0196C2.5 11.3375 2.5 11.725 2.5 12.5V13.5C2.5 14.9001 2.5 15.6002 2.77248 16.135C3.01217 16.6054 3.39462 16.9878 3.86502 17.2275C4.3998 17.5 5.09987 17.5 6.5 17.5H13.5C14.9001 17.5 15.6002 17.5 16.135 17.2275C16.6054 16.9878 16.9878 16.6054 17.2275 16.135C17.5 15.6002 17.5 14.9001 17.5 13.5V12.5C17.5 11.725 17.5 11.3375 17.4148 11.0196C17.1836 10.1569 16.5098 9.48302 15.647 9.25185C15.3291 9.16667 14.9416 9.16667 14.1667 9.16667M13.3333 5.83333L10 2.5M10 2.5L6.66667 5.83333M10 2.5V12.5"
        className="stroke-foreground"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ShareButton({ onClick }) {
  return (
    <button
      type="button"
      title="Share"
      onClick={onClick}
      className="absolute top-4 right-4 z-2 flex size-8 cursor-pointer items-center justify-center rounded-full border-0 bg-white/32 p-0 transition-all duration-300 active:scale-95"
    >
      <ShareIcon />
    </button>
  )
}

function shareAction(media, action) {
  const mediaType = media.media_type || "movie"
  const title = media.title || media.name

  if (action === "share-preview") {
    const posterUrl = media.poster_path ? `${API_CONFIG.IMAGE_BASE_URL}${media.poster_path}` : ""
    const description = media.overview ? media.overview.substring(0, 200) + "..." : ""
    shareLinkService.shareToTelegramWithPreview(media.id, mediaType, title, posterUrl, description)
  } else if (action === "share-telegram") {
    const rating = media.vote_average ? Math.round(media.vote_average * 10) / 10 : null
    const year = media.release_date
      ? new Date(media.release_date).getFullYear()
      : media.first_air_date
        ? new Date(media.first_air_date).getFullYear()
        : null
    shareLinkService.shareToTelegram(media.id, mediaType, title, rating, year)
  } else if (action === "copy-link") {
    shareLinkService.copyToClipboard(media.id, mediaType)
  }
}

function PosterContent({ media }) {
  const haptic = useHaptic()
  const state = useListState(media)
  const trailer = useTrailer(media)
  const { menuProps, showMenu } = useActionMenu()
  useBadgeRefresh(media)

  const isTv = media.media_type === "tv"
  const hasPoster = Boolean(media.poster_path)
  // В v1 бейджи и трейлер ставились, только если есть постер
  const progress = hasPoster && isTv ? episodeProgress(media) : null
  const userRating =
    hasPoster && !isTv && state === "watched" ? userMoviesService.getReview("movie", media.id)?.rating : undefined

  const handleShare = () => {
    haptic.light()
    showMenu(
      i18n.t("share"),
      [
        { label: i18n.t("shareWithPreview"), action: "share-preview" },
        { label: i18n.t("shareToTelegram"), action: "share-telegram" },
        { label: i18n.t("copyLink"), action: "copy-link" },
      ],
      (action) => shareAction(media, action)
    )
  }

  return (
    <>
      <ShareButton onClick={handleShare} />
      <div className="relative aspect-2/3 self-stretch">
        <MediaPoster
          item={hasPoster ? media : { id: media.id }}
          type={media.media_type}
          interactive={false}
          watchedEpisodes={progress?.watched}
          totalEpisodes={progress?.total}
          userRating={userRating}
          className="bg-transparent"
        />
        {trailer && (
          <button
            type="button"
            onClick={() => {
              haptic.medium()
              window.open(`https://www.youtube.com/watch?v=${trailer.key}`, "_blank")
            }}
            className="group/play absolute right-2 bottom-2 z-2 flex size-10 cursor-pointer items-center justify-center rounded-full border-0 bg-white/32 transition-all duration-200 hover:scale-110 hover:bg-(--md-sys-color-primary)"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-6 fill-primary-foreground group-hover/play:fill-(--md-sys-color-on-primary)"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
      </div>
      <ActionMenu {...menuProps} />
    </>
  )
}

// Блок постера (v1 movie-poster): размытый фон из постера, сам постер, «Поделиться», трейлер и кнопки.
// media === null повторяет v1 для фильма без постера: пустой блок без кнопок.
export function DetailsPoster({ media }) {
  const posterUrl = media?.poster_path ? `${API_CONFIG.IMAGE_BASE_URL}${media.poster_path}` : null

  return (
    <div className="relative flex flex-col items-center justify-center self-stretch overflow-hidden rounded-[40px]">
      <div
        className="absolute inset-0 rounded-[42px] bg-[lightgray]"
        style={posterUrl ? { background: `url(${posterUrl}) lightgray 50% / cover no-repeat` } : undefined}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#000_0%,rgba(0,0,0,0.60)_60%)] backdrop-blur-[20px]" />
      <div className="relative z-1 flex flex-col items-center self-stretch px-22 pt-8 pb-4">
        {media ? (
          <PosterContent media={media} />
        ) : (
          <>
            {/* В v1 кнопка есть, но без фильма ничего не делает */}
            <ShareButton onClick={() => {}} />
            <div className="relative aspect-2/3 self-stretch">
              <MediaPoster item={{}} interactive={false} className="bg-transparent" />
            </div>
          </>
        )}
      </div>
      <div className="relative z-1 w-full">{media && <DetailsActions media={media} />}</div>
    </div>
  )
}
