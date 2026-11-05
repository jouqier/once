import { useEffect, useMemo, useState } from "react"
import TMDBService from "../../services/tmdb.js"
import { API_CONFIG } from "../../config/api.js"
import { navigationManager } from "../../config/navigation.js"
import { userMoviesService } from "../../services/user-movies.js"
import { userFollowingService } from "../../services/user-following.js"
import { i18n } from "../../services/i18n.js"
import { useFollowing } from "@/hooks/use-user-list"
import { useMediaProgress } from "@/hooks/use-media-progress"
import { useHaptic } from "@/hooks/use-telegram"
import { selectMedia } from "@/lib/select-media"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MediaPoster } from "@/components/media-poster"

const SKELETON_COUNT = 6

// Сначала новые, записи без даты уходят в конец, как в v1
function sortByDate(items, field) {
  return [...items].sort((a, b) => {
    const dateA = a[field] ? new Date(a[field]) : new Date(0)
    const dateB = b[field] ? new Date(b[field]) : new Date(0)
    return dateB - dateA
  })
}

function PersonHeader({ person, loading, personId }) {
  const haptic = useHaptic()
  const following = useFollowing()
  const isFollowing = following.includes(personId)
  const photoUrl = person?.profile_path ? `${API_CONFIG.IMAGE_BASE_URL}${person.profile_path}` : null

  const handleFollow = () => {
    haptic.light()
    if (!person || !personId) return
    if (isFollowing) {
      userFollowingService.unfollow(personId)
    } else {
      userFollowingService.follow(personId)
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center self-stretch overflow-hidden rounded-[40px]">
      <div
        className="absolute inset-0 bg-card"
        style={photoUrl ? { background: `url(${photoUrl}) lightgray 50% / cover no-repeat` } : undefined}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#000_0%,rgba(0,0,0,0.60)_80%)] backdrop-blur-[20px]" />
      <div className="relative flex flex-col items-center gap-4 self-stretch px-4 pt-8 pb-4">
        {loading ? (
          <>
            <Skeleton className="size-[120px] rounded-full" />
            <div className="flex flex-col items-center gap-1">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-12 w-full rounded-full" />
          </>
        ) : (
          <>
            <Avatar className="size-[120px] overflow-hidden bg-card after:hidden">
              {photoUrl && <AvatarImage src={photoUrl} alt={person.name} />}
              <AvatarFallback className="bg-linear-to-br from-[#FF6B6B] to-[#4ECDC4] text-5xl/normal font-semibold text-white">
                {person?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {person?.name && (
              <>
                <div className="flex flex-col items-center gap-1 text-white">
                  <div className="text-center text-[22px]/7 font-semibold">{person.name}</div>
                  <div className="text-center text-sm/5 font-semibold text-muted-foreground">
                    {person.known_for_department}
                  </div>
                </div>
                <div className="flex w-full">
                  <Button
                    variant="tonal"
                    onClick={handleFollow}
                    className={cn(
                      "h-12 flex-1 transition-all duration-300",
                      isFollowing
                        ? "border-2 border-foreground bg-transparent text-foreground hover:bg-transparent"
                        : "bg-primary text-primary-foreground hover:bg-primary"
                    )}
                  >
                    {isFollowing ? i18n.t("followingButton") : i18n.t("follow")}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function TabTrigger({ value, label, count }) {
  return (
    <TabsTrigger
      value={value}
      className="h-10 flex-none gap-1 rounded-full px-4 text-sm font-semibold text-foreground hover:text-foreground data-[state=active]:bg-card data-[state=active]:shadow-none dark:text-foreground dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-card"
    >
      {label}
      <span className="text-muted-foreground">{count}</span>
    </TabsTrigger>
  )
}

export function PersonScreen({ state }) {
  const { personId: rawPersonId } = state
  const personId = parseInt(rawPersonId, 10)
  const haptic = useHaptic()

  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState(state.activeTab === "tv" ? "tv" : "movies")
  const [tvReady, setTvReady] = useState(false)
  const { progress, mergeProgress } = useMediaProgress()

  useEffect(() => {
    let cancelled = false
    setData(null)
    setTvReady(false)

    async function load() {
      try {
        const [person, credits] = await Promise.all([
          TMDBService.getPersonDetails(rawPersonId),
          TMDBService.getPersonCredits(rawPersonId),
        ])
        if (cancelled) return
        setData({
          person,
          movies: sortByDate(credits.movie_credits?.cast || [], "release_date"),
          tvShows: sortByDate(credits.tv_credits?.cast || [], "first_air_date"),
        })
      } catch (error) {
        console.error("Error loading person data:", error)
        if (!cancelled) setData({ person: null, movies: [], tvShows: [] })
      }
    }
    load()

    return () => {
      cancelled = true
    }
  }, [rawPersonId])

  // Прогресс сериалов подгружается один раз, когда открывается вкладка сериалов, как в v1
  useEffect(() => {
    if (!data || activeTab !== "tv" || tvReady) return
    let cancelled = false
    Promise.all(data.tvShows.map((show) => userMoviesService.getShowProgress(show.id)))
      .then((shows) => {
        if (cancelled) return
        const next = {}
        data.tvShows.forEach((show, index) => {
          if (shows[index]) next[show.id] = shows[index]
        })
        mergeProgress(next)
        setTvReady(true)
      })
      .catch((error) => {
        console.error("Error loading show progress:", error)
        if (!cancelled) setTvReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [data, activeTab, tvReady, mergeProgress])

  const handleTabChange = (value) => {
    if (value === activeTab) return
    haptic.light()
    setActiveTab(value)
    navigationManager.updatePersonActiveTab(rawPersonId, value)
  }

  const isTv = activeTab === "tv"
  const items = useMemo(() => (data ? (isTv ? data.tvShows : data.movies) : []), [data, isTv])
  const mediaType = isTv ? "tv" : "movie"
  const showSkeletons = !data || (isTv && !tvReady)

  return (
    <div className="flex flex-col gap-2 leading-[normal]">
      <PersonHeader person={data?.person} loading={!data} personId={personId} />

      <div className="flex flex-col items-start self-stretch overflow-hidden rounded-[36px]">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full gap-0">
          <div className="h-14 self-stretch overflow-x-auto overflow-y-hidden py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList className="h-10 w-max gap-0 rounded-none bg-transparent p-0 px-4 group-data-[orientation=horizontal]/tabs:h-10">
              <TabTrigger value="movies" label="Movies" count={data?.movies.length ?? 0} />
              <TabTrigger value="tv" label="TV Shows" count={data?.tvShows.length ?? 0} />
            </TabsList>
          </div>
          <TabsContent value={activeTab} className="min-w-0 flex-none">
            <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 px-4 py-2">
              {showSkeletons
                ? Array.from({ length: SKELETON_COUNT }, (_, index) => (
                    <Skeleton key={index} className="aspect-2/3 rounded-[8px]" />
                  ))
                : items.map((item, index) => {
                    const itemProgress = isTv ? progress[item.id] : undefined
                    return (
                      <div
                        key={`${item.id}-${index}`}
                        className={cn(
                          "aspect-2/3 cursor-pointer transition-transform duration-200 will-change-transform",
                          "active:scale-95 [@media(hover:hover)]:hover:scale-[1.02] [@media(hover:hover)]:active:scale-95"
                        )}
                      >
                        <MediaPoster
                          item={item}
                          type={mediaType}
                          onSelect={selectMedia}
                          userRating={isTv ? undefined : userMoviesService.getReview("movie", item.id)?.rating}
                          watchedEpisodes={itemProgress?.watchedEpisodes}
                          totalEpisodes={itemProgress?.totalEpisodes}
                        />
                      </div>
                    )
                  })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
