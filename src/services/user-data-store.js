import { dataMigrationService } from './data-migration.js';
import { StorageAdapter } from './storage-adapter.js';
import { cloudStorageMigration } from './cloud-storage-migration.js';

class UserDataStore {
    constructor() {
        // Пытаемся получить сохраненный ID пользователя из sessionStorage
        let userId = sessionStorage.getItem('user_id');
        
        // Если нет сохраненного ID, получаем из Telegram
        if (!userId) {
            userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
            if (userId) {
                // Сохраняем ID в sessionStorage
                sessionStorage.setItem('user_id', userId);
            } else {
                userId = 'guest';
                console.warn('Используется гостевой режим: данные могут быть потеряны при перезагрузке');
            }
        }
        
        this._userId = userId;
        this._version = '1.4'; // Новая версия - разбитая структура для CloudStorage
        this._adapter = new StorageAdapter(userId);
        this._initialized = false;
        
        // Добавляем обработчик обновления данных пользователя
        document.addEventListener('tg-user-data-updated', async () => {
            const newUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
            if (newUserId && newUserId !== this._userId) {
                this._userId = newUserId;
                sessionStorage.setItem('user_id', newUserId);
                this._adapter = new StorageAdapter(newUserId);
                this._initialized = false;
                await this.init();
            }
        });
    }

    /**
     * Инициализировать хранилище (асинхронно)
     * Должен быть вызван перед использованием методов
     */
    async init() {
        if (this._initialized) {
            return;
        }

        try {
            // Инициализируем адаптер (загружает данные в кеш)
            await this._adapter.init();
            
            // Инициализируем хранилище (миграции и проверки)
            await this._initStore();
            
            this._initialized = true;
        } catch (error) {
            console.error('Ошибка инициализации UserDataStore:', error);
            this._initialized = true; // Помечаем как инициализированное, чтобы не блокировать работу
        }
    }

    async _initStore() {
        try {
            // Проверяем, есть ли старые данные (версия 1.3)
            const oldDataKey = `user_data_${this._userId}`;
            const oldData = localStorage.getItem(oldDataKey);
            
            if (oldData) {
                try {
                    const parsedData = JSON.parse(oldData);
                    
                    // Если версия 1.3 или ниже, мигрируем в новую структуру
                    if (parsedData.version && parsedData.version !== '1.4') {
                        console.log('Обнаружены старые данные, мигрируем в новую структуру...');
                        
                        // Применяем миграции до версии 1.3
                        const migratedData = dataMigrationService.migrate(parsedData);
                        
                        // Мигрируем в разбитую структуру (1.4)
                        this._adapter.migrateFromOldStructure(migratedData);
                        
                        // Удаляем старые данные после успешной миграции
                        localStorage.removeItem(oldDataKey);
                        console.log('✅ Миграция в разбитую структуру завершена');
                    } else if (parsedData.version === '1.4') {
                        // Данные уже в новой структуре, но могут быть в старом формате
                        // Проверяем, есть ли данные в новой структуре
                        const meta = this._adapter.getMeta();
                        if (!meta || meta.version !== '1.4') {
                            // Мигрируем из старого формата
                            this._adapter.migrateFromOldStructure(parsedData);
                            localStorage.removeItem(oldDataKey);
                        }
                    }
                } catch (error) {
                    console.error('Ошибка миграции данных:', error);
                }
            }
            
            // Проверяем и мигрируем старые ключи от предыдущей архитектуры
            this._migrateOldKeys();
            
            // Миграция из localStorage в CloudStorage (если доступен)
            try {
                const isMigrated = await cloudStorageMigration.isMigrated(this._userId);
                if (!isMigrated) {
                    console.log('Выполняем миграцию данных в CloudStorage...');
                    await cloudStorageMigration.migrateToCloudStorage(this._userId);
                    // После миграции перезагружаем кеш адаптера
                    await this._adapter.init();
                }
            } catch (error) {
                console.error('Ошибка миграции в CloudStorage:', error);
            }
            
            // Инициализируем метаданные, если их нет
            const meta = this._adapter.getMeta();
            if (!meta || meta.version !== '1.4') {
                this._adapter.setMeta({
                    version: this._version,
                    userId: this._userId
                });
            }
        } catch (error) {
            console.error('Ошибка инициализации хранилища:', error);
        }
    }

