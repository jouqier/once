import { useState } from "react"
import { userMoviesService } from "../../../services/user-movies.js"
import { i18n } from "../../../services/i18n.js"
import { useHaptic } from "@/hooks/use-telegram"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ActionMenu, useActionMenu } from "./action-menu"
import { useListState, useSeasonTransitions } from "./list-state"
import { ReviewDrawer } from "./review-drawer"

function dispatch(name, detail) {
  document.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }))
}

// Как md-filled-tonal-button v1: заливка до края (без прозрачной рамки Button) и без сдвига при нажатии
const BUTTON =
  "h-12 flex-1 border-0 bg-clip-border px-6 text-sm/5 font-medium transition-all duration-300 active:not-aria-[haspopup]:translate-y-0"
const BUTTON_IDLE = "bg-white/32 hover:bg-white/32"
const BUTTON_OUTLINED = "border-2 border-foreground bg-transparent hover:bg-transparent"
const BUTTON_FILLED = "bg-primary hover:bg-primary"

function MovieActions({ movie }) {
  const haptic = useHaptic()
  const state = useListState(movie)
  const { menuProps, showMenu } = useActionMenu()
  const [review, setReview] = useState({ open: false, initial: null })

  const openReviewDialog = (isEdit = false) => {
    const initial = isEdit ? userMoviesService.getReview("movie", movie.id) : null
    setReview({ open: true, initial })
  }

  const handleWantClick = () => {
    haptic.light()
    if (state === "want") {
      showMenu(
        i18n.t("want"),
        [
          { label: i18n.t("moveToWatched"), action: "move-to-watched" },
          { label: i18n.t("removeFromWant"), action: "remove-from-want" },
        ],
        (action) => {
          if (action === "move-to-watched") {
            // Из «Хочу» фильм уходит только при сохранении отзыва (onSubmitted),
            // иначе «Отмена» оставила бы его без списка
            openReviewDialog()
          } else if (action === "remove-from-want") {
            userMoviesService.removeFromWant(movie.id)
          }
        }
      )
    } else {
      userMoviesService.addToWant(movie)
    }
  }

  const handleWatchedClick = () => {
    haptic.light()
    if (state === "watched") {
      showMenu(
        i18n.t("watched"),
        [
          { label: i18n.t("moveToWant"), action: "move-to-want" },
          { label: i18n.t("removeFromWatched"), action: "remove-from-watched" },
          { label: i18n.t("editReview"), action: "edit-review" },
        ],
        (action) => {
          if (action === "move-to-want") {
            userMoviesService.removeFromWatched(movie.id)
            userMoviesService.removeReview("movie", movie.id)
            userMoviesService.addToWant(movie)
            dispatch("review-removed", { movieId: movie.id, type: "movie" })
          } else if (action === "remove-from-watched") {
            userMoviesService.removeFromWatched(movie.id)
            userMoviesService.removeReview("movie", movie.id)
            dispatch("review-removed", { movieId: movie.id, type: "movie" })
          } else if (action === "edit-review") {
            openReviewDialog(true)
          }
        }
      )
    } else {
      openReviewDialog()
    }
  }

  return (
    <div className="flex gap-2 p-4">
      {state !== "watched" && (
        <Button
          type="button"
          variant="tonal"
          onClick={handleWantClick}
          className={cn(BUTTON, "text-foreground", state === "want" ? BUTTON_OUTLINED : BUTTON_IDLE)}
        >
          {state === "want" ? `✓ ${i18n.t("want")}` : i18n.t("want")}
        </Button>
      )}
      {state !== "want" && (
        <Button
          type="button"
          variant="tonal"
          onClick={handleWatchedClick}
          className={cn(BUTTON, "text-primary-foreground", state === "watched" ? BUTTON_FILLED : BUTTON_IDLE)}
        >
          {state === "watched" ? `✓ ${i18n.t("watched")}` : i18n.t("watched")}
        </Button>
      )}

      <ActionMenu {...menuProps} />
      <ReviewDrawer
        open={review.open}
        onOpenChange={(open) => setReview((prev) => ({ ...prev, open }))}
        media={movie}
        review={review.initial}
        onSubmitted={() => {
          // Для фильма не из «Хочу» (кнопка «Просмотрено», правка отзыва) removeFromWant ничего не делает
          userMoviesService.removeFromWant(movie.id)
          userMoviesService.addToWatched(movie)
        }}
      />
    </div>
  )
}

