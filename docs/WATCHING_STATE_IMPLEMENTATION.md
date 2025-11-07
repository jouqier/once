# Чеклист реализации состояния WATCHING для сериалов

## 📋 Обзор задачи

Добавить новое промежуточное состояние `WATCHING` для сериалов, которое автоматически устанавливается при наличии просмотренных эпизодов.

---

## ✅ Изменения в коде

### 1. Обновить enum состояний в `show-card-buttons.js`

```javascript
static States = {
    NONE: 'none',
    WANT: 'want',
    WATCHING: 'watching',  // НОВОЕ
    WATCHED: 'watched'
};
```

### 2. Обновить enum активностей

```javascript
static Activities = {
    WANT: 'want',
    WATCHED: 'watched',
    WATCHING: 'watching',
    REMOVED_FROM_WATCHING: 'removed-from-watching',  // НОВОЕ
    REMOVED_FROM_WANT: 'removed-from-want',
    REMOVED_FROM_WATCHED: 'removed-from-watched'
};
```

### 3. Обновить визуальные стили

Добавить стили для кнопки в состоянии WATCHING:

```javascript
static STYLES = {
    // ... существующие стили
    WATCHING_ACTIVE_COLOR: 'var(--md-sys-color-primary-container)',
    WATCHING_TEXT: 'Watching…'
};
```

### 4. Обновить методы отображения кнопок

```javascript
_getWantButtonDisplay() {
    return (this._state === States.WATCHING || this._state === States.WATCHED) 
        ? 'none' 
        : 'flex';
}

_getWatchingButtonDisplay() {
    return this._state === States.WATCHING ? 'flex' : 'none';
}

_getWatchedButtonDisplay() {
    return this._state === States.WATCHED ? 'flex' : 'none';
}
```

### 5. Создать новую кнопку "Watching…"

В методе `_createElements()` добавить третью кнопку:

```html
<md-filled-tonal-button class="watching-button">
    <div class="button-content">${i18n.t('watching')}</div>
</md-filled-tonal-button>
```

### 6. Обновить метод `_updateButtonContent()`

```javascript
_updateButtonContent() {
    this._wantButtonContent.textContent = 
        this._state === States.WANT ? `✓ ${i18n.t('want')}` : i18n.t('want');
    
    this._watchingButtonContent.textContent = i18n.t('watching');
    
    this._watchedButtonContent.textContent = 
        this._state === States.WATCHED ? `✓ ${i18n.t('watched')}` : i18n.t('watched');
}
```

### 7. Добавить обработчик клика для кнопки "Watching…"

```javascript
this._watchingButton.addEventListener('click', () => {
    if (!this._tvShow) return;
    haptic.light();
    this._showWatchingContextMenu();
});
```

### 8. Создать контекстное меню для состояния WATCHING

```javascript
_showWatchingContextMenu() {
    const menu = document.createElement('context-menu');
    menu.options = [
        { 
            label: i18n.t('removeFromWatching'),
            action: Actions.REMOVE_FROM_WATCHING
        },
        {
            label: i18n.t('markAllAsWatched'),
            action: Actions.MARK_ALL_WATCHED
        },
        {
            label: i18n.t('moveToWant'),
            action: Actions.MOVE_TO_WANT
        }
    ];
    
    menu.addEventListener('menu-action', this._handleWatchingMenuAction.bind(this));
    document.body.appendChild(menu);
}
```

### 9. Добавить обработчик действий меню WATCHING

```javascript
_handleWatchingMenuAction(e) {
    switch (e.detail.action) {
        case Actions.REMOVE_FROM_WATCHING:
            this._handleRemoveFromWatching();
            break;
        case Actions.MARK_ALL_WATCHED:
            this._handleMarkAllWatched();
            break;
        case Actions.MOVE_TO_WANT:
            this._handleMoveToWantFromWatching();
            break;
    }
}
```

### 10. Реализовать методы действий

