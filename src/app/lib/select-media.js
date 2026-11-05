// Открывает детали фильма или сериала через глобальное событие, на которое подписан bootstrap
export function selectMedia(item, type) {
  document.dispatchEvent(
    new CustomEvent("movie-selected", {
      detail: { movieId: String(item.id), type },
      bubbles: true,
      composed: true,
    })
  )
}
