import { useEffect, useMemo, useRef, useState } from "react"
import { SearchIcon, XIcon } from "lucide-react"
import TMDBService from "../../services/tmdb.js"
import { i18n } from "../../services/i18n.js"
import { userDataStore } from "../../services/user-data-store.js"
import { API_CONFIG } from "../../config/api.js"
import { useHaptic } from "@/hooks/use-telegram"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { PosterSkeleton } from "@/components/poster-skeleton"
import { SurpriseDrawer } from "@/components/surprise-drawer"

const DEBOUNCE_MS = 300
const TAB_KEYS = ["movies", "tv", "people"]
const TAB_LABELS = { movies: "movies", tv: "tvShows", people: "people" }
const TAB_TYPES = { movies: "movie", tv: "tv", people: "person" }

// Как в v1: карточки в горизонтальном ряду со скрытым скроллбаром
const rowClass =
  "flex items-start gap-2 self-stretch overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"

function selectMedia(event, movieId, type) {
  event.currentTarget.dispatchEvent(
    new CustomEvent("movie-selected", {
      detail: { movieId, type },
      bubbles: true,
      composed: true,
    })
  )
}

function PosterCard({ imageUrl, title, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-32 flex-none cursor-pointer border-0 bg-transparent p-0 text-foreground transition-transform duration-200",
        className
      )}
    >
      <img
        src={imageUrl}
        alt={title}
        loading="lazy"
        className="mb-2 block h-48 w-32 rounded-[8px] bg-muted object-cover"
      />
      <p className="m-0 truncate text-center text-sm leading-[normal] font-medium">{title}</p>
    </button>
  )
}