    /**
     * Мигрирует старые ключи от предыдущей архитектуры в новую структуру
     */
    _migrateOldKeys() {
        const prefix = `user_${this._userId}_`;
        const keysToMigrate = [];
        const keysToRemove = [];
        
        // Собираем все старые ключи для миграции
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            
            // Обрабатываем ключи пользовательских данных
            if (key.startsWith(prefix)) {
                const suffix = key.replace(prefix, '');
                
                // Старые ключи отзывов на фильмы (movies_review_{id})
                if (suffix.startsWith('movies_review_') && suffix !== 'movies_reviews' && !suffix.startsWith('movies_reviews_g')) {
                    keysToMigrate.push({ key, type: 'movie_review', id: suffix.replace('movies_review_', '') });
                    keysToRemove.push(key);
                }
                
                // Старые ключи отзывов на сериалы (tv_review_{id}, tv_reviews, tv_reviews_g*) - удаляем, так как их больше нет
                if (suffix.startsWith('tv_review_') || suffix === 'tv_reviews' || suffix.startsWith('tv_reviews_g')) {
                    keysToRemove.push(key);
                }
                
                // Старые ключи отзывов на сезоны (tv_season_review_{tvId}_{season})
                if (suffix.startsWith('tv_season_review_') && suffix !== 'tv_season_reviews' && !suffix.startsWith('tv_season_reviews_g')) {
                    const parts = suffix.replace('tv_season_review_', '').split('_');
                    if (parts.length >= 2) {
                        const tvId = parts[0];
                        const seasonNumber = parts.slice(1).join('_');
                        keysToMigrate.push({ key, type: 'season_review', tvId, seasonNumber });
                        keysToRemove.push(key);
                    }
                }
                
                // Старые ключи эпизодов (tv_ep_{tvId} или tv_ep_{tvId}_{season})
                if (suffix.startsWith('tv_ep_') && suffix !== 'tv_episodes' && !suffix.startsWith('tv_episodes_g') && suffix !== 'tv_episodes_meta') {
                    // Это старый формат, нужно мигрировать
                    const epSuffix = suffix.replace('tv_ep_', '');
                    
                    // Если это tv_ep_{tvId}_{season} - старый формат по сезонам
                    if (epSuffix.includes('_') && !epSuffix.startsWith('g') && !epSuffix.includes('_meta')) {
                        const parts = epSuffix.split('_');
                        if (parts.length >= 2 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
                            keysToMigrate.push({ key, type: 'episodes', tvId: parts[0], seasonNumber: parts[1] });
                            keysToRemove.push(key);
                        }
                    } else if (!epSuffix.includes('_g') && !epSuffix.includes('_meta')) {
                        // Это tv_ep_{tvId} - старый формат по сериалам
                        keysToMigrate.push({ key, type: 'episodes_tv', tvId: epSuffix });
                        keysToRemove.push(key);
                    }
                }
            }
            
            // Удаляем старые ключи кеша списков из localStorage (теперь хранятся в sessionStorage)
            // Кеш деталей фильмов/сериалов (cache_movie_${id}, cache_tv_${id}) остается в localStorage
            if (key.startsWith('cache_')) {
                const cacheKey = key.replace('cache_', '');
                
                // Удаляем кеш списков, которые теперь хранятся в sessionStorage
                const listCacheKeys = [
                    'movies_trending',
                    'movies_popular',
                    'movies_upcoming',
                    'tv_trending',
                    'tv_popular',
                    'tv_top_rated'
                ];
                
                if (listCacheKeys.includes(cacheKey)) {
                    keysToRemove.push(key);
                }
            }
        }
        
