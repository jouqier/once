import { Badge } from "@/components/ui/badge"

const RADIUS = 4
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

// Пропсы соответствуют атрибутам <episodes-badge>: watchedEpisodes, totalEpisodes
export function EpisodesBadge({ watchedEpisodes, totalEpisodes }) {
  const watched = Number(watchedEpisodes) || 0
  const total = Number(totalEpisodes) || 0
  if (!watched) return null

  const percentage = total ? (watched / total) * 100 : 0
  const offset = CIRCUMFERENCE * (1 - percentage / 100)

  return (
    <Badge
      variant="secondary"
      className="absolute top-1 right-1 z-1 h-auto gap-0.5 rounded-sm bg-card px-1.25 py-0.5 text-[11px] leading-4 font-semibold text-foreground"
    >
      <svg viewBox="0 0 12 12" className="size-3!" aria-hidden="true">
        <circle cx="6" cy="6" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
        <circle
          cx="6"
          cy="6"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="origin-center -rotate-90 transition-[stroke-dashoffset] duration-350"
        />
      </svg>
      <span>{watched}</span>
    </Badge>
  )
}
