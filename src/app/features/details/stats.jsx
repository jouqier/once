// Порт card-stats.js (movie-stats). В v1 блок на экране деталей закомментирован,
// поэтому details.jsx его тоже не показывает. Значения по умолчанию как в v1.
export function DetailsStats({ want = 481516, watched = 23, reviews = 42 }) {
  const stats = [
    { count: want, label: "Want" },
    { count: watched, label: "Watched" },
    { count: reviews, label: "Reviews" },
  ]

  return (
    <div className="flex items-center justify-center self-stretch px-4 py-2">
      {stats.map((stat) => (
        <div key={stat.label} className="flex flex-[1_0_0] flex-col items-center">
          <span className="text-sm/5 font-semibold text-foreground">{stat.count}</span>
          <span className="text-center text-xs/4 font-semibold text-muted-foreground">{stat.label}</span>
        </div>
      ))}
    </div>
  )
}
