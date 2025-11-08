# Руководство по использованию кеша

## Для разработчиков

### Быстрый старт

```javascript
// Импортируйте TMDBCacheService вместо TMDBService
import TMDBCacheService from './services/tmdb-cache.js';

// Используйте как обычно - кеширование автоматическое
const trending = await TMDBCacheService.getTrendingMovies();
const details = await TMDBCacheService.getMovieDetails(123);
```

### Когда инвалидировать кеш

```javascript
// При изменении списков пользователя (want/watched/watching)
document.addEventListener('movie-list-changed', () => {
    TMDBCacheService.invalidateRecommendations();
});
```

### Отладка в консоли

```javascript
// Посмотреть статистику хранилища
cacheDebug.stats();

// Очистить только кеш (user_data сохраняется!)
cacheDebug.clear();

// Запустить миграцию вручную
cacheDebug.migrate();
```

## Что кешируется

### ✅ Кешируется автоматически

- `getTrendingMovies()` - 30 минут
- `getUpcomingMovies()` - 1 час
- `getPopularMovies()` - 1 час
- `getMovieDetails(id)` - 24 часа
- `getTrendingTV()` - 30 минут
- `getPopularTV()` - 1 час
- `getTopRatedTV()` - 1 час
- `getTVDetails(id)` - 24 часа
- `getPersonalizedRecommendations()` - 5 минут (memory)
- `getPersonalizedTVRecommendations()` - 5 минут (memory)

### ❌ НЕ кешируется

- `searchMulti()` - поиск всегда свежий
- `getFullMovieInfo()` - детальная информация
- `getMovieCredits()` - актерский состав
- `getTVSeasons()` - сезоны сериала
- `getPersonDetails()` - информация о персоне

Причина: эти данные запрашиваются редко или должны быть всегда актуальными.

## Примеры использования

### Загрузка главной страницы фильмов

```javascript
async loadData() {
    // Все запросы автоматически кешируются
    const [trending, upcoming, popular] = await Promise.all([
        TMDBCacheService.getTrendingMovies(),
        TMDBCacheService.getUpcomingMovies(),
        TMDBCacheService.getPopularMovies()
    ]);

    // При повторном вызове данные берутся из кеша
    // Запросы к API не выполняются
}
```

### Рекомендации с инвалидацией

```javascript
class MoviesScreen extends HTMLElement {
    constructor() {
        super();
        // Слушаем изменения списков
        this._boundHandler = this._handleListChanged.bind(this);
    }

    connectedCallback() {
        document.addEventListener('movie-list-changed', this._boundHandler);
    }

    disconnectedCallback() {
        document.removeEventListener('movie-list-changed', this._boundHandler);
    }

    async _handleListChanged() {
        // Инвалидируем кеш рекомендаций
        TMDBCacheService.invalidateRecommendations();
        
        // Загружаем новые рекомендации
        await this._reloadRecommendations();
    }

    async _reloadRecommendations() {
        const wantList = userMoviesService.getWantList();
        const watchedList = userMoviesService.getWatchedList();
        
        // Получаем свежие рекомендации
        const recommended = await TMDBCacheService.getPersonalizedRecommendations(
            wantList, 
            watchedList
        );
        
        this._recommendedMovies = recommended;
        this.render();
    }
}
```

### Детали фильма

```javascript
async showMovieDetails(movieId) {
    // Детали кешируются на 24 часа
    const details = await TMDBCacheService.getMovieDetails(movieId);
    
    // Актерский состав НЕ кешируется (всегда свежий)
    const credits = await TMDBCacheService.getMovieCredits(movieId);
    
    this.render(details, credits);
}
```

## Мониторинг

### Проверка размера хранилища

```javascript
// В консоли браузера
cacheDebug.stats();

// Вывод:
// 📊 Storage Statistics:
// ─────────────────────────────────────
// Total: 245.67 KB (15 items)
// 
// 🔴 User Data: 12.34 KB (1 items) - 5.0%
//    ↳ CRITICAL - Never delete
// 
// 🟡 Cache: 233.33 KB (14 items) - 95.0%
//    ↳ Safe to delete
// ─────────────────────────────────────
```

### Очистка кеша

```javascript
// Безопасная очистка (user_data сохраняется)
cacheDebug.clear();

// Вывод:
// ✓ Cleared cache: freed 233.33 KB
// ✓ User data preserved: 12.34 KB
```

## Производительность

### До кеширования

```
Загрузка главной страницы:
- getTrendingMovies: 450ms
- getUpcomingMovies: 380ms
- getPopularMovies: 420ms
Итого: ~1250ms
```

### После кеширования

```
Первая загрузка: ~1250ms (запросы к API)
Повторная загрузка: ~5ms (из кеша)

Ускорение: 250x
```

## Лимиты localStorage

Типичный лимит: 5-10 MB

Наше использование:
- User data: ~10-50 KB (зависит от количества фильмов)
- Cache: ~200-500 KB (зависит от количества кешированных данных)

Итого: ~0.5 MB из 5 MB (10% от лимита)

## Troubleshooting

### Кеш не обновляется

```javascript
// Проверьте TTL
import { TTL } from './services/cache-strategy.js';
console.log(TTL.TRENDING_LISTS); // 1800000 (30 минут)

// Принудительно очистите кеш
cacheDebug.clear();
```

### localStorage переполнен

```javascript
// Проверьте размер
cacheDebug.stats();

// Очистите кеш
cacheDebug.clear();

// Если не помогло - проверьте другие приложения
// localStorage общий для всего домена
```

### Рекомендации не обновляются

```javascript
// Убедитесь, что инвалидация вызывается
document.addEventListener('movie-list-changed', () => {
    console.log('List changed - invalidating recommendations');
    TMDBCacheService.invalidateRecommendations();
});
```

## Best Practices

1. **Всегда используйте TMDBCacheService** вместо прямого TMDBService
2. **Инвалидируйте рекомендации** при изменении списков
3. **Не кешируйте поиск** - пользователи ожидают свежие результаты
4. **Мониторьте размер** - используйте `cacheDebug.stats()`
5. **Тестируйте с пустым кешем** - очищайте перед тестированием

## Миграция со старого кода

### Было

```javascript
import TMDBService from './services/tmdb.js';

// Ручное кеширование
if (MoviesScreen._cache) {
    this._trendingMovies = MoviesScreen._cache.trending;
} else {
    this._trendingMovies = await TMDBService.getTrendingMovies();
    MoviesScreen._cache = { trending: this._trendingMovies };
}
```

### Стало

```javascript
import TMDBCacheService from './services/tmdb-cache.js';

// Автоматическое кеширование
this._trendingMovies = await TMDBCacheService.getTrendingMovies();
```

Проще, чище, надежнее! 🎉
