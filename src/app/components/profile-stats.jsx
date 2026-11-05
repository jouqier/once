// Счётчики профиля, порт profile-stats из v1 (подписи в v1 не переведены).
// В v1 блок закомментирован в разметке профиля, поэтому экран его пока не показывает.
export function ProfileStats({ place = 0, following = 0, followers = 0 }) {
  const stats = [
    { label: "Place", count: place },
    { label: "Following", count: following },
    { label: "Followers", count: followers },
  ]

  return (
    <div className="flex items-center justify-between self-stretch p-4">
      {stats.map(({ label, count }) => (
        <div key={label} className="flex flex-[1_0_0] flex-col items-center">
          <span className="text-base/6 font-semibold text-foreground">{count || 0}</span>
          <span className="text-xs/4 text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  )
}
