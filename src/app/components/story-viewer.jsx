import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { i18n } from "../../services/i18n.js"
import { useHaptic } from "@/hooks/use-telegram"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Защита от двойного тапа по зонам навигации, как в v1
const NAVIGATION_LOCK_MS = 500

function ProgressFill({ state, duration }) {
  const ref = useRef(null)

  // Текущий слайд заполняется за duration; прошедшие полные, будущие пустые
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (state === "past") {
      el.style.transition = "none"
      el.style.width = "100%"
    } else if (state === "current") {
      el.style.transition = "none"
      el.style.width = "0%"
      void el.offsetHeight
      el.style.transition = `width ${duration}ms linear`
      el.style.width = "100%"
    } else {
      el.style.transition = "none"
      el.style.width = "0%"
    }
  }, [state, duration])

  return <div ref={ref} className="h-full w-0 bg-white" />
}

export function StoryViewer({ stories, slideDuration = 5000, onFinish }) {
  const haptic = useHaptic()
  const [index, setIndex] = useState(0)
  const navigatingRef = useRef(false)
  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  })

  const last = index === stories.length - 1

  // Таймер заново стартует при каждой смене слайда
  useEffect(() => {
    const timer = setTimeout(() => {
      if (index < stories.length - 1) {
        setIndex(index + 1)
      } else {
        onFinishRef.current()
      }
    }, slideDuration)
    return () => clearTimeout(timer)
  }, [index, stories.length, slideDuration])

  const lockTimerRef = useRef(null)
  useEffect(() => () => clearTimeout(lockTimerRef.current), [])

  const handleAction = useCallback(() => {
    haptic.medium()
    if (last) {
      onFinishRef.current()
    } else {
      setIndex((i) => i + 1)
    }
  }, [haptic, last])

  const handleClose = () => {
    haptic.medium()
    onFinishRef.current()
  }

  const handleNavigate = (direction) => {
    if (navigatingRef.current) return
    navigatingRef.current = true
    lockTimerRef.current = setTimeout(() => {
      navigatingRef.current = false
    }, NAVIGATION_LOCK_MS)
    if (direction === "prev" && index > 0) {
      haptic.light()
      setIndex(index - 1)
    } else if (direction === "next" && !last) {
      haptic.light()
      setIndex(index + 1)
    } else if (direction === "next" && last) {
      onFinishRef.current()
    }
  }

  if (!stories.length) return null

  return createPortal(
    <div className="fixed inset-0 flex flex-col bg-scrim">
      <div className="relative flex flex-1 items-center justify-center">
        <img
          className="max-h-full max-w-full bg-black object-contain"
          src={stories[index]}
          alt={i18n.t("story")}
          onError={(e) => console.error("Failed to load image:", e.currentTarget.src)}
        />
        <div className="absolute inset-0 flex">
          <div className="flex-1 cursor-pointer" onClick={() => handleNavigate("prev")} />
          <div className="flex-1 cursor-pointer" onClick={() => handleNavigate("next")} />
        </div>
      </div>

      <div className="absolute top-2 right-2 left-2 flex gap-1">
        {stories.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-[2px] bg-white/30">
            <ProgressFill
              state={i < index ? "past" : i === index ? "current" : "future"}
              duration={slideDuration}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="absolute top-4 left-4 cursor-pointer border-none bg-transparent p-2 text-white"
        onClick={handleClose}
      >
        ✕
      </button>

      <div className="absolute right-0 bottom-0 left-0 flex items-center self-stretch p-4">
        <Button
          variant="tonal"
          className={cn(
            "h-12 flex-1 transition-all duration-300 ease-in-out",
            last
              ? "bg-primary text-primary-foreground hover:bg-primary"
              : "bg-primary-foreground text-scrim hover:bg-primary-foreground"
          )}
          onClick={handleAction}
        >
          {last ? i18n.t("letsGetStarted") : i18n.t("next")}
        </Button>
      </div>
    </div>,
    document.body
  )
}