```javascript
_handleRemoveFromWatching() {
    userMoviesService.removeFromWatching(this._tvShow.id);
    userMoviesService.removeAllSeasonReviews(this._tvShow.id);
    this._activityScreen.addActivity(this._tvShow, Activities.REMOVED_FROM_WATCHING);
    this._state = States.NONE;
    this._updateButtonStates();
    this._dispatchTVAction('clear-all-seasons');
}

_handleMoveToWantFromWatching() {
    userMoviesService.removeFromWatching(this._tvShow.id);
    userMoviesService.removeAllSeasonReviews(this._tvShow.id);
    userMoviesService.addToWant(this._tvShow);
    this._activityScreen.addActivity(this._tvShow, Activities.WANT);
    this._state = States.WANT;
    this._updateButtonStates();
    this._dispatchTVAction('clear-all-seasons');
}
```

### 11. Обновить метод `_handleWatching()`

```javascript
_handleWatching() {
    userMoviesService.removeFromWant(this._tvShow.id);  // Если был в Want
    userMoviesService.addToWatching(this._tvShow);      // НОВЫЙ МЕТОД
    this._activityScreen.addActivity(this._tvShow, Activities.WATCHING);
    this._state = States.WATCHING;
    this._updateButtonStates();
}
```

### 12. Добавить слушатель изменения чекбоксов эпизодов

```javascript
connectedCallback() {
    // ... существующие слушатели
    document.addEventListener('episode-checkbox-changed', this._handleEpisodeCheckboxChanged.bind(this));
}

_handleEpisodeCheckboxChanged(e) {
    if (this._tvShow?.id !== e.detail.tvId) return;
    
    const { checked, isLastUnwatched, wasAllWatched } = e.detail;
    
    // Переход в WATCHING при отметке первого эпизода
    if (checked && this._state === States.NONE) {
        this._handleWatching();
    }
    
    // Переход в WATCHED при отметке последнего эпизода
    if (checked && isLastUnwatched && this._state === States.WATCHING) {
        this._markAsWatched();
    }
    
    // Переход обратно в WATCHING при снятии отметки
    if (!checked && wasAllWatched && this._state === States.WATCHED) {
        this._handleWatching();
    }
}
```

---

## 🔧 Изменения в `user-movies.js` / `user-data.js`

### 1. Добавить методы для работы со списком "Watching"

```javascript
// В userMoviesService или userDataStore

addToWatching(tvShow) {
    const userId = this._getUserId();
    if (!this._store.watching) {
        this._store.watching = {};
    }
    this._store.watching[tvShow.id] = {
        addedAt: Date.now(),
        title: tvShow.name || tvShow.title,
        poster_path: tvShow.poster_path
    };
    this._saveToStorage();
}

removeFromWatching(tvShowId) {
    if (this._store.watching && this._store.watching[tvShowId]) {
        delete this._store.watching[tvShowId];
        this._saveToStorage();
    }
}

isInWatchingList(tvShowId) {
    return this._store.watching && !!this._store.watching[tvShowId];
}
```

### 2. Обновить метод `getMovieState()`

```javascript
getMovieState(contentId) {
    // Для сериалов проверяем все состояния
    if (this.isInWatchingList(contentId)) {
        return 'watching';
    }
    
    if (this.isInWatchedList(contentId)) {
        return 'watched';
    }
    
    if (this.isInWantList(contentId)) {
        return 'want';
    }
    
    // Проверяем наличие просмотренных эпизодов
    const watchedEpisodesCount = this.getWatchedEpisodesCount(contentId);
    if (watchedEpisodesCount > 0) {
        // Автоматически добавляем в watching
        this.addToWatching({ id: contentId });
        return 'watching';
    }
    
    return 'none';
}
```

---

## 🌐 Изменения в `i18n.js`

Добавить новые ключи перевода:

```javascript
const translations = {
    en: {
        // ... существующие переводы
        watching: 'Watching…',
        removeFromWatching: 'Remove from Watching',
        // ...
    },
    ru: {
        // ... существующие переводы
        watching: 'Смотрю…',
        removeFromWatching: 'Удалить из просмотра',
        // ...
    }
};
```

