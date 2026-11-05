import { useMemo, useState } from "react"
import { API_CONFIG } from "../../../config/api.js"
import { i18n } from "../../../services/i18n.js"
import { useHaptic } from "@/hooks/use-telegram"
import { cn } from "@/lib/utils"
import { ScrollRow } from "@/components/scroll-row"

// Актёры, режиссёры и создатель сериала в порядке v1 (card-cast.js, set cast)
function castList(cast) {
  const filtered = cast.filter(
    (person) => person.character || person.job === "Director" || person.job === "Creator"
  )

  const directors = filtered.filter((person) => person.job === "Director")
  const creators = filtered.filter((person) => person.job === "Creator")
  // У сериала один создатель (первый), у фильма все режиссёры
  const crew = creators.length > 0 ? [creators[0]] : directors

  const actors = filtered.filter((person) => person.job !== "Director" && person.job !== "Creator")
  const unique = actors.reduce((acc, person) => {
    if (!acc.some((p) => p.id === person.id)) {
      const role = person.character ? person.character.split("/")[0].trim() : ""
      acc.push({ ...person, character: role, job: role })
    }
    return acc
  }, [])

  return [...crew.map((person) => ({ ...person, character: person.job })), ...unique]
}

// Фото грузится лениво, как IntersectionObserver в v1, поэтому здесь img, а не Avatar
// (Radix Avatar проверяет картинку через new Image() и загружает все фото сразу)
function CastPhoto({ person }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <div className="size-18 overflow-hidden rounded-full bg-muted">
      {failed ? (
        <div className="flex size-full items-center justify-center bg-muted text-2xl font-semibold text-foreground">
          {person.name.charAt(0).toUpperCase()}
        </div>
      ) : (
        <img
          src={`${API_CONFIG.IMAGE_BASE_URL}${person.profile_path}`}
          alt={person.name}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "size-full object-cover transition-opacity duration-300 ease-[ease]",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
    </div>
  )
}

// Ряд «Актёры и съёмочная группа» (v1 movie-cast)
export function DetailsCast({ cast }) {
  const haptic = useHaptic()
  const people = useMemo(() => castList(cast), [cast])

  if (people.length === 0) return null

  const handleClick = (event, person) => {
    haptic.light()
    // Навигацию делает общий обработчик person-selected из bootstrap.js
    event.currentTarget.dispatchEvent(
      new CustomEvent("person-selected", {
        detail: { personId: String(person.id) },
        bubbles: true,
        composed: true,
      })
    )
  }

  return (
    <div className="flex flex-col items-start self-stretch overflow-hidden rounded-[36px] bg-background py-2">
      <div className="flex flex-col items-center justify-center gap-2 self-stretch px-6 py-4">
        <div className="text-center text-[22px]/7 font-semibold text-foreground">{i18n.t("castAndCrew")}</div>
      </div>
      <ScrollRow innerScrolls={false} fade="background">
        {people.map((person, index) => (
          <button
            key={`${person.id}-${index}`}
            type="button"
            onClick={(event) => handleClick(event, person)}
            className="flex w-18 shrink-0 cursor-pointer flex-col items-center gap-2 border-0 bg-transparent p-0"
          >
            <CastPhoto person={person} />
            <div className="flex flex-col items-center self-stretch text-center text-xs/4 font-semibold">
              <p className="self-stretch text-foreground">{person.name}</p>
              <p className="self-stretch text-muted-foreground">{person.character || person.job}</p>
            </div>
          </button>
        ))}
        <div className="shrink-0 pr-1">&nbsp;</div>
      </ScrollRow>
    </div>
  )
}
