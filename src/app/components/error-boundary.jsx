import { Component } from "react"

// Ошибка рендера внутри экрана не роняет всё приложение: экран остаётся пустым (чёрный фон),
// а таб-бар и навигация продолжают работать. Screen ключует границу по состоянию навигации,
// поэтому любой переход создаёт новую границу без ошибки.
export class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    console.error("Ошибка рендера экрана:", error, info?.componentStack)
  }

  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}
