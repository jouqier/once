# Руководство по использованию кнопок

## 🎬 Фильмы

### Базовый сценарий

```javascript
// В HTML
<movie-action-buttons></movie-action-buttons>

// В JS
const buttons = document.querySelector('movie-action-buttons');
buttons.movie = movieData; // Автоматически определит состояние
```

### Состояния

```javascript
// none - обе кнопки неактивны
// want - кнопка Want активна, Watched скрыта
// watched - кнопка Watched активна, Want скрыта
```

---

## 📺 Сериалы (основные кнопки)

### Базовый сценарий

```javascript
// В HTML
<tv-show-action-buttons></tv-show-action-buttons>

// В JS
const buttons = document.querySelector('tv-show-action-buttons');
buttons.tvShow = showData; // Автоматически определит состояние
```

### Состояния

```javascript
// none - кнопки Want и Watched неактивны
// want - кнопка Want активна, остальные скрыты
// watching - кнопка Watching видна, остальные скрыты
// watched - кнопка Watched активна, остальные скрыты
```

### Автоматические переходы

```javascript
// При отметке первого эпизода
none/want → watching

// При отметке последнего эпизода
watching → watched

// При снятии отметки с эпизода
watched → watching
```

---

## 🎭 Сериалы (кнопки сезонов)

### Базовый сценарий

```javascript
// В HTML
<tv-seasons></tv-seasons>

// В JS
const seasons = document.querySelector('tv-seasons');
seasons.tvId = showId;
seasons.tvShow = showData;
seasons.seasons = seasonsData; // Автоматически отрендерит
```

### Кнопки

```javascript
// Mark as Watched - отмечает все эпизоды сезона
// Mark as Unwatched - снимает отметки со всех эпизодов
// Rate Season - открывает диалог оценки
```

### Логика отображения

```javascript
// Сезон не просмотрен
→ [Mark as Watched]

// Сезон просмотрен, нет оценки
→ [Rate Season] [Mark as Unwatched]

// Сезон просмотрен, есть оценка
→ [Mark as Unwatched]
```

---

## 🔄 События

### Отправка событий

```javascript
// Фильмы
document.dispatchEvent(new CustomEvent('review-submitted', {
    detail: { movieId, review }
}));

document.dispatchEvent(new CustomEvent('review-removed', {
    detail: { movieId, type: 'movie' }
}));

// Сериалы
document.dispatchEvent(new CustomEvent('episode-checkbox-changed', {
    detail: { 
        tvId, 
        seasonNumber, 
        episodeNumber, 
        checked, 
        isLastUnwatched, 
        wasAllWatched 
    }
}));

document.dispatchEvent(new CustomEvent('all-seasons-watched', {
    detail: { tvId }
}));

document.dispatchEvent(new CustomEvent('all-seasons-unwatched', {
    detail: { tvId }
}));
```

### Прослушивание событий

```javascript
// Фильмы
document.addEventListener('review-submitted', (e) => {
    console.log('Review submitted:', e.detail);
});

// Сериалы
document.addEventListener('episode-checkbox-changed', (e) => {
    console.log('Episode changed:', e.detail);
});

document.addEventListener('all-seasons-watched', (e) => {
    console.log('All seasons watched:', e.detail);
});
```

---

## 🎨 Стилизация

### CSS переменные

```css
/* Цвета кнопок */
--md-sys-color-primary-container
--md-sys-color-on-primary-container
--md-sys-color-secondary-container
--md-sys-color-on-secondary-container
--md-sys-color-surface-container
--md-sys-color-on-surface
--md-sys-color-outline

/* Формы */
--md-filled-tonal-button-container-shape: 1000px;
--md-filled-tonal-button-label-text-font: 600 14px sans-serif;
--md-filled-tonal-button-container-height: 48px;
```

---

## 🧪 Примеры использования

### Фильм: добавить в Want

```javascript
const buttons = document.querySelector('movie-action-buttons');
buttons.movie = {
    id: 123,
    title: 'Test Movie',
    media_type: 'movie'
};
// Пользователь кликает на кнопку Want
// → Фильм добавляется в список Want
// → Кнопка становится активной
```

### Сериал: автопереход в Watching

```javascript
const buttons = document.querySelector('tv-show-action-buttons');
buttons.tvShow = {
    id: 456,
    name: 'Test Show',
    media_type: 'tv'
};
// Пользователь отмечает первый эпизод
// → Автоматически переходит в состояние Watching
// → Показывается кнопка "Watching"
```

### Сезон: отметить как просмотренный

```javascript
const seasons = document.querySelector('tv-seasons');
seasons.tvId = 456;
seasons.seasons = seasonsData;
// Пользователь кликает "Mark as Watched" для сезона 1
// → Все эпизоды сезона 1 отмечаются
// → Если это последний сезон → сериал переходит в Watched
```

---

## 🐛 Отладка

### Проверка состояния

```javascript
// Фильм
const buttons = document.querySelector('movie-action-buttons');
console.log('Current state:', buttons._state);

// Сериал
const showButtons = document.querySelector('tv-show-action-buttons');
console.log('Current state:', showButtons._state);
```

### Проверка событий

```javascript
// Логирование всех событий
['review-submitted', 'review-removed', 'episode-checkbox-changed', 
 'all-seasons-watched', 'all-seasons-unwatched'].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
        console.log(`Event: ${eventName}`, e.detail);
    });
});
```

---

## 📚 Дополнительные ресурсы

- `BUTTONS_LOGIC.md` - полное описание логики
- `BUTTONS_REFACTOR_SUMMARY.md` - итоги рефакторинга
- Исходный код компонентов в `src/components/`