---

## 🎬 Изменения в компоненте сезонов (`show-card-seasons.js`)

### Отправка событий при изменении чекбоксов

```javascript
_handleEpisodeCheckboxChange(e, tvId, seasonNumber, episodeNumber) {
    const checkbox = e.target;
    const checked = checkbox.checked;
    
    // Определяем, является ли это последним непросмотренным эпизодом
    const isLastUnwatched = this._isLastUnwatchedEpisode(tvId);
    
    // Определяем, были ли до этого все эпизоды просмотрены
    const wasAllWatched = this._wereAllEpisodesWatched(tvId);
    
    // Отправляем событие
    document.dispatchEvent(new CustomEvent('episode-checkbox-changed', {
        bubbles: true,
        composed: true,
        detail: {
            tvId,
            seasonNumber,
            episodeNumber,
            checked,
            isLastUnwatched,
            wasAllWatched
        }
    }));
}
```

---

## 🧪 Тестовые сценарии

### Сценарий 1: Переход в WATCHING при отметке эпизода
1. Открыть карточку сериала (состояние NONE)
2. Отметить любой эпизод
3. ✅ Кнопка должна измениться на "Watching…"
4. ✅ Кнопка "Want" должна скрыться

### Сценарий 2: Переход в WATCHED при отметке последнего эпизода
1. Открыть карточку сериала (состояние WATCHING)
2. Отметить все эпизоды кроме одного
3. Отметить последний эпизод
4. ✅ Кнопка должна измениться на "✓ Watched"

### Сценарий 3: Переход обратно в WATCHING
1. Открыть карточку сериала (состояние WATCHED, все эпизоды просмотрены)
2. Снять отметку с любого эпизода
3. ✅ Кнопка должна измениться на "Watching…"

### Сценарий 4: "I'm watching this" из меню
1. Открыть карточку сериала (состояние WANT)
2. Нажать на кнопку "✓ Want"
3. Выбрать "I'm watching this"
4. ✅ Кнопка должна измениться на "Watching…"
5. ✅ Кнопка "Want" должна скрыться

### Сценарий 5: Контекстное меню WATCHING
1. Открыть карточку сериала (состояние WATCHING)
2. Нажать на кнопку "Watching…"
3. ✅ Должно появиться меню с 3 опциями:
   - Remove from Watching
   - Mark all as Watched
   - Move to Want

---

## 📝 Чеклист перед коммитом

- [ ] Обновлен enum States в show-card-buttons.js
- [ ] Добавлена кнопка "Watching…" в HTML
- [ ] Реализованы методы отображения для трех кнопок
- [ ] Создано контекстное меню для WATCHING
- [ ] Добавлены обработчики действий меню
- [ ] Реализована логика автоматических переходов
- [ ] Добавлены методы в userMoviesService (addToWatching, removeFromWatching)
- [ ] Обновлен метод getMovieState()
- [ ] Добавлены переводы в i18n
- [ ] Обновлен компонент сезонов для отправки событий
- [ ] Протестированы все сценарии
- [ ] Обновлена документация BUTTONS_LOGIC.md

---

## 🚀 Порядок реализации

1. **Сначала**: Обновить структуры данных и enum'ы
2. **Затем**: Добавить UI элементы (кнопку, стили)
3. **После**: Реализовать логику меню и действий
4. **Далее**: Добавить автоматические переходы состояний
5. **В конце**: Тестирование и отладка

---

## ⚠️ Важные моменты

1. **Сохранение прогресса**: При удалении из WATCHING прогресс просмотра эпизодов должен сохраняться
2. **Приоритет состояний**: Явные состояния (WANT/WATCHING/WATCHED) имеют приоритет над автоматическими
3. **Инвалидация кеша**: При любом изменении состояния вызывать `_invalidateCache()`
4. **События**: Все изменения состояний должны отправлять соответствующие события
5. **Активность**: Все действия должны записываться в ленту активности
