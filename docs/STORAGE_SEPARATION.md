# Разделение хранилищ фильмов и сериалов

## Обзор изменений (версия 1.2)

В версии 1.2 была проведена рефакторинг структуры хранения данных для разделения фильмов и сериалов в отдельные хранилища. Это улучшает архитектуру и делает код более понятным.

## Мотивация

### Проблема
Ранее фильмы и сериалы хранились в одной структуре `movies` с тремя списками:
- `movies.want` - содержал и фильмы, и сериалы
- `movies.watched` - содержал и фильмы, и сериалы  
- `movies.watching` - содержал только сериалы (фильмы не могут быть в состоянии "watching")

Различие делалось только по полю `media_type` ('movie' или 'tv').

### Почему это было неправильно
1. **Концептуальная путаница**: Фильмы не могут быть в состоянии "watching" (смотрю), так как их смотрят за один раз
2. **Смешение сущностей**: Фильмы и сериалы - разные типы контента с разной логикой
3. **Сложность фильтрации**: Приходилось постоянно фильтровать по `media_type`
4. **Риск ошибок**: Легко было случайно добавить фильм в `watching`

## Новая структура данных

### До (версия 1.1)
```javascript
{
  version: "1.1",
  movies: {
    want: [
      { id: 1, media_type: 'movie', ... },
      { id: 2, media_type: 'tv', ... }
    ],
    watched: [
      { id: 3, media_type: 'movie', ... },
      { id: 4, media_type: 'tv', ... }
    ],
    watching: [
      { id: 5, media_type: 'tv', ... }  // Только сериалы
    ],
    reviews: {}
  },
  tvShows: {
    episodes: {},
    seasonReviews: {},
    reviews: {}
  }
}
```

### После (версия 1.2)
```javascript
{
  version: "1.2",
  movies: {
    want: [
      { id: 1, media_type: 'movie', ... }  // Только фильмы
    ],
    watched: [
      { id: 3, media_type: 'movie', ... }  // Только фильмы
    ],
    reviews: {}
  },
  tvShows: {
    want: [
      { id: 2, media_type: 'tv', ... }  // Только сериалы
    ],
    watching: [
      { id: 5, media_type: 'tv', ... }  // Только сериалы
    ],
    watched: [
      { id: 4, media_type: 'tv', ... }  // Только сериалы
    ],
    episodes: {},
    seasonReviews: {},
    reviews: {}
  }
}
```

## Изменения в API

### UserMoviesService - Методы для фильмов

**Старые методы (работают только с фильмами):**
```javascript
// Получение состояния
getMovieState(movieId) // 'none' | 'want' | 'watched'

// Добавление
addToWant(movie)
addToWatched(movie)

// Удаление
removeFromWant(movieId)
removeFromWatched(movieId)

// Получение списков
getWantList()      // Только фильмы
getWatchedList()   // Только фильмы
```

### UserMoviesService - Новые методы для сериалов

**Новые методы (только для сериалов):**
```javascript
// Получение состояния
getTVShowState(showId) // 'none' | 'want' | 'watching' | 'watched'

// Добавление
addTVShowToWant(show)
addTVShowToWatching(show)
addTVShowToWatched(show)

// Удаление
removeTVShowFromWant(showId)
removeTVShowFromWatching(showId)
removeTVShowFromWatched(showId)

// Получение списков
getTVShowWantList()
getTVShowWatchingList()
getTVShowWatchedList()
```

### UserDataStore - Новые методы

**Для фильмов:**
```javascript
getMovies(type)           // type: 'want' | 'watched'
addMovie(type, movie)     // Валидация: только фильмы, не 'watching'
removeMovie(type, movieId)
```

**Для сериалов:**
```javascript
getTVShows(type)          // type: 'want' | 'watching' | 'watched'
addTVShow(type, show)     // Валидация: только сериалы
removeTVShow(type, showId)
```

## Миграция данных

Миграция происходит автоматически при первом запуске версии 1.2:

