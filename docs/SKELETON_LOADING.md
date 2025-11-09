# Skeleton Loading для постеров

## Описание

Реализован skeleton loading для постеров на главных страницах фильмов и сериалов. Структура страницы (заголовки, секции) отображается сразу, а вместо постеров показываются анимированные skeleton-плейсхолдеры до загрузки данных.

## Компонент `poster-skeleton`

Простой компонент для отображения skeleton-плейсхолдера постера.

### Использование

```javascript
import './components/poster-skeleton.js';

// В HTML
<poster-skeleton size="large"></poster-skeleton>
<poster-skeleton size="small"></poster-skeleton>
```

### Размеры

#### `size="large"`
Для больших постеров (228x342px):
- Используется в секции "Trending Now"
- Первая секция на странице

#### `size="small"`
Для маленьких постеров (128x192px):
- Используется в остальных секциях
- Горизонтальные скроллируемые списки

#### `size="trailer"`
Для трейлеров (68x68px круг):
- Используется в компоненте movie-trailers
- Круглая форма с заголовком снизу
- Показывается пока трейлеры загружаются

## Интеграция

### Компонент трейлеров (movie-trailers)

Компонент всегда рендерится и показывает skeleton пока трейлеры не загружены:

```javascript
import './poster-skeleton.js';

render() {
    const hasTrailers = this._trailers?.length > 0;
    
    this.shadowRoot.innerHTML = `
        <div class="trailers-list">
            ${hasTrailers ? 
                this._trailers.map(movie => `
                    <div class="trailer-item">...</div>
                `).join('') : 
                Array(5).fill(0).map(() => 
                    '<poster-skeleton size="trailer"></poster-skeleton>'
                ).join('')
            }
        </div>
    `;
}
```

### Страницы списков (movies-page, shows-page)

Страница рендерится сразу со всей структурой. Skeleton показывается только для постеров, если данные еще не загружены:

```javascript
async connectedCallback() {
    // Рендерим структуру сразу с skeleton для постеров
    this.render();
    
    if (!this._dataLoaded) {
        await this.loadData();
        this._dataLoaded = true;
        // Перерендериваем с реальными данными
        this.render();
    }
}

_renderTrendingMovies(movies) {
    if (!movies || movies.length === 0) {
        // Показываем skeleton если данных нет
        return Array(3).fill(0).map(() => 
            '<poster-skeleton size="large"></poster-skeleton>'
        ).join('');
    }
    
    // Рендерим реальные постеры
    return movies.map(movie => `
        <div class="trending-movie-card">
            <media-poster src="..." alt="..."></media-poster>
        </div>
    `).join('');
}
```

## Стилизация

Skeleton использует:
- Градиентный фон с анимацией shimmer
- Полупрозрачные цвета для темной темы
- Плавная анимация (1.5s infinite)
- Точные размеры постеров (228x342px и 128x192px)
- Скругленные углы (12px) как у реальных постеров

```css
.skeleton {
    background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.05) 25%,
        rgba(255, 255, 255, 0.1) 50%,
        rgba(255, 255, 255, 0.05) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 12px;
}

@keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

.skeleton.large {
    width: 228px;
    height: 342px;
}

.skeleton.small {
    width: 128px;
    height: 192px;
}
```

## Преимущества

1. **Мгновенная структура**: Заголовки и секции отображаются сразу
2. **Нет черного экрана**: Пользователи видят структуру страницы немедленно
3. **Визуальная обратная связь**: Skeleton показывает, где будут постеры
4. **Плавный переход**: Skeleton заменяется на реальные постеры без скачков
5. **Производительность**: Минимальный компонент без зависимостей
6. **Простота**: Один компонент с двумя размерами

## Поведение

- При первом рендере показываются skeleton-плейсхолдеры (массивы данных пустые)
- После загрузки данных происходит перерендер с реальным контентом
- Структура страницы (заголовки, секции) остается неизменной
- Skeleton имеет те же размеры, что и реальный контент
- Трейлеры показывают skeleton (5 кругов) пока данные не загружены
- Это предотвращает скачки контента при загрузке

## Будущие улучшения

- Skeleton для страниц деталей (опционально)
- Адаптивные размеры под разные экраны
- Skeleton для других компонентов (search, profile, genre)
- Анимация появления контента после загрузки
