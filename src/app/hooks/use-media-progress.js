import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { userMoviesService } from "../../services/user-movies.js"

// Хранит прогресс сериалов ({ [tvId]: progress }) для экранов со списками.
//
// Между экранами данные свежие не благодаря этим событиям: одновременно смонтирован один экран,
// и каждый экран заново читает хранилища при монтировании. Слушатели ниже срабатывают только
// пока экран смонтирован. Сейчас это почти не случается: review-submitted и season-review-submitted
// отправляют drawer'ы экрана деталей (экраны со списками в это время размонтированы),
// а episode-status-changed не отправляет никто. Оставлены на случай событий во время показа экрана.
//
// ratings: слушать review-submitted и перерисовывать экран (оценки читаются при рендере через getReview).
// episodes: слушать season-review-submitted и episode-status-changed и подгружать прогресс сериала.
//
// Возвращает:
//   progress        состояние для рендера
//   progressRef     те же данные для проверок вне рендера (какие id уже запрошены)
//   mergeProgress   дописать записи в progress и progressRef
//   resetProgress   заменить progress целиком
export function useMediaProgress({ ratings = true, episodes = true } = {}) {
  const [progress, setProgress] = useState({})
  const progressRef = useRef({})
  const [, rerender] = useReducer((n) => n + 1, 0)

  const mergeProgress = useCallback((next) => {
    progressRef.current = { ...progressRef.current, ...next }
    setProgress((prev) => ({ ...prev, ...next }))
  }, [])

  const resetProgress = useCallback((next = {}) => {
    progressRef.current = next
    setProgress(next)
  }, [])

  useEffect(() => {
    if (!ratings) return
    const handleReview = () => rerender()
    document.addEventListener("review-submitted", handleReview)
    return () => document.removeEventListener("review-submitted", handleReview)
  }, [ratings])

  useEffect(() => {
    if (!episodes) return
    let disposed = false
    const handleEpisodes = async (event) => {
      const tvId = event.detail.tvId
      const next = await userMoviesService.getShowProgress(tvId)
      if (disposed || !next) return
      mergeProgress({ [tvId]: next })
    }
    document.addEventListener("season-review-submitted", handleEpisodes)
    document.addEventListener("episode-status-changed", handleEpisodes)
    return () => {
      disposed = true
      document.removeEventListener("season-review-submitted", handleEpisodes)
      document.removeEventListener("episode-status-changed", handleEpisodes)
    }
  }, [episodes, mergeProgress])

  return { progress, progressRef, mergeProgress, resetProgress }
}
