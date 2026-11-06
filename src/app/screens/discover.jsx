import { useCallback, useEffect, useRef, useState } from "react"
import TMDBCacheService from "../../services/tmdb-cache.js"
import { userMoviesService } from "../../services/user-movies.js"
import { i18n } from "../../services/i18n.js"
import { useMediaProgress } from "@/hooks/use-media-progress"
import { useUserList } from "@/hooks/use-user-list"
import { selectMedia } from "@/lib/select-media"
import { cn } from "@/lib/utils"
import { MediaPoster } from "@/components/media-poster"
import { PosterSkeleton } from "@/components/poster-skeleton"
import { ScrollRow } from "@/components/scroll-row"
import { Trailers } from "@/components/trailers"

// Всё, чем фильмы и сериалы различаются в v1: вызовы TMDB, тексты секций, события обновления
const KINDS = {
  movies: {
    type: "movie",
    label: "moviesLabel",
    errorLog: () => "Error loading movies:",
    reloadErrorLog: "Error reloading recommendations:",
    // Порядок секций после «Для вас»
    sections: [
      { id: "recent", title: "newThisQuarter" },
      { id: "upcoming", title: "upcoming" },
      { id: "popular", title: "mostPopular" },
    ],
    async loadRecommendations() {
      const all = await userMoviesService.getAllMoviesWithDetails()
      const want = all.filter((m) => userMoviesService.getMovieState(m.id) === "want")
      const watched = all.filter((m) => userMoviesService.getMovieState(m.id) === "watched")
      return TMDBCacheService.getPersonalizedRecommendations(want, watched)
    },
    async loadLists(loadRecommendations) {
      const [trending, recent, upcoming, popular, trailers, recommended] = await Promise.all([
        TMDBCacheService.getTrendingMovies(),
        TMDBCacheService.getRecentReleases("movie"),
        TMDBCacheService.getUpcomingMovies(),
        TMDBCacheService.getPopularMovies(),
        TMDBCacheService.getUpcomingMoviesWithTrailers(),
        loadRecommendations(),
      ])
      return {
        trending,
        recent,
        upcoming,
        popular: popular?.results || [],
        trailers,
        recommended,
      }
    },
  },
  tv: {
    type: "tv",
    label: "tvShowsLabel",
    errorLog: () => i18n.t("errorLoadingTVShows"),
    reloadErrorLog: "Error reloading TV recommendations:",
    sections: [
      { id: "recent", title: "newThisQuarter" },
      { id: "popular", title: "mostPopular" },
      { id: "topRated", title: "topRated" },
    ],
    async loadRecommendations() {
      const all = await userMoviesService.getAllTVShowsWithDetails()
      const want = all.filter((s) => userMoviesService.getTVShowState(s.id) === "want")
      const watched = all.filter((s) => userMoviesService.getTVShowState(s.id) === "watched")
      const watching = all.filter((s) => userMoviesService.getTVShowState(s.id) === "watching")
      return TMDBCacheService.getPersonalizedTVRecommendations(want, watched, watching)
    },
    async loadLists(loadRecommendations) {
      const [trending, recent, popular, topRated, trailers, recommended] = await Promise.all([
        TMDBCacheService.getTrendingTV(),
        TMDBCacheService.getRecentReleases("tv"),
        TMDBCacheService.getPopularTV(),
        TMDBCacheService.getTopRatedTV(),
        TMDBCacheService.getTrendingTVWithTrailers(),
        loadRecommendations(),
      ])
      return {
        trending,
        recent,
        popular: popular?.results || [],
        topRated,
        trailers,
        recommended,
      }
    },
  },
}

const EMPTY = { trending: [], trailers: [], recommended: [] }

function Section({ label, title, primary, children }) {
  return (
    <div className="flex flex-col items-start self-stretch">
      <div className="flex flex-col justify-center self-stretch px-4 pt-2 text-xs/4 font-semibold text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "flex flex-col justify-center self-stretch px-4 pb-2 font-semibold text-foreground",
          primary ? "text-[32px]/10" : "text-2xl/8"
        )}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

// Ряд постеров; пока данных нет, показываем скелетоны (3 больших или 5 малых), как в v1
function PosterRow({ items, large, type, ratingOf, progressOf }) {
  const isEmpty = !items || items.length === 0
  return (
    <ScrollRow>
      {isEmpty
        ? Array.from({ length: large ? 3 : 5 }, (_, index) => (
            <PosterSkeleton key={index} size={large ? "large" : "small"} />
          ))
        : items.map((item) => {
            const progress = progressOf?.(item)
            return (
              <div
                key={item.id}
                className={cn(
                  "aspect-2/3 flex-none cursor-pointer transition-transform duration-200 active:scale-95",
                  large ? "w-57" : "w-32"
                )}
              >
                <MediaPoster
                  item={item}
                  type={type}
                  onSelect={selectMedia}
                  userRating={ratingOf?.(item)}
                  watchedEpisodes={progress?.watchedEpisodes}
                  totalEpisodes={progress?.totalEpisodes}
                />
              </div>
            )
          })}
    </ScrollRow>
  )
}

