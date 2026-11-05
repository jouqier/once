import { useState } from "react"
import { API_CONFIG } from "../../../config/api.js"
import { i18n } from "../../../services/i18n.js"
import { useHaptic } from "@/hooks/use-telegram"
import { selectMedia } from "@/lib/select-media"
import { cn } from "@/lib/utils"
import { ScrollRow } from "@/components/scroll-row"

function RecommendationItem({ item, onSelect }) {
  // В v1 onerror красил фон картинки в #272A32
  const [failed, setFailed] = useState(false)
  const title = item.title || item.name

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="flex w-[100px] shrink-0 cursor-pointer flex-col items-center border-0 bg-transparent p-0 transition-transform duration-200 active:scale-95"
    >
      <img
        src={`${API_CONFIG.IMAGE_BASE_URL}${item.poster_path}`}
        alt={title}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn("aspect-2/3 w-[100px] overflow-hidden rounded-[4px] object-cover", failed && "bg-muted")}
      />
      <p className="m-0 self-stretch py-2 text-center text-xs/4 font-semibold text-foreground">{title}</p>
    </button>
  )
}

// Ряд «Если нравится …» (v1 movie-recommendations, card-recomendation.js)
export function DetailsRecommendations({ recommendations, currentTitle }) {
  const haptic = useHaptic()

  if (!recommendations || recommendations.length === 0) return null

  const handleSelect = (item) => {
    haptic.light()
    selectMedia(item, item.media_type || "movie")
  }

  return (
    <div className="flex flex-col items-start self-stretch overflow-hidden rounded-[36px] bg-background py-2">
      <div className="flex flex-col items-center justify-center gap-2 self-stretch px-6 py-4">
        <div className="text-center text-[22px]/7 font-semibold text-foreground">
          {i18n.t("ifYouLike")} {currentTitle}
        </div>
      </div>
      <ScrollRow innerScrolls={false} fade="background">
        {recommendations.map((item) => (
          <RecommendationItem key={item.id} item={item} onSelect={handleSelect} />
        ))}
        <div className="shrink-0 pr-1">&nbsp;</div>
      </ScrollRow>
    </div>
  )
}
