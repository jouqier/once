import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { TG } from "../../config/telegram.js"
import { navigationManager } from "../../config/navigation.js"
import { userMoviesService } from "../../services/user-movies.js"
import { userFollowingService } from "../../services/user-following.js"
import { i18n } from "../../services/i18n.js"
import { API_CONFIG } from "../../config/api.js"
import { useFollowing, useUserList } from "@/hooks/use-user-list"
import { useMediaProgress } from "@/hooks/use-media-progress"
import { useHaptic } from "@/hooks/use-telegram"
import { selectMedia } from "@/lib/select-media"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MediaPoster } from "@/components/media-poster"
import { InitialAvatar, ProfileAvatar } from "@/components/profile-avatar"

const TABS = [
  { value: "want", label: "want" },
  { value: "watched", label: "watched" },
  { value: "tvshows", label: "tvShows" },
  { value: "following", label: "following" },
]
const TAB_VALUES = TABS.map((tab) => tab.value)

// Тексты пустых вкладок и вкладка, которую открывает кнопка (tab-changed), как в v1
const EMPTY_STATES = {
  want: { title: "wantListEmpty", description: "startAddingToWant", action: "browseMovies", tab: "movies" },
  watched: { title: "watchedListEmpty", description: "startAddingToWatched", action: "browseMovies", tab: "movies" },
  tvshows: { title: "tvShowsListEmpty", description: "startAddingTVShows", action: "browseTVShows", tab: "tv" },
  following: { title: "followingListEmpty", description: "startAddingToFollowing", action: "browseActors", tab: "search" },
}

// Как в v1: позиция скролла вкладок сохраняется через 200 мс после остановки прокрутки
const SAVE_SCROLL_DEBOUNCE_MS = 200

const posterCellClass =
  "aspect-2/3 cursor-pointer transition-transform duration-200 will-change-transform active:scale-95 hover:scale-[1.02]"

function mediaKey({ type, id }) {
  return `${type}:${id}`
}

function ProfileTab({ value, label, count }) {
  return (
    <TabsTrigger
      value={value}
      className="h-10 flex-none touch-manipulation rounded-full border-0 px-4 py-0 text-sm/5 font-medium text-foreground hover:text-foreground data-[state=active]:bg-card data-[state=active]:shadow-none dark:text-foreground dark:data-[state=active]:bg-card"
    >
      <span>
        {label} <span className="ml-1 text-muted-foreground">{count}</span>
      </span>
    </TabsTrigger>
  )
}

function ProfileEmpty({ tab }) {
  const { title, description, action, tab: target } = EMPTY_STATES[tab]

  // Как в v1: кнопка шлёт tab-changed, переход делает обработчик в bootstrap
  const handleAction = (event) => {
    event.currentTarget.dispatchEvent(
      new CustomEvent("tab-changed", {
        detail: { tab: target },
        bubbles: true,
        composed: true,
      })
    )
  }

  return (
    <Empty className="flex-auto gap-2 rounded-none border-0 px-4 py-12 text-wrap">
      <EmptyHeader>
        <EmptyTitle className="text-[22px]/7 font-semibold tracking-normal text-foreground">{i18n.t(title)}</EmptyTitle>
        <EmptyDescription className="mb-6 text-xs/4 font-semibold">{i18n.t(description)}</EmptyDescription>
      </EmptyHeader>
      <Button
        variant="tonal"
        onClick={handleAction}
        className="border-0 bg-card font-[family-name:system-ui] font-medium text-foreground hover:bg-[color-mix(in_oklch,var(--card),var(--foreground)_8%)]"
      >
        {i18n.t(action)}
      </Button>
    </Empty>
  )
}

function FollowingPerson({ person, onSelect }) {
  const imageUrl = person.profile_path ? `${API_CONFIG.IMAGE_BASE_URL}${person.profile_path}` : null

  return (
    <button
      type="button"
      onClick={(event) => onSelect(event, person)}
      className="flex cursor-pointer flex-col items-center gap-2 transition-transform duration-200 will-change-transform active:scale-95 hover:scale-105"
    >
      <InitialAvatar
        src={imageUrl}
        alt={person.name}
        initial={person.name?.charAt(0).toUpperCase() || "?"}
        className="aspect-square h-auto w-full bg-card"
        fallbackClassName="text-[32px]"
      />
      <div className="line-clamp-2 w-full text-center text-xs/4 font-semibold text-foreground">{person.name}</div>
    </button>
  )
}