export function DiscoverScreen({ kind }) {
  const config = KINDS[kind]
  const isTv = kind === "tv"

  const [lists, setLists] = useState(EMPTY)
  // Оценки и прогресс читаются при рендере, поэтому события отзывов просто перерисовывают экран
  const { progress, progressRef, mergeProgress } = useMediaProgress({ episodes: isTv })

  // Списки пользователя нужны как триггер пересчёта рекомендаций (movie-list-changed, смена пользователя)
  const want = useUserList(kind, "want")
  const watched = useUserList(kind, "watched")
  const watching = useUserList(kind, isTv ? "watching" : "want")

  // Ответ на устаревший запрос рекомендаций отбрасывается
  const recommendationsSeq = useRef(0)
  const loadRecommendations = useCallback(async () => {
    const seq = ++recommendationsSeq.current
    const recommended = await config.loadRecommendations()
    return { recommended, stale: seq !== recommendationsSeq.current }
  }, [config])

  // Первая загрузка. Если упала любая часть, остаются скелетоны, как в v1
  useEffect(() => {
    let cancelled = false
    let recommendationsStale = false
    setLists(EMPTY)

    config
      .loadLists(async () => {
        const { recommended, stale } = await loadRecommendations()
        recommendationsStale = stale
        return recommended
      })
      .then((data) => {
        // Более свежий пересчёт рекомендаций мог закончиться раньше первой загрузки
        if (!cancelled) {
          setLists((prev) => ({
            ...data,
            recommended: recommendationsStale ? prev.recommended : data.recommended,
          }))
        }
      })
      .catch((error) => console.error(config.errorLog(), error))

    return () => {
      cancelled = true
    }
  }, [config, loadRecommendations])

  // Пересчёт рекомендаций при изменении списков: сначала сброс кеша, как _handleMovieListChanged
  const seenLists = useRef({ want, watched, watching })
  useEffect(() => {
    const seen = seenLists.current
    if (seen.want === want && seen.watched === watched && seen.watching === watching) return
    seenLists.current = { want, watched, watching }

    let cancelled = false
    TMDBCacheService.invalidateRecommendations()
    loadRecommendations()
      .then(({ recommended, stale }) => {
        if (!cancelled && !stale) setLists((prev) => ({ ...prev, recommended }))
      })
      .catch((error) => console.error(config.reloadErrorLog, error))

    return () => {
      cancelled = true
    }
  }, [want, watched, watching, config, loadRecommendations])

  // Прогресс сериалов: подгружаем для карточек, которых ещё нет. Свежесть после возврата с других экранов
  // даёт повторное монтирование (progress начинается пустым), события useMediaProgress работают только пока экран открыт
  const listedShows = isTv ? [lists.trending, lists.recent, lists.popular, lists.topRated, lists.recommended] : []
  useEffect(() => {
    if (!isTv) return
    const ids = [...new Set(listedShows.flatMap((list) => list || []).map((show) => show.id))].filter(
      (id) => !(id in progressRef.current)
    )
    if (ids.length === 0) return
    ids.forEach((id) => (progressRef.current[id] = null))

    userMoviesService
      .getBatchShowProgress(ids)
      .then((items) => {
        const next = {}
        items.forEach((item) => {
          if (item) next[item.showId] = item
        })
        mergeProgress(next)
      })
      .catch((error) => {
        ids.forEach((id) => delete progressRef.current[id])
        console.error("Error loading show progress:", error)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTv, lists])

  const ratingOf = isTv ? undefined : (item) => userMoviesService.getReview("movie", item.id)?.rating
  const progressOf = isTv ? (item) => progress[item.id] : undefined
  const label = i18n.t(config.label)
  const rowProps = { type: config.type, ratingOf, progressOf }

  return (
    <div className="flex flex-col items-start gap-2 py-2 leading-[normal]">
      <div className="flex flex-col items-start self-stretch">
        <Trailers trailers={lists.trailers} />
      </div>

      <Section label={label} title={i18n.t("trendingNow")} primary>
        <PosterRow items={lists.trending} large {...rowProps} />
      </Section>

      {lists.recommended.length > 0 && (
        <Section label={label} title={i18n.t("forYou")}>
          <PosterRow items={lists.recommended} {...rowProps} />
        </Section>
      )}

      {config.sections.map((section) => (
        <Section key={section.id} label={label} title={i18n.t(section.title)}>
          <PosterRow items={lists[section.id]} {...rowProps} />
        </Section>
      ))}
    </div>
  )
}