function TVShowActions({ tvShow }) {
  const haptic = useHaptic()
  const state = useListState(tvShow)
  const { menuProps, showMenu } = useActionMenu()
  useSeasonTransitions(tvShow)

  const id = tvShow.id

  const clearSeasons = () => {
    dispatch("tv-action", { tvId: id, action: "clear-all-seasons" })
    dispatch("season-reviews-removed", { tvId: id })
  }
  const markAllWatched = () => dispatch("tv-action", { tvId: id, action: "mark-all-watched" })

  const handleWantClick = () => {
    haptic.light()
    if (state !== "want") {
      userMoviesService.addTVShowToWant(tvShow)
      return
    }
    showMenu(
      i18n.t("want"),
      [
        { label: i18n.t("removeFromWant"), action: "remove-from-want" },
        { label: i18n.t("imWatchingThis"), action: "watching" },
        { label: i18n.t("markAllAsWatched"), action: "mark-all-watched" },
      ],
      (action) => {
        if (action === "remove-from-want") {
          userMoviesService.removeTVShowFromWant(id)
        } else if (action === "watching") {
          userMoviesService.removeTVShowFromWant(id)
          userMoviesService.addTVShowToWatching(tvShow)
        } else if (action === "mark-all-watched") {
          userMoviesService.removeTVShowFromWant(id)
          userMoviesService.addTVShowToWatched(tvShow)
          markAllWatched()
        }
      }
    )
  }

  const handleWatchingClick = () => {
    haptic.light()
    showMenu(
      i18n.t("watching"),
      [
        { label: i18n.t("removeFromWatching"), action: "remove-from-watching" },
        { label: i18n.t("markAllAsWatched"), action: "mark-all-watched" },
        { label: i18n.t("moveToWant"), action: "move-to-want" },
      ],
      (action) => {
        if (action === "remove-from-watching") {
          userMoviesService.removeTVShowFromWatching(id)
          userMoviesService.removeAllSeasonReviews(id)
          clearSeasons()
        } else if (action === "mark-all-watched") {
          userMoviesService.removeTVShowFromWatching(id)
          userMoviesService.addTVShowToWatched(tvShow)
          markAllWatched()
        } else if (action === "move-to-want") {
          userMoviesService.removeTVShowFromWatching(id)
          userMoviesService.removeAllSeasonReviews(id)
          userMoviesService.addTVShowToWant(tvShow)
          clearSeasons()
        }
      }
    )
  }

  const handleWatchedClick = () => {
    haptic.light()
    // Без состояния меню предлагает начать просмотр
    const options =
      state === "none"
        ? [
            { label: i18n.t("markAllAsWatched"), action: "mark-all-watched" },
            { label: i18n.t("imWatchingThis"), action: "watching" },
          ]
        : [
            { label: i18n.t("removeFromWatched"), action: "remove-from-watched" },
            { label: i18n.t("moveToWant"), action: "move-to-want" },
          ]
    showMenu(i18n.t("watched"), options, (action) => {
      if (action === "remove-from-watched") {
        userMoviesService.removeTVShowFromWatched(id)
        userMoviesService.removeAllSeasonReviews(id)
        clearSeasons()
      } else if (action === "move-to-want") {
        userMoviesService.removeTVShowFromWatched(id)
        userMoviesService.removeAllSeasonReviews(id)
        userMoviesService.addTVShowToWant(tvShow)
        clearSeasons()
      } else if (action === "mark-all-watched") {
        userMoviesService.addTVShowToWatched(tvShow)
        markAllWatched()
      } else if (action === "watching") {
        userMoviesService.addTVShowToWatching(tvShow)
      }
    })
  }

  return (
    <div className="flex gap-2 p-4">
      {(state === "none" || state === "want") && (
        <Button
          type="button"
          variant="tonal"
          onClick={handleWantClick}
          className={cn(BUTTON, "text-white", state === "want" ? BUTTON_OUTLINED : BUTTON_IDLE)}
        >
          {state === "want" ? `✓ ${i18n.t("want")}` : i18n.t("want")}
        </Button>
      )}
      {state === "watching" && (
        <Button
          type="button"
          variant="tonal"
          onClick={handleWatchingClick}
          className={cn(BUTTON, "text-white", BUTTON_FILLED)}
        >
          {i18n.t("watching")}
        </Button>
      )}
      {(state === "none" || state === "watched") && (
        <Button
          type="button"
          variant="tonal"
          onClick={handleWatchedClick}
          className={cn(BUTTON, "text-white", state === "watched" ? BUTTON_FILLED : BUTTON_IDLE)}
        >
          {state === "watched" ? `✓ ${i18n.t("watched")}` : i18n.t("watched")}
        </Button>
      )}

      <ActionMenu {...menuProps} />
    </div>
  )
}

// Кнопки под постером: у фильма want / watched, у сериала ещё watching
export function DetailsActions({ media }) {
  return media.media_type === "tv" ? <TVShowActions tvShow={media} /> : <MovieActions movie={media} />
}
