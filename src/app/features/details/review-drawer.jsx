import { useRef, useState } from "react"
import { createPortal } from "react-dom"
import { TG } from "../../../config/telegram.js"
import { userMoviesService } from "../../../services/user-movies.js"
import { i18n } from "../../../services/i18n.js"
import { StoryGenerator } from "../../../services/story-generator.js"
import { useHaptic } from "@/hooks/use-telegram"
import { cn } from "@/lib/utils"
import { AppDrawer } from "@/components/app-drawer"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

const RATINGS = ["10", "9", "8", "7", "6", "5", "4", "3", "2", "1"]

const RATING_EMOJIS = {
  10: "🤯",
  9: "🤩",
  8: "😍",
  7: "😊",
  6: "🙂",
  5: "😐",
  4: "😕",
  3: "😣",
  2: "😫",
  1: "🤮",
}

function ratingEmoji(rating) {
  return RATING_EMOJIS[rating] || "🤯"
}

function showError(message) {
  if (TG?.showAlert) {
    TG.showAlert(message)
  } else {
    alert(message)
  }
}

/**
 * Диалог оценки и отзыва (v1 review-dialog.js).
 *
 * media        фильм ({ id, title, release_date, poster_path, media_type }) или сезон сериала:
 *              { ...season, name, media_type: 'tv_season' }, как v1 передавал в dialog.movie
 * seasonNumber, tvId  только для сезона, как атрибуты season-number и tv-id в v1
 * review       сохранённый отзыв для редактирования ({ rating, text, shared }), как dialog.review.
 *              Без него форма открывается с оценкой 10, пустым текстом и включённым шарингом
 * onSubmitted(review)  вызывается сразу после сохранения и события review-submitted
 *              (season-review-submitted для сезона), до генерации истории. В v1 это делали
 *              слушатели, которые вызывающий код вешал на document при открытии окна
 *
 * Состояние формы сбрасывается из review при каждом открытии.
 */
