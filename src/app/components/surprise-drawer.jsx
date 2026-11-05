import { useCallback, useEffect, useRef, useState } from "react"
import TMDBService from "../../services/tmdb.js"
import TMDBCacheService from "../../services/tmdb-cache.js"
import { userMoviesService } from "../../services/user-movies.js"
import { i18n } from "../../services/i18n.js"
import { API_CONFIG } from "../../config/api.js"
import { useHaptic } from "@/hooks/use-telegram"
import { cn } from "@/lib/utils"
import { AppDrawer } from "@/components/app-drawer"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

// Если персональных рекомендаций меньше, добиваем пул популярным
const MIN_POOL_SIZE = 8
// Сколько карточек мелькает за один прокрут
const SPIN_STEPS = 16
const SPIN_DURATION = 2000

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const keyOf = (item) => `${item.media_type}_${item.id}`

function posterUrl(item, size = "w500") {
  return `${API_CONFIG.IMAGE_BASE_URL.replace("/w500", `/${size}`)}${item.poster_path}`
}

function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = img.onerror = () => resolve()
    img.src = src
  })
}

async function loadPool() {
  const genresPromise = Promise.all([
    TMDBService.getGenreMap("movie").catch(() => ({})),
    TMDBService.getGenreMap("tv").catch(() => ({})),
  ])

  const [allMovies, allShows] = await Promise.all([
    userMoviesService.getAllMoviesWithDetails().catch(() => []),
    userMoviesService.getAllTVShowsWithDetails().catch(() => []),
  ])

  const movieWant = allMovies.filter((m) => userMoviesService.getMovieState(m.id) === "want")
  const movieWatched = allMovies.filter((m) => userMoviesService.getMovieState(m.id) === "watched")
  const tvWant = allShows.filter((s) => userMoviesService.getTVShowState(s.id) === "want")
  const tvWatched = allShows.filter((s) => userMoviesService.getTVShowState(s.id) === "watched")
  const tvWatching = allShows.filter((s) => userMoviesService.getTVShowState(s.id) === "watching")

  const [movies, shows] = await Promise.all([
    TMDBCacheService.getPersonalizedRecommendations(movieWant, movieWatched).catch(() => []),
    TMDBCacheService.getPersonalizedTVRecommendations(tvWant, tvWatched, tvWatching).catch(() => []),
  ])

  // Всё, что уже есть в списках пользователя, в пул не попадает
  const excluded = new Set([
    ...allMovies.map((m) => `movie_${m.id}`),
    ...allShows.map((s) => `tv_${s.id}`),
  ])

  const pool = []
  const addToPool = (items, type) => {
    for (const item of items || []) {
      const key = `${type}_${item.id}`
      if (!item.poster_path || excluded.has(key)) continue
      excluded.add(key)
      pool.push({ ...item, media_type: type })
    }
  }

  addToPool(movies, "movie")
  addToPool(shows, "tv")

  if (pool.length < MIN_POOL_SIZE) {
    const [popularMovies, popularShows] = await Promise.all([
      TMDBService.getPopularMovies().then((d) => d.results).catch(() => []),
      TMDBService.getPopularTV().then((d) => d.results).catch(() => []),
    ])
    addToPool(popularMovies, "movie")
    addToPool(popularShows, "tv")
  }

  const [movieGenres, tvGenres] = await genresPromise
  return { pool, genres: { movie: movieGenres, tv: tvGenres } }
}

function metaParts(item, genres) {
  const parts = []

  const genre = (genres[item.media_type] || {})[(item.genre_ids || [])[0]]
  if (genre) parts.push(genre)

  if (item.vote_average) parts.push(`${item.vote_average.toFixed(1)} IMDb`)

  const dateString = item.release_date || item.first_air_date
  if (dateString) {
    const locale = i18n.getLocale() === "ru" ? "ru-RU" : "en-US"
    parts.push(
      new Date(dateString).toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    )
  }

  return parts
}

