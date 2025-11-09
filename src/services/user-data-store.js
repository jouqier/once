import { dataMigrationService } from './data-migration.js';

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
        this._version = '1.3'; // Обновлена версия - оптимизация хранения (только ID)
        this._store = this._initStore();
        
        // Добавляем обработчик обновления данных пользователя
        document.addEventListener('tg-user-data-updated', () => {
            const newUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
            if (newUserId && newUserId !== this._userId) {
                this._userId = newUserId;
                sessionStorage.setItem('user_id', newUserId);
                this._store = this._initStore();
            }
        });
    }

    _initStore() {
        try {
            const savedData = localStorage.getItem(`user_data_${this._userId}`);
            if (!savedData) {
                console.log('Создание нового хранилища для пользователя:', this._userId);
                return this._createInitialStore();
            }

            const parsedData = JSON.parse(savedData);
            
            // Используем сервис миграции для обработки данных
            const migratedData = dataMigrationService.migrate(parsedData);
            
            // Если данные были мигрированы, сохраняем их
            if (migratedData.version !== parsedData.version) {
                console.log('Данные мигрированы, сохраняем...');
                this._saveStore(migratedData);
            }

            return migratedData;
        } catch (error) {
            console.error('Ошибка инициализации хранилища:', error);
            console.error('Создаем новое хранилище из-за ошибки');
            return this._createInitialStore();
        }
    }

    _createInitialStore() {
        return {
            version: this._version,
            userId: this._userId,
            movies: {
                want: [],      // Только ID фильмов
                watched: [],   // Только ID фильмов
                reviews: {}
            },
            tvShows: {
                want: [],      // Только ID сериалов
                watching: [],  // Только ID сериалов
                watched: [],   // Только ID сериалов
                episodes: {},
                seasonReviews: {},
                reviews: {}
            },
            search: {
                recent: []
            },
            activity: []
        };
    }

    // Оптимизация: сохраняем только ID вместо полных объектов
    _extractMovieId(movie) {
        return typeof movie === 'object' ? movie.id : movie;
    }

    // Старый метод миграции больше не используется
    // Миграция теперь выполняется через dataMigrationService

    _saveStore(data) {
        try {
            const jsonData = JSON.stringify(data);
            const sizeKB = (jsonData.length / 1024).toFixed(2);
            
            localStorage.setItem(`user_data_${this._userId}`, jsonData);
            
            // Логируем размер данных для мониторинга
            if (sizeKB > 1000) {
                console.warn(`⚠️ Размер данных: ${sizeKB} KB (приближается к лимиту)`);
            }
        } catch (error) {
            console.error('Ошибка сохранения данных:', error);
            
            if (error.name === 'QuotaExceededError') {
                // Показываем пользователю понятное сообщение
                const message = 'Хранилище переполнено. Пожалуйста, обновите страницу для оптимизации данных.';
                
                // Пытаемся показать через Telegram
                if (window.Telegram?.WebApp?.showAlert) {
                    window.Telegram.WebApp.showAlert(message);
                } else {
                    alert(message);
                }
                
                // Отправляем событие для обработки в UI
                document.dispatchEvent(new CustomEvent('storage-quota-exceeded', {
                    detail: { error, userId: this._userId }
                }));
            }
            
            throw error;
        }
    }

    // Методы для работы с фильмами (только want и watched)
    getMovies(type) {
        // Валидация: фильмы не могут быть в watching
        if (type === 'watching') {
            console.warn('Фильмы не могут быть в состоянии watching');
            return [];
        }

        // Валидация структуры
        if (!this._store.movies || !Array.isArray(this._store.movies[type])) {
            console.warn(`Некорректная структура movies.${type}, инициализация...`);
            if (!this._store.movies) this._store.movies = {};
            this._store.movies[type] = [];
            this._saveStore(this._store);
        }
        
        // Нормализуем данные: если хранятся объекты, извлекаем ID
        const list = this._store.movies[type] || [];
        return list.map(item => this._extractMovieId(item));
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

        // Валидация структуры
        if (!this._store.movies || !Array.isArray(this._store.movies[type])) {
            if (!this._store.movies) this._store.movies = {};
            this._store.movies[type] = [];
        }

        // Сохраняем только ID для экономии места
        const movieId = this._extractMovieId(movie);
        if (!this._store.movies[type].includes(movieId)) {
            this._store.movies[type].push(movieId);
            this._saveStore(this._store);
            
            // Отправляем событие об изменении списка
            this._dispatchListChangedEvent(type, 'added', movie);
        }
    }

    removeMovie(type, movieId) {
        // Валидация: фильмы не могут быть в watching
        if (type === 'watching') {
            console.warn('Фильмы не могут быть в состоянии watching');
            return;
        }

        // Валидация структуры
        if (!this._store.movies || !Array.isArray(this._store.movies[type])) {
            console.warn(`Некорректная структура movies.${type} при удалении`);
            return;
        }

        const hadMovie = this._store.movies[type].includes(movieId);
        this._store.movies[type] = this._store.movies[type].filter(id => id !== movieId);
        this._saveStore(this._store);
        
        // Отправляем событие об изменении списка
        if (hadMovie) {
            this._dispatchListChangedEvent(type, 'removed', { id: movieId });
        }
    }

    // Методы для работы с сериалами (want, watching, watched)
    getTVShows(type) {
        // Валидация структуры
        if (!this._store.tvShows || !Array.isArray(this._store.tvShows[type])) {
            console.warn(`Некорректная структура tvShows.${type}, инициализация...`);
            if (!this._store.tvShows) this._store.tvShows = {};
            this._store.tvShows[type] = [];
            this._saveStore(this._store);
        }
        
        // Нормализуем данные: если хранятся объекты, извлекаем ID
        const list = this._store.tvShows[type] || [];
        return list.map(item => this._extractMovieId(item));
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

        // Валидация структуры
        if (!this._store.tvShows || !Array.isArray(this._store.tvShows[type])) {
            if (!this._store.tvShows) this._store.tvShows = {};
            this._store.tvShows[type] = [];
        }

        // Сохраняем только ID для экономии места
        const showId = this._extractMovieId(show);
        if (!this._store.tvShows[type].includes(showId)) {
            this._store.tvShows[type].push(showId);
            this._saveStore(this._store);
            
            // Отправляем событие об изменении списка
            this._dispatchListChangedEvent(type, 'added', show);
        }
    }

    removeTVShow(type, showId) {
        // Валидация структуры
        if (!this._store.tvShows || !Array.isArray(this._store.tvShows[type])) {
            console.warn(`Некорректная структура tvShows.${type} при удалении`);
            return;
        }

        const hadShow = this._store.tvShows[type].includes(showId);
        this._store.tvShows[type] = this._store.tvShows[type].filter(id => id !== showId);
        this._saveStore(this._store);
        
        // Отправляем событие об изменении списка
        if (hadShow) {
            this._dispatchListChangedEvent(type, 'removed', { id: showId });
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
        // Валидация структуры
        if (!this._store.tvShows || !this._store.tvShows.episodes) {
            console.warn('Некорректная структура tvShows.episodes');
            if (!this._store.tvShows) this._store.tvShows = {};
            this._store.tvShows.episodes = {};
            this._saveStore(this._store);
            return false;
        }

        const key = `${tvId}_${seasonNumber}`;
        if (!this._store.tvShows.episodes[key]) {
            return false;
        }

        // Проверяем что это массив
        if (!Array.isArray(this._store.tvShows.episodes[key])) {
            console.warn(`Некорректный формат episodes[${key}], исправление...`);
            this._store.tvShows.episodes[key] = [];
            this._saveStore(this._store);
            return false;
        }

        return this._store.tvShows.episodes[key].includes(episodeNumber);
    }

    setEpisodeStatus(tvId, seasonNumber, episodeNumber, watched) {
        // Валидация структуры
        if (!this._store.tvShows || !this._store.tvShows.episodes) {
            if (!this._store.tvShows) this._store.tvShows = {};
            this._store.tvShows.episodes = {};
        }

        const key = `${tvId}_${seasonNumber}`;
        
        if (!this._store.tvShows.episodes[key]) {
            this._store.tvShows.episodes[key] = [];
        }

        // Проверяем что это массив
        if (!Array.isArray(this._store.tvShows.episodes[key])) {
            console.warn(`Некорректный формат episodes[${key}], исправление...`);
            this._store.tvShows.episodes[key] = [];
        }

        if (watched) {
            if (!this._store.tvShows.episodes[key].includes(episodeNumber)) {
                this._store.tvShows.episodes[key].push(episodeNumber);
            }
        } else {
            this._store.tvShows.episodes[key] = this._store.tvShows.episodes[key]
                .filter(ep => ep !== episodeNumber);
        }

        this._saveStore(this._store);
    }

    // Методы для работы с отзывами
    getReview(type, id, seasonNumber = null) {
        // Проверяем существование необходимых объектов
        if (!this._store || !this._store.tvShows || !this._store.movies) {
            console.warn('Store structure is not properly initialized');
            return null;
        }

        try {
            if (type === 'tv_season' && seasonNumber !== null) {
                const key = `${id}_${seasonNumber}`;
                return this._store.tvShows.seasonReviews?.[key] || null;
            } else if (type === 'tv') {
                return this._store.tvShows.reviews?.[id] || null;
            }
            return this._store.movies.reviews?.[id] || null;
        } catch (error) {
            console.error('Error getting review:', error);
            return null;
        }
    }

    saveReview(type, id, review, seasonNumber = null) {
        // Инициализируем структуру хранилища, если её нет
        if (!this._store.movies) {
            this._store.movies = { reviews: {} };
        }
        if (!this._store.tvShows) {
            this._store.tvShows = { reviews: {}, seasonReviews: {} };
        }
        if (!this._store.movies.reviews) {
            this._store.movies.reviews = {};
        }
        if (!this._store.tvShows.reviews) {
            this._store.tvShows.reviews = {};
        }
        if (!this._store.tvShows.seasonReviews) {
            this._store.tvShows.seasonReviews = {};
        }

        try {
            if (type === 'tv_season') {
                const key = `${id}_${seasonNumber}`;
                this._store.tvShows.seasonReviews[key] = review;
            } else if (type === 'tv') {
                this._store.tvShows.reviews[id] = review;
            } else {
                this._store.movies.reviews[id] = review;
            }
            this._saveStore(this._store);
        } catch (error) {
            console.error('Error saving review:', error);
        }
    }

    // Методы для работы с активностью
    addActivity(activity) {
        this._store.activity.unshift(activity);
        this._store.activity = this._store.activity.slice(0, 50);
        this._saveStore(this._store);
    }

    getActivities() {
        return this._store.activity;
    }

    // Методы для работы с поиском
    addRecentSearch(item) {
        const exists = this._store.search.recent.find(i => i.id === item.id);
        if (!exists) {
            this._store.search.recent.unshift(item);
            this._store.search.recent = this._store.search.recent.slice(0, 10);
            this._saveStore(this._store);
        }
    }

    getRecentSearches() {
        return this._store.search.recent;
    }

    getAllEpisodes(tvId) {
        const episodes = {};
        Object.keys(this._store.tvShows.episodes).forEach(key => {
            if (key.startsWith(`${tvId}_`)) {
                const seasonNumber = key.split('_')[1];
                episodes[seasonNumber] = this._store.tvShows.episodes[key];
            }
        });
        return episodes;
    }

    removeReview(type, id, seasonNumber = null) {
        if (type === 'tv_season') {
            const key = `${id}_${seasonNumber}`;
            delete this._store.tvShows.seasonReviews[key];
        } else if (type === 'tv') {
            delete this._store.tvShows.reviews[id];
        } else {
            delete this._store.movies.reviews[id];
        }
        this._saveStore(this._store);
    }

    removeAllSeasonReviews(tvId) {
        Object.keys(this._store.tvShows.seasonReviews).forEach(key => {
            if (key.startsWith(`${tvId}_`)) {
                delete this._store.tvShows.seasonReviews[key];
            }
        });
        this._saveStore(this._store);
    }

    getSeasonEpisodes(tvId, seasonNumber) {
        const key = `${tvId}_${seasonNumber}`;
        return this._store.tvShows.episodes[key] || [];
    }
}

export const userDataStore = new UserDataStore(); 