export function ReviewDrawer({ open, onOpenChange, media, review, seasonNumber, tvId, onSubmitted }) {
  const haptic = useHaptic()
  const [rating, setRating] = useState("10")
  const [text, setText] = useState("")
  const [shareEnabled, setShareEnabled] = useState(true)
  // В v1 активная оценка до первого нажатия была primary-container, после нажатия primary
  const [ratingTouched, setRatingTouched] = useState(false)
  const [loadingText, setLoadingText] = useState(null)
  const storyGeneratorRef = useRef(null)

  const [prevOpen, setPrevOpen] = useState(false)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setRating(review ? review.rating : "10")
      setText(review ? review.text || "" : "")
      setShareEnabled(review ? review.shared : true)
      setRatingTouched(false)
      setLoadingText(null)
    }
  }

  const isSeason = media?.media_type === "tv_season"
  const loading = loadingText !== null

  const handleOpenChange = (next) => {
    if (!next) haptic.light()
    onOpenChange(next)
  }

  const handleRating = (value) => {
    haptic.light()
    setRating(value)
    setRatingTouched(true)
  }

  const handleShareChange = (checked) => {
    haptic.light()
    setShareEnabled(checked)
  }

  const handleSubmit = async () => {
    haptic.medium()
    if (!rating) return

    try {
      setLoadingText(i18n.t("generatingStory"))

      let saved
      if (isSeason) {
        saved = {
          rating,
          text,
          createdAt: Date.now(),
          shared: shareEnabled,
          season_number: seasonNumber,
          media_type: "tv_season",
        }
        userMoviesService.saveReview("tv_season", tvId, saved, seasonNumber)
        document.dispatchEvent(
          new CustomEvent("season-review-submitted", {
            bubbles: true,
            composed: true,
            detail: { tvId, seasonNumber, review: saved },
          })
        )
      } else {
        saved = {
          rating,
          text,
          createdAt: Date.now(),
          shared: shareEnabled,
          media_type: media?.media_type || "movie",
        }
        userMoviesService.saveReview(media.media_type, media.id, saved)
        document.dispatchEvent(
          new CustomEvent("review-submitted", {
            bubbles: true,
            composed: true,
            detail: { movieId: media.id, review: saved },
          })
        )
      }
      onSubmitted?.(saved)

      if (shareEnabled) {
        try {
          setLoadingText(i18n.t("generatingStory"))
          storyGeneratorRef.current ??= new StoryGenerator()
          const storyImage = await storyGeneratorRef.current.generateReviewStory(media, saved)

          console.log("✅ Story image generated:", storyImage)

          if (!storyImage || !storyImage.startsWith("https://")) {
            console.error("❌ Invalid image URL:", storyImage)
            throw new Error("Invalid image URL")
          }

          setLoadingText(i18n.t("sharingStory"))

          if (TG?.shareToStory) {
            const shareParams = { media_type: "photo" }
            // Текст отзыва идёт в подпись к истории
            if (saved.text && saved.text.trim()) {
              shareParams.text = saved.text
            }
            console.log("📤 Sharing to story with params:", shareParams)
            await TG.shareToStory(storyImage, shareParams)
          } else {
            console.warn("⚠️ shareToStory не доступен")
          }
        } catch (error) {
          console.error("💥 Error sharing story:", error)
          showError(i18n.t("failedToShareStory"))
        }
      }

      // Окно закрывается только после всех операций
      onOpenChange(false)
    } catch (error) {
      console.error("Error:", error)
      showError(i18n.t("somethingWentWrong"))
    } finally {
      setLoadingText(null)
    }
  }

  const title = isSeason ? media?.name : media?.title
  const subtitle = isSeason
    ? `${i18n.t("season")} ${seasonNumber}, ${new Date(media?.air_date).getFullYear()}`
    : `${new Date(media?.release_date).getFullYear()}`

  return (
    <AppDrawer
      open={open}
      onOpenChange={handleOpenChange}
      title={title || i18n.t("reviews")}
      hideTitle
      // Пока идёт отправка, в v1 весь экран закрывал оверлей загрузки
      dismissible={!loading}
      className={cn("px-0", loading && "pointer-events-none opacity-50")}
    >
      {media && (
        <div className="flex flex-col items-start leading-[normal]">
          <div className="flex items-center gap-4 self-stretch px-6 py-2">
            <img
              src={`https://image.tmdb.org/t/p/w185${media.poster_path}`}
              alt={media.title}
              className="h-18 w-12 rounded-[4px]"
            />
            <div className="flex flex-1 flex-col items-start gap-1">
              <div className="self-stretch text-base/6 font-semibold tracking-[0.15px] text-foreground">
                {title}
              </div>
              <div className="text-xs/4 font-semibold text-muted-foreground">{subtitle}</div>
            </div>
          </div>

          <Separator className="mx-6 my-2 w-auto! self-stretch" />

          <Textarea
            placeholder={i18n.t("writeReview")}
            maxLength={500}
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="field-sizing-fixed box-content min-h-24 w-auto self-stretch rounded-none border-0 bg-popover px-6 dark:bg-popover py-2 font-[family-name:sans-serif] text-sm/5 font-semibold text-foreground shadow-none focus-visible:ring-0 resize-none md:text-sm/5"
          />

          <div className="relative flex items-start self-stretch py-2">
            <div className="absolute inset-y-0 left-0 z-1 w-24 bg-linear-to-r from-popover from-60% to-transparent" />
            <div className="absolute top-1/2 left-6 z-2 -translate-y-1/2 text-5xl/normal transition-all duration-200">
              {ratingEmoji(rating)}
            </div>
            <div className="relative flex touch-pan-x gap-2 overflow-x-auto pr-6 pl-24 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {RATINGS.map((value) => {
                const active = rating === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleRating(value)}
                    className={cn(
                      "flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-secondary text-base font-semibold text-foreground transition-all duration-200",
                      active && !ratingTouched && "bg-primary text-primary-foreground",
                      // M3 primary / on-primary: семантического токена для них нет
                      active && ratingTouched && "bg-brand text-brand-foreground"
                    )}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          </div>

          <Separator className="mx-6 my-2 w-auto! self-stretch" />

          <div className="flex flex-col items-center justify-center gap-4 self-stretch px-6 py-2">
            <div className="flex min-h-13 items-center justify-between gap-5 self-stretch rounded-[16px] bg-secondary pr-2.5 pl-4 text-sm/5 font-semibold text-foreground">
              <span>{i18n.t("shareReview")}</span>
              <Switch
                checked={Boolean(shareEnabled)}
                onCheckedChange={handleShareChange}
                className={cn(
                  "h-8! w-13! border-2 border-muted-foreground data-[state=checked]:border-transparent data-[state=checked]:bg-primary data-[state=unchecked]:bg-secondary dark:data-[state=unchecked]:bg-secondary",
                  // Ручка 24px в обоих состояниях (v1 --md-switch-handle-height/width: 24px), 4px от края дорожки
                  "[&_[data-slot=switch-thumb]]:size-6! [&_[data-slot=switch-thumb]]:translate-x-0.5! [&_[data-slot=switch-thumb]]:bg-muted-foreground!",
                  "data-[state=checked]:[&_[data-slot=switch-thumb]]:translate-x-[22px]! data-[state=checked]:[&_[data-slot=switch-thumb]]:bg-brand!"
                )}
              />
            </div>
            <Button
              type="button"
              variant="tonal"
              onClick={handleSubmit}
              className="h-12 w-full bg-primary text-sm/5 font-medium text-primary-foreground hover:bg-primary"
            >
              {i18n.t("submit")}
            </Button>
          </div>
        </div>
      )}

      {loading &&
        createPortal(
          // z-50 обязателен: оверлей и контент Drawer лежат в body с z-50 (внутри контента fixed ломает transform vaul), при равном z-index этот портал выше, потому что позже в DOM
          <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-scrim/70 duration-200 animate-in fade-in-0">
            <div className="flex flex-col items-center gap-4">
              <div className="size-12 animate-spin rounded-full border-4 border-background border-t-brand" />
              <div className="text-base font-semibold text-background">{loadingText}</div>
            </div>
          </div>,
          document.body
        )}
    </AppDrawer>
  )
}