1. **Создание новых списков** для сериалов в `tvShows`
2. **Перенос сериалов** из `movies.*` в `tvShows.*`
3. **Удаление `movies.watching`** (фильмы не могут быть в watching)
4. **Валидация данных** - удаление дубликатов и некорректных записей

### Процесс миграции

```javascript
// Миграция 1.1 → 1.2
_migrateFrom1_1(data) {
  // 1. Создаем структуру для сериалов
  data.tvShows.want = [];
  data.tvShows.watching = [];
  data.tvShows.watched = [];
  
  // 2. Переносим сериалы из movies в tvShows
  ['want', 'watched', 'watching'].forEach(listType => {
    const tvShows = data.movies[listType].filter(item => item.media_type === 'tv');
    const movies = data.movies[listType].filter(item => item.media_type === 'movie');
    
    data.movies[listType] = movies;
    data.tvShows[listType] = tvShows;
  });
  
  // 3. Удаляем movies.watching
  delete data.movies.watching;
  
  return data;
}
```

## Валидация

### Защита от ошибок

**В UserDataStore:**
```javascript
addMovie(type, movie) {
  // Фильмы не могут быть в watching
  if (type === 'watching') {
    console.error('Фильмы не могут быть в состоянии watching');
    return;
  }
  
  // Только фильмы
  if (movie.media_type === 'tv') {
    console.error('Используйте addTVShow() для сериалов');
    return;
  }
  
  // ...
}

addTVShow(type, show) {
  // Только сериалы
  if (show.media_type === 'movie') {
    console.error('Используйте addMovie() для фильмов');
    return;
  }
  
  // ...
}
```

## Обновленные компоненты

### Компоненты, которые были обновлены:

1. **src/services/data-migration.js**
   - Добавлена миграция 1.1 → 1.2
   - Обновлена валидация структуры

2. **src/services/user-data-store.js**
   - Разделены методы для фильмов и сериалов
   - Добавлена валидация типов контента

3. **src/services/user-movies.js**
   - Добавлены методы для работы с сериалами
   - Разделена логика получения состояний

4. **src/components/show-card-buttons.js**
   - Обновлены вызовы методов для сериалов

5. **src/pages/profile/profile-page.js**
   - Обновлена логика получения списков

## Преимущества новой архитектуры

### 1. Четкое разделение ответственности
- Фильмы: `want` → `watched`
- Сериалы: `want` → `watching` → `watched`

### 2. Типобезопасность
- Невозможно добавить фильм в `watching`
- Невозможно смешать фильмы и сериалы

### 3. Упрощение кода
- Не нужна фильтрация по `media_type`
- Явные методы для каждого типа контента

### 4. Лучшая производительность
- Меньше операций фильтрации
- Прямой доступ к нужным спискам

### 5. Легче поддерживать
- Понятная структура данных
- Явная логика работы

## Обратная совместимость

Для обратной совместимости оставлен устаревший метод:

```javascript
// Устаревший метод (deprecated)
getWatchingList() {
  console.warn('getWatchingList() устарел. Используйте getTVShowWatchingList()');
  return this._store.getTVShows('watching');
}
```

## Тестирование

### Сценарии для проверки:

1. **Миграция существующих данных**
   - Открыть приложение с данными версии 1.1
   - Проверить, что все фильмы и сериалы на месте
   - Проверить, что сериалы перенесены в правильные списки

2. **Добавление нового контента**
   - Добавить фильм в Want → проверить `movies.want`
   - Добавить сериал в Want → проверить `tvShows.want`
   - Начать смотреть сериал → проверить `tvShows.watching`

3. **Валидация**
   - Попытаться добавить фильм в watching → должна быть ошибка
   - Попытаться добавить сериал через `addMovie()` → должна быть ошибка

4. **Профиль**
   - Проверить корректность счетчиков
   - Проверить отображение фильмов и сериалов в разных вкладках

## Заключение

Разделение хранилищ фильмов и сериалов делает архитектуру приложения более чистой и понятной. Миграция происходит автоматически, и пользователи не заметят изменений в работе приложения.
