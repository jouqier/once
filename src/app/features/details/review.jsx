import { useEffect, useReducer, useState } from "react"
import { TG } from "../../../config/telegram.js"
import { userMoviesService } from "../../../services/user-movies.js"
import { i18n } from "../../../services/i18n.js"
import { useHaptic } from "@/hooks/use-telegram"
import { Badge } from "@/components/ui/badge"
import { InitialAvatar } from "@/components/profile-avatar"
import { ReviewDrawer } from "./review-drawer"

function readUser() {
  const user = TG?.initDataUnsafe?.user
  if (!user) return null
  return { firstName: user.first_name, lastName: user.last_name, photo: user.photo_url }
}

// Отзывы на сезоны, как _loadAllSeasonReviews в v1: без спецвыпусков, с номером сезона
function loadSeasonReviews(show) {
  if (!show.seasons) return []
  return show.seasons
    .filter((season) => season.season_number > 0)
    .map((season) => {
      const review = userMoviesService.getSeasonReview(show.id, season.season_number)
      return review ? { ...review, seasonNumber: season.season_number } : null
    })
    .filter(Boolean)
}

// Десять звёзд: заполненные цвета on-surface, остальные outline. Пробелы между звёздами
// как в разметке v1, где каждая звезда стояла в отдельном span с переносами строк
function RatingStars({ rating }) {
  return (
    <div className="text-[14px]">
      {Array.from({ length: 10 }, (_, index) => (
        <span
          key={index}
          // Пустые звёзды в цвет M3 outline: muted-foreground почти не отличается от заполненных
          className={index < rating ? "text-foreground" : "text-outline"}
        >
          {index < 9 ? "★ " : "★"}
        </span>
      ))}
    </div>
  )
}

function ReviewCard({ user, label, rating, text, onEdit }) {
  return (
    <div className="mx-4 my-2 flex flex-col gap-2 self-stretch rounded-[32px] bg-card p-4">
      <div className="flex items-center gap-4">
        <InitialAvatar
          src={user.photo}
          alt={user.name}
          initial={user.name.charAt(0)}
          className="size-10"
          fallbackClassName="bg-[linear-gradient(45deg,#7C3AED,#EC4899)] text-[16px]"
        />
        <div className="flex flex-1 flex-col">
          <div className="text-sm/5 font-semibold text-muted-foreground">{label}</div>
          <RatingStars rating={rating} />
        </div>
        {/* В v1 кнопка без стилей шрифта: системные 13.33px */}
        <button
          type="button"
          aria-label={i18n.t("editReview")}
          onClick={onEdit}
          className="cursor-pointer p-2 text-[13.3333px] text-muted-foreground"
        >
          ✏️
        </button>
      </div>
      {text && <p className="pl-14 text-sm/5 font-semibold text-foreground">{text}</p>}
    </div>
  )
}

/**
 * Блок отзывов на экране деталей (v1 card-review.js, <movie-review>).
 * Фильм: карточка с текстом отзыва (если он есть) и большая аватарка с оценкой.
 * Сериал: по карточке на каждый сезон с отзывом. Без отзывов блок не показывается.
 * Нажатие на карандаш или аватарку открывает ReviewDrawer с сохранённым отзывом.
 */
export function DetailsReview({ media }) {
  const haptic = useHaptic()
  const isTv = media.media_type === "tv"
  const [, refresh] = useReducer((n) => n + 1, 0)
  const [user] = useState(readUser)
  const [drawer, setDrawer] = useState({ open: false })

  // Отзывы читаются при рендере, события только перерисовывают блок.
  // Сравнение id как в обёртках v1: tvId из диалога сезона приходит строкой
  useEffect(() => {
    const handleMovie = (event) => {
      if (event.detail.movieId === media.id) refresh()
    }
    const handleSeason = (event) => {
      if (parseInt(event.detail.tvId) === media.id) refresh()
    }
    const events = isTv ? ["season-review-submitted", "season-reviews-removed"] : ["review-submitted", "review-removed"]
    const handler = isTv ? handleSeason : handleMovie
    events.forEach((name) => document.addEventListener(name, handler))
    return () => events.forEach((name) => document.removeEventListener(name, handler))
  }, [media, isTv])

  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || i18n.t("user")
  const author = { name: userName, photo: user?.photo || "" }

  const seasonReviews = isTv ? loadSeasonReviews(media) : []
  const movieReview = isTv ? null : userMoviesService.getReview(media.media_type || "movie", media.id)
  if (isTv ? seasonReviews.length === 0 : !movieReview) return null

  const openMovieReview = () => {
    haptic.light()
    setDrawer({ open: true, media, review: movieReview })
  }

  // Как в v1: номер сезона из data-season (строка), сезон берётся по индексу seasons[n - 1]
  const openSeasonReview = (seasonNumber) => {
    haptic.light()
    const number = String(seasonNumber)
    setDrawer({
      open: true,
      media: { ...media.seasons[number - 1], name: media.name, media_type: "tv_season" },
      seasonNumber: number,
      tvId: String(media.id),
      review: userMoviesService.getSeasonReview(media.id, seasonNumber),
    })
  }

  return (
    <div className="flex flex-col items-start self-stretch overflow-hidden rounded-[36px] bg-background py-2">
      <div className="flex flex-col items-center justify-center gap-2 self-stretch px-6 py-4">
        <div className="text-center text-[22px]/7 font-semibold text-foreground">{i18n.t("reviews")}</div>
      </div>

      {isTv ? (
        seasonReviews.map((review) => (
          <ReviewCard
            key={review.seasonNumber}
            user={author}
            label={`${userName} • ${i18n.t("season")} ${review.seasonNumber}`}
            rating={review.rating}
            text={review.text}
            onEdit={() => openSeasonReview(review.seasonNumber)}
          />
        ))
      ) : (
        <>
          {movieReview.text && (
            <ReviewCard
              user={author}
              label={userName}
              rating={movieReview.rating}
              text={movieReview.text}
              onEdit={openMovieReview}
            />
          )}
          <div className="flex items-center gap-2 self-stretch px-4 pt-2">
            <button
              type="button"
              aria-label={i18n.t("editReview")}
              onClick={openMovieReview}
              className="flex cursor-pointer flex-col items-center"
            >
              <InitialAvatar
                src={author.photo}
                alt={userName}
                initial={userName.charAt(0)}
                className="size-[72px] bg-secondary"
                fallbackClassName="bg-secondary bg-none text-[24px] text-foreground"
              />
              <Badge className="relative bottom-3 h-auto gap-1 rounded-full border-0 px-1.5 py-0.5 text-[11px]/4 font-semibold">
                <span>★</span>
                <span>{movieReview.rating}</span>
              </Badge>
            </button>
          </div>
        </>
      )}

      <ReviewDrawer
        open={drawer.open}
        onOpenChange={(open) => setDrawer((prev) => ({ ...prev, open }))}
        media={drawer.media}
        review={drawer.review}
        seasonNumber={drawer.seasonNumber}
        tvId={drawer.tvId}
      />
    </div>
  )
}