// Содержимое Drawer монтируется при открытии и размонтируется после закрытия,
// поэтому каждый показ начинается с чистого состояния, как новый surprise-dialog в v1
function SurpriseBody({ onOpen }) {
  const haptic = useHaptic()
  // shown: { item, size, tick }; tick меняется на каждый кадр и перезапускает анимацию постера
  const [shown, setShown] = useState(null)
  const [spinning, setSpinning] = useState(true)
  const [empty, setEmpty] = useState(false)

  const aliveRef = useRef(null)
  const poolRef = useRef([])
  const shownKeysRef = useRef(new Set())
  const currentRef = useRef(null)
  const spinningRef = useRef(false)
  const [genres, setGenres] = useState({ movie: {}, tv: {} })

  const pickNext = () => {
    const pool = poolRef.current
    const shownKeys = shownKeysRef.current
    let candidates = pool.filter((item) => !shownKeys.has(keyOf(item)))
    if (!candidates.length) {
      // Всё уже показали, начинаем круг заново, кроме текущего
      shownKeys.clear()
      candidates = pool.filter((item) => !currentRef.current || keyOf(item) !== keyOf(currentRef.current))
    }
    if (!candidates.length) candidates = pool
    return candidates[Math.floor(Math.random() * candidates.length)]
  }

  // token отличает этот запуск от запуска до закрытия окна (и от пары эффектов StrictMode)
  const spin = useCallback(
    async (token) => {
      const pool = poolRef.current
      if (spinningRef.current || !pool.length) return
      spinningRef.current = true
      setSpinning(true)

      const result = pickNext()
      shownKeysRef.current.add(keyOf(result))
      const posterPromise = preloadImage(posterUrl(result))

      const others = pool.filter((item) => item !== result)
      const steps = Math.min(SPIN_STEPS, Math.max(others.length, 1))
      const sequence = []
      for (let i = 0; i < steps; i++) {
        sequence.push(others.length ? others[Math.floor(Math.random() * others.length)] : result)
      }

      // Даём постерам кадров немного времени на загрузку, чтобы не мелькали пустые карточки
      await Promise.race([
        Promise.all(sequence.map((item) => preloadImage(posterUrl(item, "w342")))),
        wait(800),
      ])

      // Интервалы растут к концу, чтобы карточка «тормозила»
      const weights = sequence.map((_, i) => 1 + Math.pow(i / steps, 2) * 6)
      const totalWeight = weights.reduce((a, b) => a + b, 0)

      for (let i = 0; i < sequence.length; i++) {
        if (aliveRef.current !== token) return
        setShown((prev) => ({ item: sequence[i], size: "w342", tick: (prev?.tick ?? 0) + 1 }))
        haptic.light()
        await wait((weights[i] / totalWeight) * SPIN_DURATION)
      }

      await posterPromise
      if (aliveRef.current !== token) return

      currentRef.current = result
      setShown((prev) => ({ item: result, size: "w500", tick: (prev?.tick ?? 0) + 1 }))
      haptic.heavy()
      spinningRef.current = false
      setSpinning(false)
    },
    [haptic]
  )

  useEffect(() => {
    const token = {}
    aliveRef.current = token
    poolRef.current = []
    shownKeysRef.current = new Set()
    currentRef.current = null
    spinningRef.current = false

    ;(async () => {
      try {
        const { pool, genres: loadedGenres } = await loadPool()
        poolRef.current = pool
        if (aliveRef.current === token) setGenres(loadedGenres)
      } catch (error) {
        console.error("Error loading surprise pool:", error)
      }

      if (aliveRef.current !== token) return

      if (!poolRef.current.length) {
        setSpinning(false)
        setEmpty(true)
        return
      }

      spin(token)
    })()

    return () => {
      aliveRef.current = null
    }
  }, [spin])

  const handleSpinAgain = () => {
    if (spinningRef.current) return
    haptic.light()
    spin(aliveRef.current)
  }

  const handleOpen = () => {
    const item = currentRef.current
    if (!item || spinningRef.current) return
    haptic.light()
    onOpen(item)
  }

  const item = shown?.item
  const parts = item ? metaParts(item, genres) : []

  return (
    <>
      <div className="relative flex flex-col items-center px-22 pt-8 pb-22">
        {item ? (
          <div
            key={shown.tick}
            className="aspect-2/3 w-full max-w-60 overflow-hidden rounded-[6px] bg-secondary duration-120 animate-in fade-in-100 slide-in-from-bottom-[6px] zoom-in-98"
          >
            <img
              src={posterUrl(item, shown.size)}
              alt=""
              className="block size-full object-cover"
            />
          </div>
        ) : (
          <Skeleton className="aspect-2/3 w-full max-w-60 rounded-[6px] bg-secondary" />
        )}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4 text-center">
          <div
            className={cn(
              "w-full truncate text-[22px]/7 font-semibold text-foreground",
              empty && "text-base/6 whitespace-normal"
            )}
          >
            {empty ? i18n.t("surpriseEmpty") : item ? item.title || item.name || "" : ""}
          </div>
          <div className="flex min-h-4 justify-center gap-1 px-4 text-xs/4 font-semibold whitespace-nowrap text-muted-foreground">
            {parts.flatMap((part, index) =>
              index === 0
                ? [<span key={`p${index}`}>{part}</span>]
                : [<span key={`d${index}`}>·</span>, <span key={`p${index}`}>{part}</span>]
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 px-6 py-2">
        <Button
          type="button"
          variant="tonal"
          disabled={spinning || empty}
          onClick={handleOpen}
          className="h-12 min-w-[50px] flex-1 bg-foreground/32 px-6 text-sm/5 text-foreground backdrop-blur-[20px] hover:bg-foreground/32"
        >
          {i18n.t("surpriseOpen")}
        </Button>
        <Button
          type="button"
          variant="tonal"
          disabled={spinning || empty}
          onClick={handleSpinAgain}
          className="h-12 min-w-[50px] flex-1 bg-foreground/32 px-6 text-sm/5 text-foreground backdrop-blur-[20px] hover:bg-foreground/32"
        >
          {i18n.t("surpriseSpinAgain")}
        </Button>
      </div>
    </>
  )
}

export function SurpriseDrawer({ open, onOpenChange }) {
  const haptic = useHaptic()

  // Закрытие оверлеем и свайпом даёт лёгкий отклик, как нажатие на оверлей в v1
  const handleOpenChange = (next) => {
    if (!next) haptic.light()
    onOpenChange(next)
  }

  const handleOpen = (item) => {
    onOpenChange(false)
    document.dispatchEvent(
      new CustomEvent("movie-selected", {
        detail: { movieId: item.id.toString(), type: item.media_type, movie: item },
      })
    )
  }

  return (
    <AppDrawer
      open={open}
      onOpenChange={handleOpenChange}
      title={i18n.t("surpriseMe")}
      hideTitle
      className="px-0"
    >
      <SurpriseBody onOpen={handleOpen} />
    </AppDrawer>
  )
}
