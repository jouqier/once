import { useEffect, useMemo } from "react"
import { userMoviesService } from "../../../services/user-movies.js"
import { useUserList } from "@/hooks/use-user-list"

// Состояние фильма ('none' | 'want' | 'watched') или сериала (ещё 'watching').
// Снимки списков меняются по movie-list-changed, поэтому кнопки и бейджи обновляются сразу.
export function useListState(media) {
  const isTv = media.media_type === "tv"
  const kind = isTv ? "tv" : "movies"
  const want = useUserList(kind, "want")
  // У фильмов нет watching (getMovies('watching') пишет предупреждение), хуки же должны идти в одном порядке
  const watching = useUserList(kind, isTv ? "watching" : "want")
  const watched = useUserList(kind, "watched")
  return useMemo(
    () => (isTv ? userMoviesService.getTVShowState(media.id) : userMoviesService.getMovieState(media.id)),
    // Списки нужны как зависимости: состояние читается из того же хранилища
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isTv, media.id, want, watching, watched]
  )
}

// Автоматические переходы по событиям блока сезонов (DetailsSeasons), как в v1
export function useSeasonTransitions(tvShow) {
  useEffect(() => {
    const id = tvShow.id
    const getState = () => userMoviesService.getTVShowState(id)

    const handleEpisodeChange = (event) => {
      if (event.detail.tvId !== id) return
      const { checked, isLastUnwatched, wasAllWatched } = event.detail

      // Первый отмеченный эпизод: WATCHING
      if (checked && (getState() === "none" || getState() === "want")) {
        userMoviesService.removeTVShowFromWant(id)
        userMoviesService.addTVShowToWatching(tvShow)
      }
      // Последний неотмеченный эпизод: WATCHED
      if (checked && isLastUnwatched && getState() === "watching") {
        userMoviesService.removeTVShowFromWatching(id)
        userMoviesService.addTVShowToWatched(tvShow)
      }
      // Снятие отметки после полного просмотра: обратно в WATCHING
      if (!checked && wasAllWatched && getState() === "watched") {
        userMoviesService.removeTVShowFromWatched(id)
        userMoviesService.addTVShowToWatching(tvShow)
      }
    }

    const handleSeasonMarkedWatched = (event) => {
      if (event.detail.tvId !== id) return
      if (event.detail.allEpisodesWatched) {
        userMoviesService.removeTVShowFromWatching(id)
        userMoviesService.removeTVShowFromWant(id)
        userMoviesService.addTVShowToWatched(tvShow)
      } else if (getState() === "none" || getState() === "want") {
        userMoviesService.removeTVShowFromWant(id)
        userMoviesService.addTVShowToWatching(tvShow)
      }
    }

    const handleSeasonMarkedUnwatched = (event) => {
      if (event.detail.tvId !== id) return
      const { wasAllWatched, hasAnyWatchedEpisodes } = event.detail
      if (!wasAllWatched) return
      userMoviesService.removeTVShowFromWatched(id)
      if (hasAnyWatchedEpisodes) {
        userMoviesService.addTVShowToWatching(tvShow)
      }
    }

    document.addEventListener("episode-checkbox-changed", handleEpisodeChange)
    document.addEventListener("season-marked-watched", handleSeasonMarkedWatched)
    document.addEventListener("season-marked-unwatched", handleSeasonMarkedUnwatched)
    return () => {
      document.removeEventListener("episode-checkbox-changed", handleEpisodeChange)
      document.removeEventListener("season-marked-watched", handleSeasonMarkedWatched)
      document.removeEventListener("season-marked-unwatched", handleSeasonMarkedUnwatched)
    }
  }, [tvShow])
}
