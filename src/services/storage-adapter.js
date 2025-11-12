/**
 * StorageAdapter - адаптер для работы с разбитой структурой данных
 * Поддерживает localStorage и Telegram CloudStorage с автоматическим выбором
 * 
 * Структура ключей (оптимизированная):
 * - meta - метаданные (version, userId)
 * - movies_want - массив ID фильмов
 * - movies_watched - массив ID фильмов
 * - movies_reviews - все отзывы на фильмы (объект {id: review})
 *   Если не влезает → movies_reviews_g{index}
 * - tv_want - массив ID сериалов
 * - tv_watching - массив ID сериалов
 * - tv_watched - массив ID сериалов
 * - tv_season_reviews - все отзывы на сезоны (объект {"tvId_season": review})
 *   Если не влезает → tv_season_reviews_g{index}
 * - tv_episodes - все эпизоды всех сериалов (объект {tvId: {season: episodes[]}})
 *   Если не влезает → tv_episodes_g{index}
 * - tv_episodes_meta - метаданные для эпизодов (groups)
 */

import { CloudStorageAdapter } from './cloud-storage-adapter.js';

const MAX_VALUE_SIZE = 4096; // Лимит CloudStorage
const GROUP_SIZE_LIMIT = 3500; // Запас для группировки

class StorageAdapter {
    constructor(userId, storageType = 'auto') {
        this._userId = userId;
        this._prefix = `user_${userId}_`;
        this._storageType = storageType;
        
        // Определяем тип хранилища
        if (storageType === 'auto') {
            this._useCloudStorage = CloudStorageAdapter.isAvailable();
        } else {
            this._useCloudStorage = storageType === 'cloudStorage';
        }
        
        // Инициализируем адаптер хранилища
        if (this._useCloudStorage) {
            this._cloudAdapter = new CloudStorageAdapter();
        }
        
        // Внутренний кеш для синхронного доступа
        this._cache = {};
        this._cacheInitialized = false;
    }
    
    /**
     * Инициализировать кеш (загрузить все данные)
     * Должен быть вызван перед использованием синхронных методов
     */
    async init() {
        if (this._cacheInitialized) {
            return;
        }
        
        try {
            await this._loadCache();
            this._cacheInitialized = true;
        } catch (error) {
            console.error('Ошибка инициализации кеша StorageAdapter:', error);
            // Fallback на пустой кеш
            this._cache = {};
            this._cacheInitialized = true;
        }
    }
    
    /**
     * Загрузить все данные в кеш
     */
    async _loadCache() {
        const keys = await this._getAllKeys();
        const cache = {};
        
        // Загружаем все ключи параллельно
        const loadPromises = keys.map(async (key) => {
            try {
                const value = await this._getItem(key);
                if (value !== null) {
                    cache[key] = value;
                }
            } catch (error) {
                console.warn(`Не удалось загрузить ключ ${key} в кеш:`, error);
            }
        });
        
        await Promise.all(loadPromises);
        this._cache = cache;
    }
    
    /**
     * Получить значение из кеша или хранилища
     */
    _getFromCache(key) {
        if (key in this._cache) {
            return this._cache[key];
        }
        return null;
    }
    
    /**
     * Сохранить значение в кеш и синхронизировать в фоне
     */
    _setToCache(key, value) {
        this._cache[key] = value;
        // Сохраняем асинхронно в фоне (не блокируем UI)
        this._setItem(key, value).catch(error => {
            console.error(`Ошибка фоновой синхронизации ключа ${key}:`, error);
        });
    }
    
    /**
     * Удалить значение из кеша и синхронизировать в фоне
     */
    _removeFromCache(key) {
        delete this._cache[key];
        // Удаляем асинхронно в фоне
        this._removeItem(key).catch(error => {
            console.error(`Ошибка фонового удаления ключа ${key}:`, error);
        });
    }