        // Выполняем миграцию
        if (keysToMigrate.length > 0) {
            console.log(`🔄 Найдено ${keysToMigrate.length} старых ключей для миграции`);
            
            // Группируем по типам для миграции
            const movieReviews = {};
            const seasonReviews = {};
            const episodesByTvId = {};
            
            keysToMigrate.forEach(({ key, type, id, tvId, seasonNumber }) => {
                try {
                    const value = localStorage.getItem(key);
                    if (value) {
                        const data = JSON.parse(value);
                        
                        if (type === 'movie_review') {
                            movieReviews[id] = data;
                        } else if (type === 'season_review') {
                            const reviewKey = `${tvId}_${seasonNumber}`;
                            seasonReviews[reviewKey] = data;
                        } else if (type === 'episodes') {
                            if (!episodesByTvId[tvId]) {
                                episodesByTvId[tvId] = {};
                            }
                            episodesByTvId[tvId][seasonNumber] = data;
                        } else if (type === 'episodes_tv') {
                            // Это уже данные сериала в старом формате
                            if (!episodesByTvId[tvId]) {
                                episodesByTvId[tvId] = {};
                            }
                            // Данные уже в формате {season: episodes[]}
                            Object.entries(data).forEach(([season, episodes]) => {
                                episodesByTvId[tvId][season] = episodes;
                            });
                        }
                    }
                } catch (error) {
                    console.error(`Ошибка чтения ключа ${key}:`, error);
                }
            });
            
            // Сохраняем мигрированные данные
            if (Object.keys(movieReviews).length > 0) {
                Object.entries(movieReviews).forEach(([movieId, review]) => {
                    this._adapter.setMovieReview(movieId, review);
                });
            }
            
            if (Object.keys(seasonReviews).length > 0) {
                Object.entries(seasonReviews).forEach(([reviewKey, review]) => {
                    const [tvId, seasonNumber] = reviewKey.split('_');
                    this._adapter.setSeasonReview(tvId, seasonNumber, review);
                });
            }
            
            if (Object.keys(episodesByTvId).length > 0) {
                // Получаем все существующие эпизоды
                let allEpisodes = {};
                try {
                    // Используем приватный метод через адаптер
                    allEpisodes = this._adapter._getAllEpisodesData();
                } catch (error) {
                    console.warn('Не удалось получить существующие эпизоды:', error);
                }
                
                // Объединяем со старыми данными
                Object.entries(episodesByTvId).forEach(([tvId, tvData]) => {
                    if (!allEpisodes[tvId]) {
                        allEpisodes[tvId] = {};
                    }
                    Object.entries(tvData).forEach(([season, episodes]) => {
                        // Старые ключи tv_ep_* уже в компактном формате v1: сначала разворачиваем, потом пишем в v2
                        try {
                            allEpisodes[tvId][season] = this._adapter._formatEpisodes(this._adapter._parseEpisodes(episodes));
                        } catch (error) {
                            console.warn(`Ошибка форматирования эпизодов ${tvId}_${season}:`, error);
                            // Сохраняем как есть, если форматирование не удалось
                            allEpisodes[tvId][season] = episodes;
                        }
                    });
                });
                
                // Сохраняем все эпизоды
                try {
                    this._adapter._saveAllEpisodesData(allEpisodes);
                } catch (error) {
                    console.error('Ошибка сохранения эпизодов:', error);
                }
            }
            
            console.log('✅ Миграция старых ключей завершена');
        }
        
