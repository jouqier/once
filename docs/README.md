# Документация проекта

## 📚 Содержание

### Для разработчиков

1. **[API Changes v1.2](./API_CHANGES_v1.2.md)** - Краткая справка по изменениям API
2. **[Storage Separation](./STORAGE_SEPARATION.md)** - Подробное описание разделения хранилищ
3. **[Migration Summary](./MIGRATION_SUMMARY.md)** - Краткое резюме миграции
4. **[Watching State Implementation](./WATCHING_STATE_IMPLEMENTATION.md)** - Реализация состояния "Смотрю"

### Changelog

- **[CHANGELOG.md](../CHANGELOG.md)** - История изменений проекта

## 🚀 Быстрый старт

### Версия 1.2 - Разделение хранилищ

В версии 1.2 фильмы и сериалы хранятся отдельно:

```javascript
// Для фильмов
userMoviesService.getMovieState(movieId)
userMoviesService.addToWant(movie)
userMoviesService.addToWatched(movie)

// Для сериалов
userMoviesService.getTVShowState(showId)
userMoviesService.addTVShowToWant(show)
userMoviesService.addTVShowToWatching(show)
userMoviesService.addTVShowToWatched(show)
```

### Важно помнить

- ❌ Фильмы **НЕ могут** быть в состоянии `watching`
- ✅ Сериалы **МОГУТ** быть в состоянии `watching`
- 🔍 Всегда проверяйте `media_type` перед вызовом методов

## 🧪 Тестирование

### Запуск тестов миграции

```bash
node tests/test-migration.js
```

### Сборка проекта

```bash
npm run build
```

### Локальная разработка

```bash
npm run dev
```

## 📖 Структура документации

```
docs/
├── README.md                              # Этот файл
├── API_CHANGES_v1.2.md                    # Справка по API
├── STORAGE_SEPARATION.md                  # Подробное описание
├── MIGRATION_SUMMARY.md                   # Краткое резюме
└── WATCHING_STATE_IMPLEMENTATION.md       # Реализация watching
```

## 🔄 Миграция данных

Миграция происходит автоматически при первом запуске v1.2:

1. ✅ Создаются новые списки для сериалов
2. ✅ Сериалы переносятся из `movies` в `tvShows`
3. ✅ Удаляется `movies.watching`
4. ✅ Валидация и очистка данных

## 💡 Примеры использования

### Пример 1: Универсальная функция добавления в Want

```javascript
function addToWantList(content) {
    if (content.media_type === 'movie') {
        userMoviesService.addToWant(content);
    } else if (content.media_type === 'tv') {
        userMoviesService.addTVShowToWant(content);
    }
}
```

### Пример 2: Получение состояния контента

```javascript
function getContentState(content) {
    if (content.media_type === 'movie') {
        return userMoviesService.getMovieState(content.id);
    } else if (content.media_type === 'tv') {
        return userMoviesService.getTVShowState(content.id);
    }
    return 'none';
}
```

### Пример 3: Получение всех списков

```javascript
// Фильмы
const moviesWant = userMoviesService.getWantList();
const moviesWatched = userMoviesService.getWatchedList();

// Сериалы
const tvWant = userMoviesService.getTVShowWantList();
const tvWatching = userMoviesService.getTVShowWatchingList();
const tvWatched = userMoviesService.getTVShowWatchedList();
```

## 🎯 Чеклист для новых компонентов

При создании нового компонента, работающего с контентом:

- [ ] Определяю тип контента (`media_type`)
- [ ] Использую правильный метод для получения состояния
- [ ] Использую правильный метод для добавления
- [ ] Использую правильный метод для удаления
- [ ] Не использую `watching` для фильмов
- [ ] Добавил обработку ошибок
- [ ] Протестировал с фильмами и сериалами

## 🐛 Отладка

### Проверка структуры данных

Откройте консоль браузера:

```javascript
// Получить все данные пользователя
const data = JSON.parse(localStorage.getItem('user_data_YOUR_USER_ID'));
console.log(data);

// Проверить версию
console.log('Version:', data.version); // Должно быть '1.2'

// Проверить структуру
console.log('Movies:', data.movies);
console.log('TV Shows:', data.tvShows);
```

### Проверка миграции

```javascript
// Проверить, что movies.watching удалён
console.log('movies.watching:', data.movies.watching); // undefined

// Проверить, что сериалы перенесены
console.log('tvShows.want:', data.tvShows.want);
console.log('tvShows.watching:', data.tvShows.watching);
console.log('tvShows.watched:', data.tvShows.watched);
```

## 📞 Поддержка

Если у вас возникли вопросы:

1. Прочитайте [API_CHANGES_v1.2.md](./API_CHANGES_v1.2.md)
2. Проверьте [STORAGE_SEPARATION.md](./STORAGE_SEPARATION.md)
3. Запустите тесты: `node tests/test-migration.js`

## 📝 Лицензия

См. LICENSE файл в корне проекта.
