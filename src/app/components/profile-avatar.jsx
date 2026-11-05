import { useEffect, useState } from "react"
import { TG } from "../../config/telegram.js"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const PLACEHOLDER_GRADIENT = "linear-gradient(135deg, #FF6B6B, #4ECDC4)"

// Круглая аватарка с буквой на градиенте, как .avatar-placeholder в v1.
// Пока фото грузится, круг пустой (в v1 заглушки при фото не было); буква появляется без фото или при ошибке загрузки.
export function InitialAvatar({ src, alt, initial, className, fallbackClassName }) {
  return (
    <Avatar key={src || "none"} className={cn("overflow-hidden after:hidden", className)}>
      <InitialAvatarContent src={src} alt={alt} initial={initial} fallbackClassName={fallbackClassName} />
    </Avatar>
  )
}

function InitialAvatarContent({ src, alt, initial, fallbackClassName }) {
  const [status, setStatus] = useState("idle")
  const waiting = src && status !== "error"

  return (
    <>
      {src && <AvatarImage src={src} alt={alt} onLoadingStatusChange={setStatus} />}
      <AvatarFallback
        className={cn(
          "bg-[linear-gradient(135deg,#FF6B6B,#4ECDC4)] font-semibold text-white",
          fallbackClassName,
          waiting && "bg-transparent bg-none text-transparent"
        )}
      >
        {initial}
      </AvatarFallback>
    </>
  )
}

// Шапка профиля: фото пользователя Telegram на размытом фоне, имя и @username.
// Как в v1, без пользователя показывается гость с буквой G на градиенте.
export function ProfileAvatar({ user: initialUser }) {
  const [user, setUser] = useState(initialUser)

  // Как в v1: по tg-user-data-updated перечитываем пользователя, если сменилась аватарка
  useEffect(() => {
    const handleUpdate = () => {
      const next = TG?.initDataUnsafe?.user
      setUser((current) => (next && current && next.photo_url !== current.photo_url ? next : current))
    }
    document.addEventListener("tg-user-data-updated", handleUpdate)
    return () => document.removeEventListener("tg-user-data-updated", handleUpdate)
  }, [])

  const fullName = user ? [user.first_name, user.last_name].filter(Boolean).join(" ") || "User" : "Guest User"
  const handle = user ? `@${user.username || "username"}` : "@guest"
  const photoUrl = user?.photo_url || null

  let background
  if (!user) background = PLACEHOLDER_GRADIENT
  else if (photoUrl) background = `url(${photoUrl}) lightgray 50% / cover no-repeat`

  return (
    <div className="relative flex flex-col items-center justify-center self-stretch overflow-hidden rounded-[40px]">
      <div className="absolute inset-0 rounded-[42px] bg-card" style={background ? { background } : undefined} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#000_0%,rgba(0,0,0,0.60)_80%)] backdrop-blur-[20px]" />
      <div className="relative flex flex-col items-center gap-4 self-stretch p-8">
        <InitialAvatar
          src={photoUrl}
          alt={fullName}
          initial={user ? fullName[0] : "G"}
          className="size-[120px]"
          fallbackClassName="text-5xl/normal"
        />
        <div className="flex flex-col items-center gap-1 text-white">
          <div className="text-[22px]/7 font-semibold">{fullName}</div>
          <div className="text-sm/5 font-semibold text-muted-foreground">{handle}</div>
        </div>
      </div>
    </div>
  )
}