    /**
     * Нормализует ключ для CloudStorage (A-Z, a-z, 0-9, _, -)
     */
    _normalizeKey(key) {
        return key.replace(/[^A-Za-z0-9_-]/g, '_');
    }

    /**
     * Получить полный ключ с префиксом
     */
    _getKey(key) {
        return this._normalizeKey(`${this._prefix}${key}`);
    }

    /**
     * Получить значение из хранилища (асинхронно)
     */
    async _getItem(key) {
        try {
            if (this._useCloudStorage) {
                // Используем CloudStorage
                try {
                    const value = await this._cloudAdapter.getItem(key);
                    if (value === null) {
                        return null;
                    }
                    return JSON.parse(value);
                } catch (error) {
                    console.warn(`Ошибка чтения из CloudStorage, fallback на localStorage:`, error);
                    // Fallback на localStorage
                    return this._getItemFromLocalStorage(key);
                }
            } else {
                // Используем localStorage
                return this._getItemFromLocalStorage(key);
            }
        } catch (error) {
            console.error(`Ошибка чтения ключа ${key}:`, error);
            return null;
        }
    }
    
    /**
     * Получить значение из localStorage (синхронно)
     */
    _getItemFromLocalStorage(key) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error(`Ошибка чтения ключа ${key} из localStorage:`, error);
            return null;
        }
    }

    /**
     * Сохранить значение в хранилище (асинхронно)
     */
    async _setItem(key, value) {
        try {
            const json = JSON.stringify(value);
            
            // Проверяем размер
            if (json.length > MAX_VALUE_SIZE) {
                console.warn(`⚠️ Значение ключа ${key} превышает лимит: ${json.length} > ${MAX_VALUE_SIZE}`);
            }
            
            if (this._useCloudStorage) {
                // Используем CloudStorage
                try {
                    await this._cloudAdapter.setItem(key, json);
                    return true;
                } catch (error) {
                    console.warn(`Ошибка записи в CloudStorage, fallback на localStorage:`, error);
                    // Fallback на localStorage
                    return this._setItemToLocalStorage(key, json);
                }
            } else {
                // Используем localStorage
                return this._setItemToLocalStorage(key, json);
            }
        } catch (error) {
            console.error(`Ошибка записи ключа ${key}:`, error);
            if (error.name === 'QuotaExceededError') {
                throw error;
            }
            return false;
        }
    }
    
    /**
     * Сохранить значение в localStorage (синхронно)
     */
    _setItemToLocalStorage(key, json) {
        try {
            localStorage.setItem(key, json);
            return true;
        } catch (error) {
            console.error(`Ошибка записи ключа ${key} в localStorage:`, error);
            if (error.name === 'QuotaExceededError') {
                throw error;
            }
            return false;
        }
    }

    /**
     * Удалить ключ из хранилища (асинхронно)
     */
    async _removeItem(key) {
        try {
            if (this._useCloudStorage) {
                // Используем CloudStorage
                try {
                    await this._cloudAdapter.removeItem(key);
                    return true;
                } catch (error) {
                    console.warn(`Ошибка удаления из CloudStorage, fallback на localStorage:`, error);
                    // Fallback на localStorage
                    return this._removeItemFromLocalStorage(key);
                }
            } else {
                // Используем localStorage
                return this._removeItemFromLocalStorage(key);
            }
        } catch (error) {
            console.error(`Ошибка удаления ключа ${key}:`, error);
            return false;
        }
    }
    
    /**
     * Удалить ключ из localStorage (синхронно)
     */
    _removeItemFromLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Ошибка удаления ключа ${key} из localStorage:`, error);
            return false;
        }
    }

    /**
     * Получить все ключи с префиксом пользователя (асинхронно)
     */
    async _getAllKeys() {
        const prefix = this._prefix;
        
        try {
            if (this._useCloudStorage) {
                // Используем CloudStorage
                try {
                    const allKeys = await this._cloudAdapter.getKeys();
                    return allKeys.filter(key => key.startsWith(prefix));
                } catch (error) {
                    console.warn(`Ошибка получения ключей из CloudStorage, fallback на localStorage:`, error);
                    // Fallback на localStorage
                    return this._getAllKeysFromLocalStorage(prefix);
                }
            } else {
                // Используем localStorage
                return this._getAllKeysFromLocalStorage(prefix);
            }
        } catch (error) {
            console.error('Ошибка получения ключей:', error);
            return [];
        }
    }
    
    /**
     * Получить все ключи из localStorage (синхронно)
     */
    _getAllKeysFromLocalStorage(prefix) {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                keys.push(key);
            }
        }
        return keys;
    }

    // ========== МЕТАДАННЫЕ ==========

    /**
     * Получить метаданные (синхронно, использует кеш)
     */
    getMeta() {
        const key = this._getKey('meta');
        const value = this._getFromCache(key);
        return value || { version: '1.4', userId: this._userId };
    }

    /**
     * Сохранить метаданные (синхронно, обновляет кеш и синхронизирует в фоне)
     */
    setMeta(meta) {
        const key = this._getKey('meta');
        const value = { ...meta, userId: this._userId };
        this._setToCache(key, value);
        return true;
    }

    // ========== ФИЛЬМЫ ==========

    /**
     * Получить список фильмов (want или watched) (синхронно, использует кеш)
     */
    getMoviesList(type) {
        const key = this._getKey(`movies_${type}`);
        const value = this._getFromCache(key);
        return Array.isArray(value) ? value : [];
    }

    /**
     * Сохранить список фильмов (синхронно, обновляет кеш и синхронизирует в фоне)
     */
    setMoviesList(type, ids) {
        const key = this._getKey(`movies_${type}`);
        this._setToCache(key, ids);
        return true;
    }

    /**
     * Получить все отзывы на фильмы (группированные) (синхронно, использует кеш)
     */
    _getAllMovieReviewsData() {
        const mainKey = this._getKey('movies_reviews');
        const mainData = this._getFromCache(mainKey);
        
        if (mainData) {
            return mainData;
        }
        
        // Проверяем группы
        const groups = [];
        let groupIndex = 0;
        
        while (true) {
            const groupKey = this._getKey(`movies_reviews_g${groupIndex}`);
            const groupData = this._getFromCache(groupKey);
            
            if (!groupData) {
                break;
            }
            
            groups.push(groupData);
            groupIndex++;
        }
        
        // Объединяем группы
        if (groups.length > 0) {
            return Object.assign({}, ...groups);
        }
        
        return {};
    }

    /**
     * Сохранить все отзывы на фильмы (с автоматическим разбиением на группы)
     * Синхронно обновляет кеш и синхронизирует в фоне
     */
    _saveAllMovieReviewsData(reviews) {
        const json = JSON.stringify(reviews);
        
        if (json.length <= MAX_VALUE_SIZE) {
            const mainKey = this._getKey('movies_reviews');
            this._setToCache(mainKey, reviews);
            
            // Удаляем группы, если они были
            this._removeMovieReviewsGroups();
            
            return true;
        }
        
        // Разбиваем на группы
        return this._saveMovieReviewsInGroups(reviews);
    }

    /**
     * Сохранить отзывы на фильмы в группах (синхронно обновляет кеш)
     */
    _saveMovieReviewsInGroups(reviews) {
        const groups = [];
        let currentGroup = {};
        let currentSize = 2; // "{"
        const maxSize = GROUP_SIZE_LIMIT;
        
        const movieIds = Object.keys(reviews).sort((a, b) => parseInt(a) - parseInt(b));
        
        for (const movieId of movieIds) {
            const reviewData = { [movieId]: reviews[movieId] };
            const reviewJson = JSON.stringify(reviewData);
            const size = reviewJson.length - 2; // Убираем фигурные скобки
            
            if (currentSize + size + 1 < maxSize) { // +1 для запятой
                currentGroup[movieId] = reviews[movieId];
                currentSize += size + 1;
            } else {
                // Сохраняем текущую группу
                if (Object.keys(currentGroup).length > 0) {
                    const groupKey = this._getKey(`movies_reviews_g${groups.length}`);
                    this._setToCache(groupKey, currentGroup);
                    groups.push(groupKey);
                }
                
                // Начинаем новую группу
                currentGroup = { [movieId]: reviews[movieId] };
                currentSize = size + 2; // "{"
            }
        }
        
        // Сохраняем последнюю группу
        if (Object.keys(currentGroup).length > 0) {
            const groupKey = this._getKey(`movies_reviews_g${groups.length}`);
            this._setToCache(groupKey, currentGroup);
            groups.push(groupKey);
        }
        
        // Удаляем основной ключ, если он был
        const mainKey = this._getKey('movies_reviews');
        this._removeFromCache(mainKey);
        
        return true;
    }

    /**
     * Удалить группы отзывов на фильмы (синхронно обновляет кеш)
     */
    _removeMovieReviewsGroups() {
        const prefix = this._getKey('movies_reviews_g');
        // Получаем ключи из кеша
        const keys = Object.keys(this._cache).filter(key => key.startsWith(prefix));
        
        keys.forEach(key => {
            this._removeFromCache(key);
        });
    }

    /**
     * Получить отзыв на фильм
     */
    getMovieReview(movieId) {
        const allReviews = this._getAllMovieReviewsData();
        return allReviews[movieId] || null;
    }

    /**
     * Сохранить отзыв на фильм
     */
    setMovieReview(movieId, review) {
        const allReviews = this._getAllMovieReviewsData();
        allReviews[movieId] = review;
        return this._saveAllMovieReviewsData(allReviews);
    }

    /**
     * Удалить отзыв на фильм
     */
    removeMovieReview(movieId) {
        const allReviews = this._getAllMovieReviewsData();
        delete allReviews[movieId];
        return this._saveAllMovieReviewsData(allReviews);
    }

    /**
     * Получить все отзывы на фильмы
     */
    getAllMovieReviews() {
        return this._getAllMovieReviewsData();
    }

    // ========== СЕРИАЛЫ ==========

    /**
     * Получить список сериалов (want, watching или watched) (синхронно, использует кеш)
     */
    getTVShowsList(type) {
        const key = this._getKey(`tv_${type}`);
        const value = this._getFromCache(key);
        return Array.isArray(value) ? value : [];
    }

    /**
     * Сохранить список сериалов (синхронно, обновляет кеш и синхронизирует в фоне)
     */
    setTVShowsList(type, ids) {
        const key = this._getKey(`tv_${type}`);
        this._setToCache(key, ids);
        return true;
    }

    // ========== ОТЗЫВЫ НА СЕЗОНЫ ==========

    /**
     * Получить все отзывы на сезоны (группированные) (синхронно, использует кеш)
     */
    _getAllSeasonReviewsData() {
        const mainKey = this._getKey('tv_season_reviews');
        const mainData = this._getFromCache(mainKey);
        
        if (mainData) {
            return mainData;
        }
        
        // Проверяем группы
        const groups = [];
        let groupIndex = 0;
        
        while (true) {
            const groupKey = this._getKey(`tv_season_reviews_g${groupIndex}`);
            const groupData = this._getFromCache(groupKey);
            
            if (!groupData) {
                break;
            }
            
            groups.push(groupData);
            groupIndex++;
        }
        
        // Объединяем группы
        if (groups.length > 0) {
            return Object.assign({}, ...groups);
        }
        
        return {};
    }

    /**
     * Сохранить все отзывы на сезоны (с автоматическим разбиением на группы)
     * Синхронно обновляет кеш и синхронизирует в фоне
     */
    _saveAllSeasonReviewsData(reviews) {
        const json = JSON.stringify(reviews);
        
        if (json.length <= MAX_VALUE_SIZE) {
            const mainKey = this._getKey('tv_season_reviews');
            this._setToCache(mainKey, reviews);
            
            // Удаляем группы, если они были
            this._removeSeasonReviewsGroups();
            
            return true;
        }
        
        // Разбиваем на группы
        return this._saveSeasonReviewsInGroups(reviews);
    }

    /**
     * Сохранить отзывы на сезоны в группах (синхронно обновляет кеш)
     */
    _saveSeasonReviewsInGroups(reviews) {
        const groups = [];
        let currentGroup = {};
        let currentSize = 2; // "{"
        const maxSize = GROUP_SIZE_LIMIT;
        
        const reviewKeys = Object.keys(reviews).sort();
        
        for (const reviewKey of reviewKeys) {
            const reviewData = { [reviewKey]: reviews[reviewKey] };
            const reviewJson = JSON.stringify(reviewData);
            const size = reviewJson.length - 2;
            
            if (currentSize + size + 1 < maxSize) {
                currentGroup[reviewKey] = reviews[reviewKey];
                currentSize += size + 1;
            } else {
                if (Object.keys(currentGroup).length > 0) {
                    const groupKey = this._getKey(`tv_season_reviews_g${groups.length}`);
                    this._setToCache(groupKey, currentGroup);
                    groups.push(groupKey);
                }
                
                currentGroup = { [reviewKey]: reviews[reviewKey] };
                currentSize = size + 2;
            }
        }
        
        if (Object.keys(currentGroup).length > 0) {
            const groupKey = this._getKey(`tv_season_reviews_g${groups.length}`);
            this._setToCache(groupKey, currentGroup);
            groups.push(groupKey);
        }
        
        const mainKey = this._getKey('tv_season_reviews');
        this._removeFromCache(mainKey);
        
        return true;
    }

    /**
     * Удалить группы отзывов на сезоны (синхронно обновляет кеш)
     */
    _removeSeasonReviewsGroups() {
        const prefix = this._getKey('tv_season_reviews_g');
        // Получаем ключи из кеша
        const keys = Object.keys(this._cache).filter(key => key.startsWith(prefix));
        
        keys.forEach(key => {
            this._removeFromCache(key);
        });
    }

    /**
     * Получить отзыв на сезон
     */
    getSeasonReview(tvId, seasonNumber) {
        const allReviews = this._getAllSeasonReviewsData();
        const reviewKey = `${tvId}_${seasonNumber}`;
        return allReviews[reviewKey] || null;
    }

    /**
     * Сохранить отзыв на сезон
     */
    setSeasonReview(tvId, seasonNumber, review) {
        const allReviews = this._getAllSeasonReviewsData();
        const reviewKey = `${tvId}_${seasonNumber}`;
        allReviews[reviewKey] = review;
        return this._saveAllSeasonReviewsData(allReviews);
    }

    /**
     * Удалить отзыв на сезон
     */
    removeSeasonReview(tvId, seasonNumber) {
        const allReviews = this._getAllSeasonReviewsData();
        const reviewKey = `${tvId}_${seasonNumber}`;
        delete allReviews[reviewKey];
        return this._saveAllSeasonReviewsData(allReviews);
    }

    /**
     * Получить все отзывы на сезоны
     */
    getAllSeasonReviews() {
        return this._getAllSeasonReviewsData();
    }

    // ========== ЭПИЗОДЫ ==========

    /**
     * Форматировать эпизоды в компактный формат (диапазон или массив)
     */
    _formatEpisodes(episodes) {
        if (!Array.isArray(episodes) || episodes.length === 0) {
            return [];
        }
        
        // Сортируем эпизоды
        const sorted = [...episodes].sort((a, b) => a - b);
        
        // Если все эпизоды просмотрены подряд (начинается с 1 и заканчивается на длину)
        if (sorted[0] === 1 && sorted[sorted.length - 1] === sorted.length) {
            // Используем диапазон: [1, 30]
            return [1, sorted.length];
        }
        
        // Иначе массив: [1, 2, 5, 7, ...]
        return sorted;
    }

    /**
     * Распарсить эпизоды из компактного формата
     */
    _parseEpisodes(data) {
        if (!Array.isArray(data)) {
            return [];
        }
        
        // Если это диапазон: [1, 30] → [1,2,3,...,30]
        if (data.length === 2 && typeof data[0] === 'number' && typeof data[1] === 'number') {
            const [start, end] = data;
            if (start === 1 && end >= start) {
                return Array.from({ length: end }, (_, i) => i + 1);
            }
        }
        
        // Иначе массив: [1, 2, 5, 7]
        return data;
    }

    /**
     * Получить все эпизоды всех сериалов (группированные) (синхронно, использует кеш)
     */
    _getAllEpisodesData() {
        const mainKey = this._getKey('tv_episodes');
        const mainData = this._getFromCache(mainKey);
        
        if (mainData) {
            return mainData;
        }
        
        // Проверяем группы (если данные разбиты)
        const groups = [];
        let groupIndex = 0;
        
        while (true) {
            const groupKey = this._getKey(`tv_episodes_g${groupIndex}`);
            const groupData = this._getFromCache(groupKey);
            
            if (!groupData) {
                break;
            }
            
            groups.push(groupData);
            groupIndex++;
        }
        
        // Объединяем группы
        if (groups.length > 0) {
            return Object.assign({}, ...groups);
        }
        
        return {};
    }

    /**
     * Получить эпизоды сезона
     */
    getSeasonEpisodes(tvId, seasonNumber) {
        try {
            const allEpisodes = this._getAllEpisodesData();
            const tvData = allEpisodes[String(tvId)];
            
            if (!tvData) {
                return [];
            }
            
            const seasonKey = String(seasonNumber);
            const seasonData = tvData[seasonKey];
            
            if (!seasonData) {
                return [];
            }
            
            return this._parseEpisodes(seasonData);
        } catch (error) {
            console.error('Ошибка получения эпизодов сезона:', error);
            return [];
        }
    }

    /**
     * Сохранить эпизоды сезона (с автоматическим разбиением на группы при необходимости)
     */
    setSeasonEpisodes(tvId, seasonNumber, episodes) {
        try {
            // Получаем все существующие данные всех сериалов
            let allEpisodes = this._getAllEpisodesData();
            
            // Инициализируем данные сериала, если их нет
            if (!allEpisodes[String(tvId)]) {
                allEpisodes[String(tvId)] = {};
            }
            
            // Форматируем эпизоды в компактный формат
            const formatted = this._formatEpisodes(episodes);
            
            // Обновляем данные сезона
            allEpisodes[String(tvId)][String(seasonNumber)] = formatted;
            
            // Сохраняем все данные
            return this._saveAllEpisodesData(allEpisodes);
        } catch (error) {
            console.error('Ошибка сохранения эпизодов сезона:', error);
            return false;
        }
    }

    /**
     * Сохранить все эпизоды всех сериалов (с автоматическим разбиением на группы)
     * Синхронно обновляет кеш и синхронизирует в фоне
     */
    _saveAllEpisodesData(allEpisodes) {
        const json = JSON.stringify(allEpisodes);
        
        // Если размер влезает в лимит, сохраняем одним ключом
        if (json.length <= MAX_VALUE_SIZE) {
            const mainKey = this._getKey('tv_episodes');
            this._setToCache(mainKey, allEpisodes);
            
            // Удаляем группы, если они были
            this._removeEpisodesGroups();
            
            return true;
        }
        
        // Если не влезает, разбиваем на группы
        return this._saveEpisodesInGroups(allEpisodes);
    }

    /**
     * Сохранить эпизоды в группах (при превышении лимита) (синхронно обновляет кеш)
     */
    _saveEpisodesInGroups(allEpisodes) {
        const groups = [];
        let currentGroup = {};
        let currentSize = 2; // "{"
        const maxSize = GROUP_SIZE_LIMIT;
        
        // Сортируем сериалы по ID
        const tvIds = Object.keys(allEpisodes).sort((a, b) => parseInt(a) - parseInt(b));
        
        for (const tvId of tvIds) {
            const tvData = { [tvId]: allEpisodes[tvId] };
            const tvJson = JSON.stringify(tvData);
            const size = tvJson.length - 2; // Убираем фигурные скобки
            
            if (currentSize + size + 1 < maxSize) { // +1 для запятой
                currentGroup[tvId] = allEpisodes[tvId];
                currentSize += size + 1;
            } else {
                // Сохраняем текущую группу
                if (Object.keys(currentGroup).length > 0) {
                    const groupKey = this._getKey(`tv_episodes_g${groups.length}`);
                    this._setToCache(groupKey, currentGroup);
                    groups.push(groupKey);
                }
                
                // Начинаем новую группу
                currentGroup = { [tvId]: allEpisodes[tvId] };
                currentSize = size + 2; // "{"
            }
        }
        
        // Сохраняем последнюю группу
        if (Object.keys(currentGroup).length > 0) {
            const groupKey = this._getKey(`tv_episodes_g${groups.length}`);
            this._setToCache(groupKey, currentGroup);
            groups.push(groupKey);
        }
        
        // Удаляем основной ключ, если он был
        const mainKey = this._getKey('tv_episodes');
        this._removeFromCache(mainKey);
        
        // Сохраняем метаданные (опционально)
        const metaKey = this._getKey('tv_episodes_meta');
        this._setToCache(metaKey, {
            totalShows: tvIds.length,
            groups: groups.length
        });
        
        return true;
    }

    /**
     * Удалить группы эпизодов (синхронно обновляет кеш)
     */
    _removeEpisodesGroups() {
        const prefix = this._getKey('tv_episodes_g');
        const metaKey = this._getKey('tv_episodes_meta');
        // Получаем ключи из кеша
        const keys = Object.keys(this._cache).filter(key => key.startsWith(prefix));
        
        keys.forEach(key => {
            this._removeFromCache(key);
        });
        
        this._removeFromCache(metaKey);
    }

    /**
     * Удалить эпизоды сезона
     */
    removeSeasonEpisodes(tvId, seasonNumber) {
        try {
            const allEpisodes = this._getAllEpisodesData();
            const tvData = allEpisodes[String(tvId)];
            
            if (tvData) {
                delete tvData[String(seasonNumber)];
                
                // Если у сериала не осталось сезонов, удаляем сериал
                if (Object.keys(tvData).length === 0) {
                    delete allEpisodes[String(tvId)];
                }
                
                // Сохраняем обновленные данные
                this._saveAllEpisodesData(allEpisodes);
            }
        } catch (error) {
            console.error('Ошибка удаления эпизодов сезона:', error);
        }
    }

    /**
     * Получить все эпизоды сериала
     */
    getAllEpisodes(tvId) {
        try {
            const allEpisodes = this._getAllEpisodesData();
            const tvData = allEpisodes[String(tvId)];
            
            if (!tvData) {
                return {};
            }
            
            const episodes = {};
            
            // Преобразуем все сезоны из компактного формата
            Object.keys(tvData).forEach(season => {
                episodes[season] = this._parseEpisodes(tvData[season]);
            });
            
            return episodes;
        } catch (error) {
            console.error('Ошибка получения всех эпизодов:', error);
            return {};
        }
    }

    // ========== МИГРАЦИЯ ИЗ СТАРОЙ СТРУКТУРЫ ==========

    /**
     * Мигрировать данные из старой структуры (1.3) в новую (1.4)
     */
    migrateFromOldStructure(oldData) {
        console.log('Миграция данных из версии 1.3 в 1.4 (разбитая структура)');
        
        try {
            // Метаданные
            this.setMeta({
                version: '1.4',
                userId: oldData.userId || this._userId
            });
            
            // Фильмы
            if (oldData.movies) {
                if (Array.isArray(oldData.movies.want)) {
                    this.setMoviesList('want', oldData.movies.want);
                }
                if (Array.isArray(oldData.movies.watched)) {
                    this.setMoviesList('watched', oldData.movies.watched);
                }
                if (oldData.movies.reviews) {
                    Object.entries(oldData.movies.reviews).forEach(([movieId, review]) => {
                        this.setMovieReview(movieId, review);
                    });
                }
            }
            
            // Сериалы
            if (oldData.tvShows) {
                if (Array.isArray(oldData.tvShows.want)) {
                    this.setTVShowsList('want', oldData.tvShows.want);
                }
                if (Array.isArray(oldData.tvShows.watching)) {
                    this.setTVShowsList('watching', oldData.tvShows.watching);
                }
                if (Array.isArray(oldData.tvShows.watched)) {
                    this.setTVShowsList('watched', oldData.tvShows.watched);
                }
                if (oldData.tvShows.episodes) {
                    // Группируем эпизоды по сериалам
                    const allEpisodes = {};
                    
                    Object.entries(oldData.tvShows.episodes).forEach(([key, episodes]) => {
                        const [tvId, seasonNumber] = key.split('_');
                        if (tvId && seasonNumber && Array.isArray(episodes)) {
                            if (!allEpisodes[tvId]) {
                                allEpisodes[tvId] = {};
                            }
                            allEpisodes[tvId][seasonNumber] = this._formatEpisodes(episodes);
                        }
                    });
                    
                    // Сохраняем все эпизоды всех сериалов одним ключом
                    if (Object.keys(allEpisodes).length > 0) {
                        this._saveAllEpisodesData(allEpisodes);
                    }
                }
                if (oldData.tvShows.seasonReviews) {
                    Object.entries(oldData.tvShows.seasonReviews).forEach(([key, review]) => {
                        const [tvId, seasonNumber] = key.split('_');
                        if (tvId && seasonNumber) {
                            this.setSeasonReview(tvId, seasonNumber, review);
                        }
                    });
                }
            }
            
            console.log('✅ Миграция завершена успешно');
            return true;
        } catch (error) {
            console.error('❌ Ошибка миграции:', error);
            return false;
        }
    }

    /**
     * Загрузить все данные в старый формат (для обратной совместимости)
     */
    loadToOldFormat() {
        const meta = this.getMeta();
        
        return {
            version: meta.version || '1.4',
            userId: meta.userId || this._userId,
            movies: {
                want: this.getMoviesList('want'),
                watched: this.getMoviesList('watched'),
                reviews: this.getAllMovieReviews()
            },
            tvShows: {
                want: this.getTVShowsList('want'),
                watching: this.getTVShowsList('watching'),
                watched: this.getTVShowsList('watched'),
                episodes: this._loadAllEpisodesToOldFormat(),
                seasonReviews: this.getAllSeasonReviews(),
                reviews: {} // Отзывы на сериалы больше не поддерживаются (только на сезоны)
            }
        };
    }

    /**
     * Загрузить все эпизоды в старый формат
     */
    _loadAllEpisodesToOldFormat() {
        const episodes = {};
        
        // Получаем все эпизоды всех сериалов
        const allEpisodes = this._getAllEpisodesData();
        
        // Преобразуем в старый формат: { "tvId_season": [episodes] }
        Object.entries(allEpisodes).forEach(([tvId, tvData]) => {
            Object.entries(tvData).forEach(([season, seasonData]) => {
                const oldKey = `${tvId}_${season}`;
                episodes[oldKey] = this._parseEpisodes(seasonData);
            });
        });
        
        return episodes;
    }

    /**
     * Очистить все данные пользователя (синхронно обновляет кеш)
     */
    clearAll() {
        // Получаем ключи из кеша
        const prefix = this._prefix;
        const keys = Object.keys(this._cache).filter(key => key.startsWith(prefix));
        
        keys.forEach(key => {
            this._removeFromCache(key);
        });
        
        return keys.length;
    }
}

export { StorageAdapter };

