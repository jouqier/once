/**
 * Стратегия кеширования для приложения
 * 
 * КРИТИЧНЫЕ ДАННЫЕ (localStorage, никогда не теряем):
 * - user_data_${userId} - все пользовательские данные
 * 
 * КЕШИРУЕМЫЕ ДАННЫЕ (можно потерять и перезапросить):
 * - Метаданные из TMDB API
 * - Списки trending/popular
 * - Рекомендации
 * - Вычисленный прогресс
 */

class CacheStrategy {
    constructor() {
        // Memory cache для быстрого доступа (теряется при перезагрузке)
        this.memoryCache = new Map();
        
        // Префиксы для разных типов кеша
        this.CACHE_PREFIX = 'cache_';
        this.USER_DATA_PREFIX = 'user_data_';
    }

    /**
     * Получить данные из кеша
     * @param {string} key - ключ
     * @param {object} options - опции
     * @param {boolean} options.persistent - использовать localStorage
     * @param {number} options.ttl - время жизни в мс
     */
    get(key, options = {}) {
        const { persistent = false, ttl = null } = options;
        
        // Сначала проверяем memory cache
        if (this.memoryCache.has(key)) {
            const item = this.memoryCache.get(key);
            if (!ttl || (Date.now() - item.timestamp < ttl)) {
                return item.value;
            }
            // Устарело - удаляем
            this.memoryCache.delete(key);
        }

        // Если нужен persistent cache
        if (persistent) {
            try {
                const stored = localStorage.getItem(this.CACHE_PREFIX + key);
                if (stored) {
                    const item = JSON.parse(stored);
                    if (!ttl || (Date.now() - item.timestamp < ttl)) {
                        // Восстанавливаем в memory cache для быстрого доступа
                        this.memoryCache.set(key, item);
                        return item.value;
                    }
                    // Устарело - удаляем
                    localStorage.removeItem(this.CACHE_PREFIX + key);
                }
            } catch (e) {
                console.warn('Cache read error:', e);
            }
        }

        return null;
    }

    /**
     * Сохранить данные в кеш
     */
    set(key, value, options = {}) {
        const { persistent = false } = options;
        
        const item = {
            value,
            timestamp: Date.now()
        };

        // Всегда сохраняем в memory cache
        this.memoryCache.set(key, item);

        // Опционально в localStorage
        if (persistent) {
            try {
                localStorage.setItem(this.CACHE_PREFIX + key, JSON.stringify(item));
            } catch (e) {
                console.warn('Cache write error (localStorage full?):', e);
                // Если localStorage переполнен, ничего страшного - есть memory cache
            }
        }
    }

    /**
     * Удалить из кеша
     */
    delete(key, options = {}) {
        const { persistent = false } = options;
        
        this.memoryCache.delete(key);
        
        if (persistent) {
            localStorage.removeItem(this.CACHE_PREFIX + key);
        }
    }

    /**
     * Инвалидировать кеш по паттерну
     */
    invalidatePattern(pattern, options = {}) {
        const { persistent = false } = options;
        
        // Memory cache
        for (const key of this.memoryCache.keys()) {
            if (key.includes(pattern)) {
                this.memoryCache.delete(key);
            }
        }

        // localStorage
        if (persistent) {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(this.CACHE_PREFIX) && key.includes(pattern)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        }
    }

    /**
     * Очистить весь кеш (НЕ трогает user_data!)
     */
    clearAll(options = {}) {
        const { persistent = false } = options;
        
        this.memoryCache.clear();
        
        if (persistent) {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                // Удаляем только cache_, НЕ трогаем user_data_
                if (key.startsWith(this.CACHE_PREFIX)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        }
    }

    /**
     * Получить размер кеша
     */
    getSize() {
        let memorySize = this.memoryCache.size;
        let persistentSize = 0;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.CACHE_PREFIX)) {
                persistentSize++;
            }
        }
        
        return { memory: memorySize, persistent: persistentSize };
    }
}

// Константы TTL
export const TTL = {
    MOVIE_DETAILS: 24 * 60 * 60 * 1000,      // 24 часа
    TV_DETAILS: 24 * 60 * 60 * 1000,         // 24 часа
    TRENDING_LISTS: 30 * 60 * 1000,          // 30 минут
    POPULAR_LISTS: 60 * 60 * 1000,           // 1 час
    RECOMMENDATIONS: 5 * 60 * 1000,          // 5 минут
    SHOW_PROGRESS: Infinity,                 // До инвалидации по событию
    SEARCH_RESULTS: 10 * 60 * 1000           // 10 минут
};

// Ключи кеша
export const CACHE_KEYS = {
    MOVIES_TRENDING: 'movies_trending',
    MOVIES_UPCOMING: 'movies_upcoming',
    MOVIES_POPULAR: 'movies_popular',
    MOVIES_RECOMMENDED: 'movies_recommended',
    TV_TRENDING: 'tv_trending',
    TV_POPULAR: 'tv_popular',
    TV_TOP_RATED: 'tv_top_rated',
    TV_RECOMMENDED: 'tv_recommended',
    movieDetails: (id) => `movie_${id}`,
    tvDetails: (id) => `tv_${id}`,
    showProgress: (id) => `progress_${id}`
};

export const cacheStrategy = new CacheStrategy();
