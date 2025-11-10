/**
 * Обертка над TMDBService с кешированием
 * Кеширует только данные из API, НЕ трогает пользовательские данные
 */

import TMDBService from './tmdb.js';
import { cacheStrategy, TTL, CACHE_KEYS } from './cache-strategy.js';

class TMDBCacheService {
    /**
     * Получить trending фильмы с кешированием (в sessionStorage)
     */
    async getTrendingMovies() {
        const cached = cacheStrategy.get(CACHE_KEYS.MOVIES_TRENDING, {
            session: true
        });
        
        if (cached) {
            return cached;
        }

        const data = await TMDBService.getTrendingMovies();
        cacheStrategy.set(CACHE_KEYS.MOVIES_TRENDING, data, { session: true });
        return data;
    }

    /**
     * Получить upcoming фильмы с кешированием (в sessionStorage)
     */
    async getUpcomingMovies() {
        const cached = cacheStrategy.get(CACHE_KEYS.MOVIES_UPCOMING, {
            session: true
        });
        
        if (cached) {
            return cached;
        }

        const data = await TMDBService.getUpcomingMovies();
        cacheStrategy.set(CACHE_KEYS.MOVIES_UPCOMING, data, { session: true });
        return data;
    }

    /**
     * Получить popular фильмы с кешированием (в sessionStorage)
     */
    async getPopularMovies() {
        const cached = cacheStrategy.get(CACHE_KEYS.MOVIES_POPULAR, {
            session: true
        });
        
        if (cached) {
            return cached;
        }

        const data = await TMDBService.getPopularMovies();
        cacheStrategy.set(CACHE_KEYS.MOVIES_POPULAR, data, { session: true });
        return data;
    }

    /**
     * Получить детали фильма с кешированием
     */
    async getMovieDetails(movieId) {
        const cacheKey = CACHE_KEYS.movieDetails(movieId);
        const cached = cacheStrategy.get(cacheKey, {
            persistent: true,
            ttl: TTL.MOVIE_DETAILS
        });
        
        if (cached) {
            return cached;
        }

        const data = await TMDBService.getMovieDetails(movieId);
        cacheStrategy.set(cacheKey, data, { persistent: true });
        return data;
    }

    /**
     * Получить trending сериалы с кешированием (в sessionStorage)
     */
    async getTrendingTV() {
        const cached = cacheStrategy.get(CACHE_KEYS.TV_TRENDING, {
            session: true
        });
        
        if (cached) {
            return cached;
        }

        const data = await TMDBService.getTrendingTV();
        cacheStrategy.set(CACHE_KEYS.TV_TRENDING, data, { session: true });
        return data;
    }

    /**
     * Получить popular сериалы с кешированием (в sessionStorage)
     */
    async getPopularTV() {
        const cached = cacheStrategy.get(CACHE_KEYS.TV_POPULAR, {
            session: true
        });
        
        if (cached) {
            return cached;
        }

        const data = await TMDBService.getPopularTV();
        cacheStrategy.set(CACHE_KEYS.TV_POPULAR, data, { session: true });
        return data;
    }

    /**
     * Получить top rated сериалы с кешированием (в sessionStorage)
     */
    async getTopRatedTV() {
        const cached = cacheStrategy.get(CACHE_KEYS.TV_TOP_RATED, {
            session: true
        });
        
        if (cached) {
            return cached;
        }

        const data = await TMDBService.getTopRatedTV();
        cacheStrategy.set(CACHE_KEYS.TV_TOP_RATED, data, { session: true });
        return data;
    }

    /**
     * Получить детали сериала с кешированием
     */
    async getTVDetails(tvId) {
        const cacheKey = CACHE_KEYS.tvDetails(tvId);
        const cached = cacheStrategy.get(cacheKey, {
            persistent: true,
            ttl: TTL.TV_DETAILS
        });
        
        if (cached) {
            return cached;
        }

        const data = await TMDBService.getTVDetails(tvId);
        cacheStrategy.set(cacheKey, data, { persistent: true });
        return data;
    }

