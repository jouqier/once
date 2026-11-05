import { memo, useCallback, useEffect, useReducer, useState } from "react"
import { userMoviesService } from "../../../services/user-movies.js"
import { i18n } from "../../../services/i18n.js"
import { useHaptic } from "@/hooks/use-telegram"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollRow } from "@/components/scroll-row"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReviewDrawer } from "./review-drawer"

function dispatch(name, detail) {
  document.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }))
}

// Проверки v1 по всем сезонам, кроме спецвыпусков (season_number 0)
function allEpisodesWatched(tvId, seasons) {
  return seasons.every((season) => {
    if (season.season_number === 0) return true
    const total = season.episodes?.length
    if (!total) return true
    return userMoviesService.isSeasonFullyWatched(tvId, season.season_number, total)
  })
}

function isLastUnwatchedEpisode(tvId, seasons, seasonNumber, episodeNumber) {
  let unwatched = 0
  seasons.forEach((season) => {
    if (season.season_number === 0) return
    season.episodes?.forEach((episode) => {
      // Эпизод, который сейчас отмечается, не считается
      if (season.season_number === seasonNumber && episode.episode_number === episodeNumber) return
      if (!userMoviesService.isEpisodeWatched(tvId, season.season_number, episode.episode_number)) unwatched++
    })
  })
  return unwatched === 0
}

function hasAnyWatchedEpisodes(tvId, seasons) {
  return seasons.some((season) => {
    if (season.season_number === 0) return false
    return season.episodes?.some((episode) =>
      userMoviesService.isEpisodeWatched(tvId, season.season_number, episode.episode_number)
    )
  })
}

// Галочка md-checkbox: два повёрнутых прямоугольника в поле 18×18
function CheckMark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className="size-[18px] fill-current">
      <g transform="matrix(0.707107 -0.707107 -0.707107 -0.707107 7 14)">
        <rect width="2" height="5.65685" />
        <rect width="11.3137" height="2" />
      </g>
    </svg>
  )
}

