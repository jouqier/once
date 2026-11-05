import { useState } from "react"
import TMDBService from "../../../services/tmdb.js"
import { i18n } from "../../../services/i18n.js"
import { useHaptic } from "@/hooks/use-telegram"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollRow } from "@/components/scroll-row"

// Поля, которые v1 передавал в movie-info.info (movie-card.js / show-card.js)
function infoFor(media) {
  const genres = (media.genres || []).map((genre) => genre.name)
  if (media.media_type === "tv") {
    return {
      title: media.name,
      rating: media.vote_average,
      firstAirDate: media.first_air_date,
      lastAirDate: media.last_air_date,
      status: media.status,
      numberOfSeasons: media.number_of_seasons,
      numberOfEpisodes: media.number_of_episodes,
      overview: media.overview,
      genres,
      type: "tv",
      seasons: media.seasons,
    }
  }
  return {
    title: media.title,
    rating: media.vote_average,
    releaseDate: media.release_date,
    runtime: media.runtime,
    overview: media.overview,
    genres,
    type: "movie",
  }
}

function tvMeta({ rating, firstAirDate, lastAirDate, status }) {
  const startYear = firstAirDate ? new Date(firstAirDate).getFullYear() : "???"
  const endYear = lastAirDate
    ? new Date(lastAirDate).getFullYear()
    : status === "Ended"
      ? new Date().getFullYear()
      : i18n.t("present")
  const statusText = status === "Ended" ? i18n.t("statusEnded") : i18n.t("statusInProgress")
  return [`${rating} IMDb`, `${startYear} - ${endYear}`, statusText]
}

function movieMeta({ rating, releaseDate, runtime }) {
  const isRu = i18n.getLocale() === "ru"
  const formattedDate = new Date(releaseDate).toLocaleDateString(isRu ? "ru-RU" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const hours = Math.floor(runtime / 60)
  const minutes = runtime % 60
  const formattedRuntime = isRu ? `${hours} ч ${minutes} мин` : `${hours}h ${minutes}m`
  return [`${rating} IMDb`, formattedDate, formattedRuntime]
}

function GenreChips({ genres }) {
  const haptic = useHaptic()

  const handleClick = (event, genre) => {
    haptic.light()
    // Деталь события как в v1. Тип v1 брал из info.number_of_seasons / info.first_air_date, а в info
    // эти поля называются numberOfSeasons / firstAirDate, поэтому тип всегда 'movie'. from читался
    // из геттера movie у карточки, которого не было, поэтому всегда undefined.
    event.currentTarget.dispatchEvent(
      new CustomEvent("genre-selected", {
        detail: {
          genreId: TMDBService.getGenreId(genre),
          genreName: genre,
          from: undefined,
          type: "movie",
        },
        bubbles: true,
        composed: true,
      })
    )
  }

  return (
    <>
      <div className="flex flex-col items-start justify-center self-stretch px-4 pt-4 pb-1 text-sm/5 font-semibold text-muted-foreground">
        {i18n.t("genres")}
      </div>
      <ScrollRow innerScrolls={false} fade="background">
        {genres.map((genre) => (
          <Button
            key={genre}
            type="button"
            variant="tonal"
            onClick={(event) => handleClick(event, genre)}
            className="h-10 shrink-0 border-0 bg-card px-4 text-sm/5 font-medium text-foreground hover:bg-card"
          >
            {genre}
          </Button>
        ))}
        <div className="shrink-0 pr-1">&nbsp;</div>
      </ScrollRow>
    </>
  )
}

// Блок с названием, мета-строкой, описанием и жанрами (v1 movie-info, card-info.js)
export function DetailsInfo({ media }) {
  const [expanded, setExpanded] = useState(false)
  const info = infoFor(media)
  const meta = info.type === "tv" ? tvMeta(info) : movieMeta(info)
  const hasGenres = Array.isArray(info.genres) && info.genres.length > 0

  return (
    <div className="flex flex-col items-start self-stretch overflow-hidden rounded-[36px] bg-background py-2">
      <div className="flex flex-col items-center justify-center gap-2 self-stretch px-6 py-4">
        <div className="text-center text-[22px]/7 font-semibold text-foreground">{info.title}</div>
        <div className="flex items-start justify-center gap-1 self-stretch px-4 text-center text-xs/4 font-semibold text-muted-foreground">
          {meta.flatMap((part, index) =>
            index === 0
              ? [<span key={`p${index}`}>{part}</span>]
              : [<span key={`d${index}`}>•</span>, <span key={`p${index}`}>{part}</span>]
          )}
        </div>
      </div>

      <div
        className="relative flex cursor-pointer flex-col items-start justify-center self-stretch px-4 py-2"
        onClick={() => setExpanded((value) => !value)}
      >
        <p
          className={cn(
            "self-stretch overflow-hidden text-sm/5 font-semibold text-foreground transition-all duration-200",
            expanded ? "mb-3" : "line-clamp-3"
          )}
        >
          {info.overview}
        </p>
        <button
          type="button"
          className={cn(
            "absolute right-4 cursor-pointer border-0 bg-[linear-gradient(270deg,var(--background)_70%,transparent)] py-0 pr-0 pl-8 text-sm/normal font-semibold text-muted-foreground",
            expanded ? "bottom-0" : "bottom-2"
          )}
        >
          {expanded ? i18n.t("less") : i18n.t("more")}
        </button>
      </div>

      {hasGenres && <GenreChips genres={info.genres} />}
    </div>
  )
}
