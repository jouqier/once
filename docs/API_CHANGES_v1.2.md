# API Changes v1.2 - Разделение хранилищ

## Краткая справка для разработчиков

### ⚠️ Важно!

В версии 1.2 фильмы и сериалы хранятся в **отдельных структурах**. Используйте правильные методы для каждого типа контента.

---

## Работа с фильмами

### Состояния фильмов
- `none` - не добавлен
- `want` - хочу посмотреть
- `watched` - посмотрел

❌ **Фильмы НЕ могут быть в состоянии `watching`**

### API для фильмов

```javascript
import { userMoviesService } from './services/user-movies.js';

// Получить состояние фильма
const state = userMoviesService.getMovieState(movieId);
// Возвращает: 'none' | 'want' | 'watched'

// Добавить фильм
userMoviesService.addToWant(movie);
userMoviesService.addToWatched(movie);

// Удалить фильм
userMoviesService.removeFromWant(movieId);
userMoviesService.removeFromWatched(movieId);

// Получить списки фильмов
const wantList = userMoviesService.getWantList();
const watchedList = userMoviesService.getWatchedList();
```

---

## Работа с сериалами

### Состояния сериалов
- `none` - не добавлен
- `want` - хочу посмотреть
- `watching` - смотрю (есть просмотренные эпизоды)
- `watched` - посмотрел (все эпизоды просмотрены)

✅ **Сериалы МОГУТ быть в состоянии `watching`**

### API для сериалов

```javascript
import { userMoviesService } from './services/user-movies.js';

// Получить состояние сериала
const state = userMoviesService.getTVShowState(showId);
// Возвращает: 'none' | 'want' | 'watching' | 'watched'

// Добавить сериал
userMoviesService.addTVShowToWant(show);
userMoviesService.addTVShowToWatching(show);
userMoviesService.addTVShowToWatched(show);

// Удалить сериал
userMoviesService.removeTVShowFromWant(showId);
userMoviesService.removeTVShowFromWatching(showId);
userMoviesService.removeTVShowFromWatched(showId);

// Получить списки сериалов
const wantList = userMoviesService.getTVShowWantList();
const watchingList = userMoviesService.getTVShowWatchingList();
const watchedList = userMoviesService.getTVShowWatchedList();
```

---

## Примеры использования

### Пример 1: Добавление контента в Want

```javascript
// ❌ НЕПРАВИЛЬНО - не различает тип контента
userMoviesService.addToWant(content);

// ✅ ПРАВИЛЬНО - проверяем тип
if (content.media_type === 'movie') {
    userMoviesService.addToWant(content);
} else if (content.media_type === 'tv') {
    userMoviesService.addTVShowToWant(content);
}
```

### Пример 2: Получение состояния

```javascript
// ❌ НЕПРАВИЛЬНО - getMovieState() не работает для сериалов
const state = userMoviesService.getMovieState(contentId);

// ✅ ПРАВИЛЬНО - используем правильный метод
let state;
if (content.media_type === 'movie') {
    state = userMoviesService.getMovieState(contentId);
} else if (content.media_type === 'tv') {
    state = userMoviesService.getTVShowState(contentId);
}
```

### Пример 3: Получение всех списков для профиля

```javascript
// Фильмы
const moviesWant = userMoviesService.getWantList();
const moviesWatched = userMoviesService.getWatchedList();

// Сериалы
const tvWant = userMoviesService.getTVShowWantList();
const tvWatching = userMoviesService.getTVShowWatchingList();
const tvWatched = userMoviesService.getTVShowWatchedList();

// Все сериалы (без дубликатов)
const allTVShows = [...tvWant, ...tvWatching, ...tvWatched]
    .filter((item, index, self) => 
        index === self.findIndex((t) => t.id === item.id)
    );
```

---

## Миграция существующего кода

### Если вы использовали старые методы:

```javascript
// ❌ Старый код (версия 1.1)
userMoviesService.addToWatching(content);
userMoviesService.removeFromWatching(contentId);
const watchingList = userMoviesService.getWatchingList();

// ✅ Новый код (версия 1.2)
userMoviesService.addTVShowToWatching(show);
userMoviesService.removeTVShowFromWatching(showId);
const watchingList = userMoviesService.getTVShowWatchingList();
```

---

## Валидация

Новые методы включают автоматическую валидацию:

```javascript
// Попытка добавить фильм в watching
userMoviesService.addMovie('watching', movie);
// ❌ Ошибка: "Фильмы не могут быть в состоянии watching"

// Попытка добавить сериал через метод для фильмов
userMoviesService.addToWant({ media_type: 'tv', ... });
// ❌ Ошибка: "Используйте addTVShow() для сериалов"

// Попытка добавить фильм через метод для сериалов
userMoviesService.addTVShowToWant({ media_type: 'movie', ... });
// ❌ Ошибка: "Используйте addMovie() для фильмов"
```

---

## Структура данных

### Старая структура (v1.1)
```javascript
{
  movies: {
    want: [movie1, tvShow1],      // Смешанные
    watched: [movie2, tvShow2],   // Смешанные
    watching: [tvShow3],          // Только сериалы
    reviews: {}
  },
  tvShows: {
    episodes: {},
    seasonReviews: {}
  }
}
```

### Новая структура (v1.2)
```javascript
{
  movies: {
    want: [movie1],               // Только фильмы
    watched: [movie2],            // Только фильмы
    reviews: {}
  },
  tvShows: {
    want: [tvShow1],              // Только сериалы
    watching: [tvShow3],          // Только сериалы
    watched: [tvShow2],           // Только сериалы
    episodes: {},
    seasonReviews: {},
    reviews: {}
  }
}
```

---

## Чеклист для обновления компонента

- [ ] Определяю тип контента (`media_type`)
- [ ] Использую правильный метод для получения состояния
- [ ] Использую правильный метод для добавления
- [ ] Использую правильный метод для удаления
- [ ] Использую правильный метод для получения списков
- [ ] Проверил, что не использую `watching` для фильмов

---

## Тестирование

Запустите тест миграции:
```bash
node tests/test-migration.js
```

Ожидаемый результат: `12/12 тестов пройдено`

---

## Вопросы?

См. полную документацию: [STORAGE_SEPARATION.md](./STORAGE_SEPARATION.md)