// Строка эпизода. memo: при отметке одного эпизода перерисовывается только его строка
const EpisodeRow = memo(function EpisodeRow({ seasonNumber, episode, watched, onToggle }) {
  const date = new Date(episode.air_date).toLocaleDateString(i18n.getLocale() === "ru" ? "ru-RU" : "en-US")

  return (
    <div>
      <div className="flex items-center gap-1 px-4 py-2.5">
        {/* Пробел перед точкой как в разметке v1: точка переносится под номер */}
        <div className="w-5 text-sm/5 font-semibold text-muted-foreground">
          {episode.episode_number}{" "}
          {!watched && <span className="ml-1 inline-block size-1.5 rounded-full bg-primary" />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="truncate text-sm/5 font-semibold text-foreground">{episode.name}</div>
          <div className="text-xs/4 font-semibold text-muted-foreground">{date}</div>
        </div>
        {/* touch-target="wrapper" в v1: поле 18px с полями до 48px */}
        <Checkbox
          checked={watched}
          onCheckedChange={(checked) => onToggle(seasonNumber, episode.episode_number, checked === true)}
          aria-label={episode.name}
          className="m-[15px] size-[18px] border-2 border-white/50 bg-transparent after:-inset-[15px] data-[state=checked]:border-(--md-sys-color-primary) data-[state=checked]:bg-(--md-sys-color-primary) data-[state=checked]:text-(--md-sys-color-on-primary) dark:bg-transparent dark:data-[state=checked]:bg-(--md-sys-color-primary)"
        >
          <CheckMark />
        </Checkbox>
      </div>
      <div className="mx-4 my-2 h-px bg-card" />
    </div>
  )
})

// md-filled-tonal-button v1: заливка surface-container-high, шрифт кнопки по умолчанию (system-ui),
// без рамки и сдвига при нажатии
const ACTION_BUTTON =
  "h-10 flex-1 border-0 bg-muted bg-clip-border px-6 font-[family-name:system-ui] text-sm/5 font-medium text-foreground hover:bg-muted active:not-aria-[haspopup]:translate-y-0"

function SeasonActions({ fullyWatched, hasReview, onMarkWatched, onMarkUnwatched, onRate }) {
  return (
    <div className="flex gap-2 px-4 py-2">
      {fullyWatched ? (
        <>
          {!hasReview && (
            <Button type="button" variant="tonal" onClick={onRate} className={ACTION_BUTTON}>
              {i18n.t("rateSeason")}
            </Button>
          )}
          <Button type="button" variant="tonal" onClick={onMarkUnwatched} className={ACTION_BUTTON}>
            {i18n.t("markAsUnwatched")}
          </Button>
        </>
      ) : (
        <Button type="button" variant="tonal" onClick={onMarkWatched} className={ACTION_BUTTON}>
          {i18n.t("markAsWatched")}
        </Button>
      )}
    </div>
  )
}

/**
 * Сезоны и эпизоды сериала (v1 show-card-seasons.js, <tv-seasons>).
 * Вкладки сезонов с эпизодами, отметка эпизодов, отметка сезона целиком, оценка сезона.
 * События и вызовы userMoviesService те же, что в v1: episode-checkbox-changed,
 * season-marked-watched, season-marked-unwatched; tv-action от кнопок под постером
 * отмечает или снимает все сезоны.
 */
export function DetailsSeasons({ show }) {
  const haptic = useHaptic()
  const tvId = show.id
  const seasons = show.seasons
  // Отметки хранятся в сервисе, version только перерисовывает блок
  const [, refresh] = useReducer((n) => n + 1, 0)
  const [currentSeasonNumber, setCurrentSeasonNumber] = useState(1)
  const [review, setReview] = useState({ open: false })

  // Кнопки под постером: tv-action с отметкой всех сезонов
  useEffect(() => {
    if (!seasons?.length) return
    const handleTvAction = (event) => {
      if (event.detail.tvId !== tvId) return
      const { action } = event.detail
      if (action === "mark-all-watched") {
        haptic.medium()
        seasons.forEach((season) => {
          if (season.season_number === 0) return
          season.episodes?.forEach((episode) => {
            userMoviesService.markEpisodeAsWatched(tvId, season.season_number, episode.episode_number)
          })
        })
      } else if (action === "mark-all-unwatched" || action === "clear-all-seasons") {
        if (action === "mark-all-unwatched") haptic.medium()
        else haptic.light()
        seasons.forEach((season) => {
          if (season.season_number === 0) return
          userMoviesService.markSeasonAsUnwatched(tvId, season.season_number)
        })
      } else {
        return
      }
      refresh()
    }
    document.addEventListener("tv-action", handleTvAction)
    return () => document.removeEventListener("tv-action", handleTvAction)
  }, [tvId, seasons, haptic])

  const handleEpisodeToggle = useCallback(
    (seasonNumber, episodeNumber, checked) => {
      haptic.medium()
      // Состояние до изменения
      const wasAllWatched = allEpisodesWatched(tvId, seasons)
      const isLastUnwatched = checked && isLastUnwatchedEpisode(tvId, seasons, seasonNumber, episodeNumber)

      if (checked) {
        userMoviesService.markEpisodeAsWatched(tvId, seasonNumber, episodeNumber)
      } else {
        userMoviesService.markEpisodeAsUnwatched(tvId, seasonNumber, episodeNumber)
      }

      dispatch("episode-checkbox-changed", {
        tvId,
        seasonNumber,
        episodeNumber,
        checked,
        isLastUnwatched,
        wasAllWatched,
        isBulkOperation: false,
      })
      refresh()
    },
    [tvId, seasons, haptic]
  )

  if (!seasons?.length) return <div className="flex flex-col" />

  const tabs = seasons.filter((season) => season.episodes?.length > 0)
  const season = seasons.find((item) => item.season_number === currentSeasonNumber)
  const shown = season?.episodes?.length ? season : null
  // Как в v1: если сезона нет, остаётся выбранной первая вкладка, а эпизоды не показываются
  const selected = shown ? currentSeasonNumber : tabs[0]?.season_number

  // Выбор вкладки делает onValueChange (Radix выбирает по mousedown и фокусу), здесь отклик как в v1:
  // haptic на каждое нажатие, в том числе по уже выбранному сезону
  const handleSeasonClick = (seasonNumber) => {
    haptic.light()
    setCurrentSeasonNumber(seasonNumber)
  }

  const markSeasonWatched = () => {
    haptic.medium()
    // Как в v1: номера 1..N по числу эпизодов сезона
    for (let i = 1; i <= shown.episodes.length; i++) {
      userMoviesService.markEpisodeAsWatched(tvId, shown.season_number, i)
    }
    dispatch("season-marked-watched", { tvId, allEpisodesWatched: allEpisodesWatched(tvId, seasons) })
    refresh()
  }

  const markSeasonUnwatched = () => {
    haptic.medium()
    const wasAllWatched = allEpisodesWatched(tvId, seasons)
    userMoviesService.markSeasonAsUnwatched(tvId, shown.season_number)
    dispatch("season-marked-unwatched", {
      tvId,
      wasAllWatched,
      hasAnyWatchedEpisodes: hasAnyWatchedEpisodes(tvId, seasons),
    })
    refresh()
  }

  // Атрибуты season-number и tv-id в v1 были строками, с ними же уходит season-review-submitted
  const rateSeason = () => {
    haptic.light()
    setReview({
      open: true,
      media: { ...shown, name: show.name || "", media_type: "tv_season" },
      seasonNumber: String(shown.season_number),
      review: userMoviesService.getSeasonReview(tvId, shown.season_number),
    })
  }

  return (
    <div className="flex flex-col">
      <Tabs
        value={selected === undefined ? "" : String(selected)}
        onValueChange={(value) => setCurrentSeasonNumber(Number(value))}
        className="gap-0"
      >
        <ScrollRow innerScrolls={false} className="gap-0">
          <TabsList className="h-10 w-max justify-start gap-1 rounded-none bg-transparent p-0 group-data-[orientation=horizontal]/tabs:h-10">
            {tabs.map((item) => (
              <TabsTrigger
                key={item.season_number}
                value={String(item.season_number)}
                onClick={() => handleSeasonClick(item.season_number)}
                className="h-10 flex-none touch-manipulation rounded-full border-0 px-4 py-0 text-sm/5 font-medium text-foreground hover:text-foreground data-[state=active]:bg-card data-[state=active]:shadow-none dark:text-foreground dark:data-[state=active]:bg-card"
              >
                {i18n.t("season")} {item.season_number}
              </TabsTrigger>
            ))}
            {/* Отступ в конце прокрутки, как в v1 */}
            <div aria-hidden="true" className="shrink-0 pr-1">
              &nbsp;
            </div>
          </TabsList>
        </ScrollRow>
      </Tabs>

      <div className="flex flex-col pt-2">
        {shown && (
          <>
            {shown.episodes.map((episode) => (
              <EpisodeRow
                key={episode.episode_number}
                seasonNumber={shown.season_number}
                episode={episode}
                watched={userMoviesService.isEpisodeWatched(tvId, shown.season_number, episode.episode_number)}
                onToggle={handleEpisodeToggle}
              />
            ))}
            <SeasonActions
              fullyWatched={userMoviesService.isSeasonFullyWatched(tvId, shown.season_number, shown.episodes.length)}
              hasReview={Boolean(userMoviesService.getSeasonReview(tvId, shown.season_number))}
              onMarkWatched={markSeasonWatched}
              onMarkUnwatched={markSeasonUnwatched}
              onRate={rateSeason}
            />
          </>
        )}
      </div>

      <ReviewDrawer
        open={review.open}
        onOpenChange={(open) => setReview((prev) => ({ ...prev, open }))}
        media={review.media}
        review={review.review}
        seasonNumber={review.seasonNumber}
        tvId={String(tvId)}
        // В v1 слушатель на диалоге должен был обновить кнопки сезона, но событие шло в document
        onSubmitted={refresh}
      />
    </div>
  )
}