        // Удаляем старые ключи
        if (keysToRemove.length > 0) {
            console.log(`🗑️ Удаление ${keysToRemove.length} старых ключей`);
            
            // Разделяем ключи пользовательских данных и кеша для логирования
            const userDataKeys = keysToRemove.filter(key => key.startsWith(prefix));
            const cacheKeys = keysToRemove.filter(key => key.startsWith('cache_'));
            
            if (userDataKeys.length > 0) {
                console.log(`   Пользовательские данные: ${userDataKeys.length} ключей`);
            }
            if (cacheKeys.length > 0) {
                console.log(`   Кеш списков: ${cacheKeys.length} ключей (теперь в sessionStorage)`);
            }
            
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });
        }
    }

    // Виртуальный объект _store для обратной совместимости
    get _store() {
        return this._adapter.loadToOldFormat();
    }

    // Оптимизация: сохраняем только ID вместо полных объектов
    _extractMovieId(movie) {
        return typeof movie === 'object' ? movie.id : movie;
    }

    // Методы для работы с фильмами (только want и watched)
    getMovies(type) {
        // Валидация: фильмы не могут быть в watching
        if (type === 'watching') {
            console.warn('Фильмы не могут быть в состоянии watching');
            return [];
        }

        try {
            const list = this._adapter.getMoviesList(type);
            return list.map(item => this._extractMovieId(item));
        } catch (error) {
            console.error(`Ошибка получения списка фильмов ${type}:`, error);
            return [];
        }
    }

    addMovie(type, movie) {
        // Валидация: фильмы не могут быть в watching
        if (type === 'watching') {
            console.error('Фильмы не могут быть в состоянии watching');
            return;
        }

        // Валидация входных данных
        if (!movie || !movie.id) {
            console.error('Попытка добавить некорректный фильм:', movie);
            return;
        }

        // Валидация: только фильмы
        if (movie.media_type === 'tv') {
            console.error('Попытка добавить сериал в список фильмов. Используйте addTVShow()');
            return;
        }

        try {
            const movieId = this._extractMovieId(movie);
            const list = this._adapter.getMoviesList(type);
            
            if (!list.includes(movieId)) {
                list.push(movieId);
                this._adapter.setMoviesList(type, list);
                
                // Отправляем событие об изменении списка
                this._dispatchListChangedEvent(type, 'added', movie);
            }
        } catch (error) {
            console.error(`Ошибка добавления фильма в ${type}:`, error);
            this._handleStorageError(error);
        }
    }

    removeMovie(type, movieId) {
        // Валидация: фильмы не могут быть в watching
        if (type === 'watching') {
            console.warn('Фильмы не могут быть в состоянии watching');
            return;
        }

        try {
            const list = this._adapter.getMoviesList(type);
            const hadMovie = list.includes(movieId);
            
            if (hadMovie) {
                const newList = list.filter(id => id !== movieId);
                this._adapter.setMoviesList(type, newList);
                
                // Отправляем событие об изменении списка
                this._dispatchListChangedEvent(type, 'removed', { id: movieId });
            }
        } catch (error) {
            console.error(`Ошибка удаления фильма из ${type}:`, error);
            this._handleStorageError(error);
        }
    }

    // Методы для работы с сериалами (want, watching, watched)
    getTVShows(type) {
        try {
            const list = this._adapter.getTVShowsList(type);
            return list.map(item => this._extractMovieId(item));
        } catch (error) {
            console.error(`Ошибка получения списка сериалов ${type}:`, error);
            return [];
        }
    }

    addTVShow(type, show) {
        // Валидация входных данных
        if (!show || !show.id) {
            console.error('Попытка добавить некорректный сериал:', show);
            return;
        }

        // Валидация: только сериалы
        if (show.media_type === 'movie') {
            console.error('Попытка добавить фильм в список сериалов. Используйте addMovie()');
            return;
        }

        try {
            const showId = this._extractMovieId(show);
            const list = this._adapter.getTVShowsList(type);
            
            if (!list.includes(showId)) {
                list.push(showId);
                this._adapter.setTVShowsList(type, list);
                
                // Отправляем событие об изменении списка
                this._dispatchListChangedEvent(type, 'added', show);
            }
        } catch (error) {
            console.error(`Ошибка добавления сериала в ${type}:`, error);
            this._handleStorageError(error);
        }
    }

    removeTVShow(type, showId) {
        try {
            const list = this._adapter.getTVShowsList(type);
            const hadShow = list.includes(showId);
            
            if (hadShow) {
                const newList = list.filter(id => id !== showId);
                this._adapter.setTVShowsList(type, newList);
                
                // Отправляем событие об изменении списка
                this._dispatchListChangedEvent(type, 'removed', { id: showId });
            }
        } catch (error) {
            console.error(`Ошибка удаления сериала из ${type}:`, error);
            this._handleStorageError(error);
        }
    }

    _dispatchListChangedEvent(listType, action, movie) {
        const event = new CustomEvent('movie-list-changed', {
            detail: {
                listType,
                action,
                movie,
                timestamp: Date.now()
            },
            bubbles: true,
            composed: true
        });
        document.dispatchEvent(event);
    }

    // Методы для работы с сериалами
    getEpisodeStatus(tvId, seasonNumber, episodeNumber) {
        try {
            const episodes = this._adapter.getSeasonEpisodes(tvId, seasonNumber);
            return Array.isArray(episodes) && episodes.includes(episodeNumber);
        } catch (error) {
            console.error('Ошибка получения статуса эпизода:', error);
            return false;
        }
    }

    setEpisodeStatus(tvId, seasonNumber, episodeNumber, watched) {
        try {
            let episodes = this._adapter.getSeasonEpisodes(tvId, seasonNumber);
            if (!Array.isArray(episodes)) {
                episodes = [];
            }

            if (watched) {
                if (!episodes.includes(episodeNumber)) {
                    episodes.push(episodeNumber);
                }
            } else {
                episodes = episodes.filter(ep => ep !== episodeNumber);
            }

            this._adapter.setSeasonEpisodes(tvId, seasonNumber, episodes);
        } catch (error) {
            console.error('Ошибка установки статуса эпизода:', error);
            this._handleStorageError(error);
        }
    }

    // Методы для работы с отзывами
    getReview(type, id, seasonNumber = null) {
        try {
            if (type === 'tv_season' && seasonNumber !== null) {
                return this._adapter.getSeasonReview(id, seasonNumber);
            }
            // Для фильмов и других типов (tv больше не поддерживается)
            return this._adapter.getMovieReview(id);
        } catch (error) {
            console.error('Ошибка получения отзыва:', error);
            return null;
        }
    }

    saveReview(type, id, review, seasonNumber = null) {
        try {
            if (type === 'tv_season') {
                this._adapter.setSeasonReview(id, seasonNumber, review);
            } else {
                // Для фильмов и других типов (tv больше не поддерживается)
                this._adapter.setMovieReview(id, review);
            }
        } catch (error) {
            console.error('Ошибка сохранения отзыва:', error);
            this._handleStorageError(error);
        }
    }


    // Методы для работы с поиском (хранятся в sessionStorage, не в localStorage)
    addRecentSearch(item) {
        try {
            const key = `recent_searches_${this._userId}`;
            let recent = this._getRecentSearchesFromSession();
            
            // Проверяем, не существует ли уже
            const exists = recent.find(i => i.id === item.id);
            if (!exists) {
                recent.unshift(item);
                recent = recent.slice(0, 10); // Оставляем только последние 10
                
                // Сохраняем в sessionStorage
                sessionStorage.setItem(key, JSON.stringify(recent));
            }
        } catch (error) {
            console.error('Ошибка сохранения недавних поисков:', error);
        }
    }

    getRecentSearches() {
        return this._getRecentSearchesFromSession();
    }

    _getRecentSearchesFromSession() {
        try {
            const key = `recent_searches_${this._userId}`;
            const data = sessionStorage.getItem(key);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Ошибка загрузки недавних поисков:', error);
        }
        return [];
    }

    getAllEpisodes(tvId) {
        try {
            return this._adapter.getAllEpisodes(tvId);
        } catch (error) {
            console.error('Ошибка получения всех эпизодов:', error);
            return {};
        }
    }

    removeReview(type, id, seasonNumber = null) {
        try {
            if (type === 'tv_season') {
                this._adapter.removeSeasonReview(id, seasonNumber);
            } else {
                // Для фильмов и других типов (tv больше не поддерживается)
                this._adapter.removeMovieReview(id);
            }
        } catch (error) {
            console.error('Ошибка удаления отзыва:', error);
            this._handleStorageError(error);
        }
    }

    removeAllSeasonReviews(tvId) {
        try {
            const reviews = this._adapter.getAllSeasonReviews();
            Object.keys(reviews).forEach(key => {
                if (key.startsWith(`${tvId}_`)) {
                    const [showId, seasonNumber] = key.split('_');
                    this._adapter.removeSeasonReview(showId, seasonNumber);
                }
            });
        } catch (error) {
            console.error('Ошибка удаления всех отзывов на сезоны:', error);
            this._handleStorageError(error);
        }
    }

    getSeasonEpisodes(tvId, seasonNumber) {
        try {
            return this._adapter.getSeasonEpisodes(tvId, seasonNumber);
        } catch (error) {
            console.error('Ошибка получения эпизодов сезона:', error);
            return [];
        }
    }

    /**
     * Обработка ошибок хранилища
     */
    _handleStorageError(error) {
        if (error.name === 'QuotaExceededError') {
            const message = 'Хранилище переполнено. Пожалуйста, обновите страницу для оптимизации данных.';
            
            if (window.Telegram?.WebApp?.showAlert) {
                window.Telegram.WebApp.showAlert(message);
            } else {
                alert(message);
            }
            
            document.dispatchEvent(new CustomEvent('storage-quota-exceeded', {
                detail: { error, userId: this._userId }
            }));
        }
    }
}

export const userDataStore = new UserDataStore(); 