export function ProfileScreen({ state }) {
  const haptic = useHaptic()
  const [user] = useState(() => TG?.initDataUnsafe?.user || null)
  const [activeTab, setActiveTab] = useState(() =>
    TAB_VALUES.includes(state.activeTab) ? state.activeTab : "want"
  )
  const activeTabRef = useRef(activeTab)
  const tabsScrollRef = useRef(null)
  const saveTimerRef = useRef(null)
  const userDataRequestedRef = useRef(false)
  const mountedRef = useRef(false)

  // Списки из локального хранилища: вкладки и счётчики рисуются сразу, без запросов к TMDB
  const wantMovies = useUserList("movies", "want")
  const watchedMovies = useUserList("movies", "watched")
  const tvWant = useUserList("tv", "want")
  const tvWatching = useUserList("tv", "watching")
  const tvWatched = useUserList("tv", "watched")
  const following = useFollowing()

  // Последние добавленные сверху, как getMoviesByRecent в v1
  const wantItems = useMemo(() => [...wantMovies].reverse().map((id) => ({ id, type: "movie" })), [wantMovies])
  const watchedItems = useMemo(() => [...watchedMovies].reverse().map((id) => ({ id, type: "movie" })), [watchedMovies])
  // Сериалы из всех трёх списков, последние добавленные сверху по tv_order (getTVShowsOrder), как в v1.
  // Сервис читает хранилище сам, снимки списков в зависимостях только говорят, когда пересчитать
  const tvItems = useMemo(
    () => userMoviesService.getTVShowsByRecent().map((id) => ({ id, type: "tv" })),
    [tvWant, tvWatching, tvWatched]
  )

  const counts = {
    want: wantMovies.length,
    watched: watchedMovies.length,
    tvshows: tvItems.length,
    following: following.length,
  }

  const mediaItems = { want: wantItems, watched: watchedItems, tvshows: tvItems }[activeTab] ?? null

  // Детали по ключу type:id: undefined — ещё грузятся, null — ошибка (ячейка убирается, как в v1).
  // Хранятся, пока экран открыт, поэтому вернуться на открытую вкладку можно без скелетонов
  const [details, setDetails] = useState({})
  const requestedRef = useRef(new Set())
  const { progress } = useMediaProgress()

  // Подписки: { key, persons }, key — список id, для которого загружены детали
  const [people, setPeople] = useState(null)
  const followingKey = following.join(",")

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
  }, [])

  // Как в v1 (connectedCallback): при открытии профиля запрашиваем свежие данные пользователя
  useLayoutEffect(() => {
    if (userDataRequestedRef.current) return
    userDataRequestedRef.current = true
    document.dispatchEvent(new CustomEvent("tg-user-data-updated"))
  }, [])

  // Возврат на профиль: при открытии восстанавливаем горизонтальный скролл вкладок из состояния навигации
  useLayoutEffect(() => {
    const position = parseInt(state.tabsScrollPosition, 10)
    if (!Number.isNaN(position) && tabsScrollRef.current) {
      tabsScrollRef.current.scrollLeft = position
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Сетка ячеек рисуется сразу, каждая обложка подставляется, как только пришли её детали
  useEffect(() => {
    if (!mediaItems) return
    mediaItems.forEach((item) => {
      const key = mediaKey(item)
      if (requestedRef.current.has(key)) return
      requestedRef.current.add(key)
      userMoviesService.getMediaDetails(item.type, item.id).then((result) => {
        if (!mountedRef.current) return
        setDetails((prev) => ({ ...prev, [key]: result }))
      })
    })
  }, [mediaItems])

  useEffect(() => {
    if (activeTab !== "following" || following.length === 0 || people?.key === followingKey) return
    let cancelled = false
    userFollowingService.getFollowingWithDetails().then((persons) => {
      if (!cancelled) setPeople({ key: followingKey, persons: persons || [] })
    })
    return () => {
      cancelled = true
    }
  }, [activeTab, following.length, followingKey, people?.key])

  const saveProfileState = useCallback(() => {
    const scrollLeft = tabsScrollRef.current ? tabsScrollRef.current.scrollLeft : 0
    navigationManager.updateProfileState(activeTabRef.current, scrollLeft)
  }, [])

  const handleTabsScroll = () => {
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      saveProfileState()
    }, SAVE_SCROLL_DEBOUNCE_MS)
  }

  const handleTabChange = (value) => {
    if (value === activeTabRef.current) return
    haptic.light()
    activeTabRef.current = value
    setActiveTab(value)
    saveProfileState()

    // v1 заново запрашивал детали при каждом открытии вкладки: даём неудачным запросам ещё попытку
    const failed = Object.keys(details).filter((key) => details[key] === null)
    if (failed.length > 0) {
      failed.forEach((key) => requestedRef.current.delete(key))
      setDetails((prev) => {
        const next = { ...prev }
        failed.forEach((key) => delete next[key])
        return next
      })
    }
  }

  // haptic уже дал MediaPoster
  const handleMediaSelect = (item, type) => {
    saveProfileState()
    selectMedia(item, type)
  }

  const handlePersonSelect = (event, person) => {
    haptic.light()
    saveProfileState()
    event.currentTarget.dispatchEvent(
      new CustomEvent("person-selected", {
        detail: { personId: String(person.id) },
        bubbles: true,
        composed: true,
      })
    )
  }

  const renderMediaGrid = () => {
    if (mediaItems.length === 0) return <ProfileEmpty tab={activeTab} />

    return (
      <div className="grid w-full grid-cols-[repeat(2,minmax(0,1fr))] gap-2 px-4 py-2">
        {mediaItems.map((item) => {
          const key = mediaKey(item)
          const data = details[key]
          if (data === null) return null
          if (data === undefined) return <Skeleton key={key} className="aspect-2/3 rounded-[8px]" />

          const isTv = item.type === "tv"
          const itemProgress = isTv
            ? progress[item.id] ?? userMoviesService.getShowProgressFromDetails(item.id, data)
            : null
          return (
            <div key={key} className={posterCellClass}>
              <MediaPoster
                item={data}
                type={item.type}
                onSelect={handleMediaSelect}
                userRating={isTv ? undefined : userMoviesService.getReview("movie", item.id)?.rating}
                watchedEpisodes={itemProgress ? itemProgress.watchedEpisodes || 0 : undefined}
                totalEpisodes={itemProgress ? itemProgress.totalEpisodes || 0 : undefined}
              />
            </div>
          )
        })}
      </div>
    )
  }

  const renderFollowing = () => {
    if (following.length === 0) return <ProfileEmpty tab="following" />

    const persons = people?.key === followingKey ? people.persons : null
    if (persons && persons.length === 0) return <ProfileEmpty tab="following" />

    return (
      <div className="grid w-full grid-cols-[repeat(3,minmax(0,1fr))] gap-4 p-4">
        {persons
          ? persons.map((person) => (
              <FollowingPerson key={person.id} person={person} onSelect={handlePersonSelect} />
            ))
          : following.map((id) => (
              <div key={id} className="flex flex-col items-center gap-2">
                <Skeleton className="aspect-square w-full rounded-full" />
              </div>
            ))}
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-2 leading-[normal]">
      <ProfileAvatar user={user} />

      {/* В v1 счётчики (<profile-stats>, src/app/components/profile-stats.jsx) закомментированы в разметке:
          <ProfileStats place={481516} following={counts.following} followers={42} /> */}

      <div className="flex flex-col items-start self-stretch overflow-hidden rounded-[36px]">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full gap-0">
          <div
            className={
              "relative h-14 touch-none self-stretch py-2 " +
              "before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:z-1 before:w-4 before:bg-linear-to-r before:from-scrim before:to-transparent before:content-[''] " +
              "after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:z-1 after:w-4 after:bg-linear-to-l after:from-scrim after:to-transparent after:content-['']"
            }
          >
            <div
              ref={tabsScrollRef}
              onScroll={handleTabsScroll}
              className="size-full touch-pan-x overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <TabsList className="h-10 w-max touch-pan-x items-start justify-start gap-0 rounded-none bg-transparent p-0 pl-4 group-data-[orientation=horizontal]/tabs:h-10">
                {TABS.map((tab) => (
                  <ProfileTab key={tab.value} value={tab.value} label={i18n.t(tab.label)} count={counts[tab.value]} />
                ))}
                {/* Отступ в конце прокрутки, как в v1 */}
                <div aria-hidden="true" className="shrink-0 pr-2">&nbsp;</div>
              </TabsList>
            </div>
          </div>
          <TabsContent value={activeTab} className="flex min-h-0 w-full flex-none flex-col items-center">
            {activeTab === "following" ? renderFollowing() : renderMediaGrid()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