function SearchEmpty({ title, description }) {
  return (
    <Empty className="flex-auto gap-2 rounded-none border-0 px-4 py-12">
      <EmptyHeader>
        <EmptyTitle className="text-[22px]/7 font-semibold tracking-normal">{title}</EmptyTitle>
        <EmptyDescription className="mb-6 text-xs/4 font-semibold">{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function SearchScreen() {
  const haptic = useHaptic()
  const inputRef = useRef(null)
  const [query, setQuery] = useState("")
  // null: поиска ещё не было (или поле очищено); массив: ответ TMDB
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [activeTab, setActiveTab] = useState("movies")
  const [recentSearches, setRecentSearches] = useState(() => userDataStore.getRecentSearches())
  const [surpriseOpen, setSurpriseOpen] = useState(false)

  const trimmed = query.trim()

  // Автофокус через 100 мс, как в v1
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [])

  // Поиск с задержкой. Устаревший ответ отбрасывается
  useEffect(() => {
    if (!trimmed) {
      setResults(null)
      setSearching(false)
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      if (trimmed.length < 2) {
        setResults([])
        return
      }
      setSearching(true)
      try {
        const response = await TMDBService.searchMulti(trimmed)
        if (!cancelled) setResults(response.results)
      } catch (error) {
        console.error("Error searching:", error)
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [trimmed])

  const grouped = useMemo(() => {
    const list = results || []
    return {
      movies: list.filter((item) => item.media_type === "movie"),
      tv: list.filter((item) => item.media_type === "tv"),
      people: list.filter((item) => item.media_type === "person"),
    }
  }, [results])

  // Если в активной вкладке пусто, переходим на вкладку с результатами (и запоминаем её, как v1)
  const tab = useMemo(() => {
    if (grouped[activeTab].length > 0) return activeTab
    return TAB_KEYS.find((key) => grouped[key].length > 0) || activeTab
  }, [grouped, activeTab])

  useEffect(() => {
    if (tab !== activeTab) setActiveTab(tab)
  }, [tab, activeTab])

  const handleClear = () => {
    haptic.light()
    setQuery("")
    inputRef.current?.focus()
  }

  const handleOpenSurprise = () => {
    haptic.light()
    inputRef.current?.blur()
    setSurpriseOpen(true)
  }

  const handleResultClick = (event, item) => {
    haptic.light()
    userDataStore.addRecentSearch(item)
    setRecentSearches(userDataStore.getRecentSearches())
    selectMedia(event, item.id.toString(), item.media_type)
  }

  const handleRecentClick = (event, item) => {
    haptic.light()
    selectMedia(event, item.id.toString(), item.media_type)
  }

  const hasResults = results && results.length > 0
  const tabItems = grouped[tab]

  return (
    <div className="mx-auto max-w-160 leading-[normal]">
      <div className="flex flex-col items-center justify-center gap-4 self-stretch px-4 py-2">
        <div className="relative flex h-12 w-full items-center">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute left-3 size-6 text-muted-foreground"
          />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={i18n.t("moviesOrTVShows")}
            className="h-12 rounded-full border-0 bg-secondary px-12 py-3 text-sm/5 font-semibold text-muted-foreground focus-visible:ring-0 md:text-sm/5 dark:bg-secondary"
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={i18n.t("close")}
              onClick={handleClear}
              className="absolute top-3 right-3 size-6 text-muted-foreground hover:bg-transparent dark:hover:bg-transparent"
            >
              <XIcon />
            </Button>
          )}
        </div>

        {hasResults && (
          <div className="flex items-center self-stretch">
            {TAB_KEYS.filter((key) => grouped[key].length > 0).map((key) => (
              <Button
                key={key}
                type="button"
                variant="tonal"
                aria-pressed={tab === key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  "px-4 text-foreground",
                  tab === key ? "bg-card hover:bg-card" : "bg-transparent hover:bg-transparent"
                )}
              >
                {i18n.t(TAB_LABELS[key])} {grouped[key].length}
              </Button>
            ))}
          </div>
        )}
      </div>

      {!trimmed && (
        <div className="mb-6">
          {recentSearches.length > 0 && (
            <div className="flex flex-col items-start justify-center self-stretch pt-8 pr-4 pb-1 pl-4 text-sm/5 font-semibold text-muted-foreground">
              {i18n.t("recent")}
            </div>
          )}
          {recentSearches.length > 0 ? (
            <div className={rowClass}>
              {recentSearches.map((item) => {
                const path = item.media_type === "person" ? item.profile_path : item.poster_path
                return (
                  <PosterCard
                    key={`${item.media_type}_${item.id}`}
                    imageUrl={`https://image.tmdb.org/t/p/w342${path}`}
                    title={item.title || item.name}
                    onClick={(event) => handleRecentClick(event, item)}
                    className="active:scale-95"
                  />
                )
              })}
            </div>
          ) : (
            <SearchEmpty
              title={i18n.t("justStartTyping")}
              description={i18n.t("searchAmongMillions")}
            />
          )}
        </div>
      )}

      {trimmed && searching && results === null && (
        <div className={rowClass}>
          {[0, 1, 2].map((index) => (
            <PosterSkeleton key={index} size="small" />
          ))}
        </div>
      )}

      {trimmed && results && !hasResults && (
        <SearchEmpty
          title={i18n.t("nothingFound")}
          description={i18n.t("maybeNotFilmedYet")}
        />
      )}

      {trimmed && hasResults && (
        <div className={rowClass}>
          {tabItems.map((item) => {
            const path = TAB_TYPES[tab] === "person" ? item.profile_path : item.poster_path
            return (
              <PosterCard
                key={`${item.media_type}_${item.id}`}
                imageUrl={`${API_CONFIG.IMAGE_BASE_URL}${path}`}
                title={item.title || item.name}
                onClick={(event) => handleResultClick(event, item)}
                className="hover:scale-105"
              />
            )
          })}
        </div>
      )}

      {!query && (
        <div className="fixed inset-x-4 bottom-[calc(var(--tab-bar-height,0px)+16px)] z-10 mx-auto max-w-152">
          <Button
            type="button"
            onClick={handleOpenSurprise}
            className="h-12 w-full rounded-full text-base/6 font-semibold transition-transform duration-200 active:scale-[0.97]"
          >
            {i18n.t("surpriseMe")}
          </Button>
        </div>
      )}

      <SurpriseDrawer open={surpriseOpen} onOpenChange={setSurpriseOpen} />
    </div>
  )
}