    /**
     * Получить рекомендации фильмов
     * Кешируется в памяти с коротким TTL
     */
    async getPersonalizedRecommendations(wantList, watchedList) {
        // Создаем ключ на основе ID фильмов в списках
        const listIds = [...wantList, ...watchedList]
            .map(m => m.id)
            .sort()
            .join(',');
        const cacheKey = `${CACHE_KEYS.MOVIES_RECOMMENDED}_${listIds}`;
        
        const cached = cacheStrategy.get(cacheKey, {
            persistent: false, // Только в памяти
            ttl: TTL.RECOMMENDATIONS
        });
        
        if (cached) {
            return cached;
        }

        const data = await TMDBService.getPersonalizedRecommendations(wantList, watchedList);
        cacheStrategy.set(cacheKey, data, { persistent: false });
        return data;
    }

    /**
     * Получить рекомендации сериалов
     * Кешируется в памяти с коротким TTL
     */
    async getPersonalizedTVRecommendations(wantList, watchedList, watchingList) {
        // Создаем ключ на основе ID сериалов в списках
        const listIds = [...wantList, ...watchedList, ...watchingList]
            .map(s => s.id)
            .sort()
            .join(',');
        const cacheKey = `${CACHE_KEYS.TV_RECOMMENDED}_${listIds}`;
        
        const cached = cacheStrategy.get(cacheKey, {
            persistent: false, // Только в памяти
            ttl: TTL.RECOMMENDATIONS
        });
        
        if (cached) {
            return cached;
        }

        const data = await TMDBService.getPersonalizedTVRecommendations(wantList, watchedList, watchingList);
        cacheStrategy.set(cacheKey, data, { persistent: false });
        return data;
    }

    /**
     * Инвалидировать кеш рекомендаций
     * Вызывается при изменении списков пользователя
     */
    invalidateRecommendations() {
        cacheStrategy.invalidatePattern('recommended', { persistent: false });
    }

    /**
     * Методы без кеширования (проксируем напрямую)
     */
    
    async searchMulti(query) {
        return TMDBService.searchMulti(query);
    }

    async getFullMovieInfo(id, type) {
        return TMDBService.getFullMovieInfo(id, type);
    }

    async getMovieCredits(movieId) {
        return TMDBService.getMovieCredits(movieId);
    }

    async getMovieRecommendations(movieId) {
        return TMDBService.getMovieRecommendations(movieId);
    }

    async getTVCredits(tvId) {
        return TMDBService.getTVCredits(tvId);
    }

    async getTVRecommendations(tvId) {
        return TMDBService.getTVRecommendations(tvId);
    }

    async getTVSeasons(tvId) {
        return TMDBService.getTVSeasons(tvId);
    }

    async getUpcomingMoviesWithTrailers() {
        return TMDBService.getUpcomingMoviesWithTrailers();
    }

    async getTrendingTVWithTrailers() {
        return TMDBService.getTrendingTVWithTrailers();
    }

    async getMoviesByGenre(genreId, page) {
        return TMDBService.getMoviesByGenre(genreId, page);
    }

    async getTVShowsByGenre(genreId, page) {
        return TMDBService.getTVShowsByGenre(genreId, page);
    }

    async getPersonDetails(personId) {
        return TMDBService.getPersonDetails(personId);
    }

    async getPersonCredits(personId) {
        return TMDBService.getPersonCredits(personId);
    }

    async getPersonImages(personId) {
        return TMDBService.getPersonImages(personId);
    }

    async getVideos(id, type) {
        return TMDBService.getVideos(id, type);
    }

    // Статические свойства
    get GENRE_MAP() {
        return TMDBService.GENRE_MAP;
    }

    get GENRE_EMOJI_MAP() {
        return TMDBService.GENRE_EMOJI_MAP;
    }

    getGenreId(genreName) {
        return TMDBService.getGenreId(genreName);
    }

    getGenreEmoji(genreName) {
        return TMDBService.getGenreEmoji(genreName);
    }

    _getRandomItems(array, count) {
        return TMDBService._getRandomItems(array, count);
    }
}

export default new TMDBCacheService();
