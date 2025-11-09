import { userDataStore } from './user-data-store.js';
import TMDBService from './tmdb.js';

export class UserMoviesService {
    constructor() {
        this._store = userDataStore;
    }

    // Методы для фильмов (только want и watched)
    getMovieState(movieId) {
        const wantList = this._store.getMovies('want');
        const watchedList = this._store.getMovies('watched');

        if (watchedList.includes(movieId)) {
            return 'watched';
        }
        if (wantList.includes(movieId)) {
            return 'want';
        }
        return 'none';
    }

    addToWant(movie) {
        // Убеждаемся что это фильм
        if (!movie.media_type) movie.media_type = 'movie';
        this._store.addMovie('want', movie);
    }

    addToWatched(movie) {
        // Убеждаемся что это фильм
        if (!movie.media_type) movie.media_type = 'movie';
        this._store.addMovie('watched', movie);
    }

    removeFromWant(movieId) {
        this._store.removeMovie('want', movieId);
    }

    removeFromWatched(movieId) {
        this._store.removeMovie('watched', movieId);
    }

    // Методы для сериалов (want, watching, watched)
    getTVShowState(showId) {
        const wantList = this._store.getTVShows('want');
        const watchingList = this._store.getTVShows('watching');
        const watchedList = this._store.getTVShows('watched');

        if (watchedList.includes(showId)) {
            return 'watched';
        }
        if (watchingList.includes(showId)) {
            return 'watching';
        }
        if (wantList.includes(showId)) {
            return 'want';
        }
        return 'none';
    }

    addTVShowToWant(show) {
        // Убеждаемся что это сериал
        if (!show.media_type) show.media_type = 'tv';
        this._store.addTVShow('want', show);
    }

    addTVShowToWatching(show) {
        // Убеждаемся что это сериал
        if (!show.media_type) show.media_type = 'tv';
        this._store.addTVShow('watching', show);
    }

    addTVShowToWatched(show) {
        // Убеждаемся что это сериал
        if (!show.media_type) show.media_type = 'tv';
        this._store.addTVShow('watched', show);
    }

    removeTVShowFromWant(showId) {
        this._store.removeTVShow('want', showId);
    }

    removeTVShowFromWatching(showId) {
        this._store.removeTVShow('watching', showId);
    }

    removeTVShowFromWatched(showId) {
        this._store.removeTVShow('watched', showId);
    }

    isEpisodeWatched(tvId, seasonNumber, episodeNumber) {
        return this._store.getEpisodeStatus(tvId, seasonNumber, episodeNumber);
    }

    markEpisodeAsWatched(tvId, seasonNumber, episodeNumber) {
        this._store.setEpisodeStatus(tvId, seasonNumber, episodeNumber, true);
    }

    markEpisodeAsUnwatched(tvId, seasonNumber, episodeNumber) {
        this._store.setEpisodeStatus(tvId, seasonNumber, episodeNumber, false);
    }

    getSeasonReview(tvId, seasonNumber) {
        return this._store.getReview('tv_season', tvId, seasonNumber);
    }

    saveSeasonReview(tvId, seasonNumber, review) {
        this._store.saveReview('tv_season', tvId, review, seasonNumber);
    }

    getReview(type, id, seasonNumber = null) {
        return this._store.getReview(type, id, seasonNumber);
    }

    isSeasonFullyWatched(tvId, seasonNumber, totalEpisodes) {
        const watchedEpisodes = this._store.getSeasonEpisodes(tvId, seasonNumber);
        return watchedEpisodes.length === totalEpisodes;
    }

    // Получение списков фильмов (возвращают только ID)
    getWantList() {
        return this._store.getMovies('want');
    }

    getWatchedList() {
        return this._store.getMovies('watched');
    }

    // Получение списков сериалов (возвращают только ID)
    getTVShowWantList() {
        return this._store.getTVShows('want');
    }

    getTVShowWatchingList() {
        return this._store.getTVShows('watching');
    }

    getTVShowWatchedList() {
        return this._store.getTVShows('watched');
    }

    // Получение полных данных фильмов по ID (для рекомендаций)
    async getMoviesWithDetails(type) {
        const ids = this._store.getMovies(type);
        if (ids.length === 0) return [];
        
        const movies = await Promise.all(
            ids.map(id => TMDBService.getMovieDetails(id).catch(() => null))
        );
        return movies.filter(m => m !== null).map(m => ({ ...m, media_type: 'movie', type: 'movie' }));
    }

    // Получение полных данных сериалов по ID (для рекомендаций)
    async getTVShowsWithDetails(type) {
        const ids = this._store.getTVShows(type);
        if (ids.length === 0) return [];
        
        const shows = await Promise.all(
            ids.map(id => TMDBService.getTVDetails(id).catch(() => null))
        );
        return shows.filter(s => s !== null).map(s => ({ ...s, media_type: 'tv', type: 'tv' }));
    }

    // Получение всех фильмов с деталями (для рекомендаций)
    async getAllMoviesWithDetails() {
        const [want, watched] = await Promise.all([
            this.getMoviesWithDetails('want'),
            this.getMoviesWithDetails('watched')
        ]);
        return [...want, ...watched];
    }

    // Получение всех сериалов с деталями (для рекомендаций)
    async getAllTVShowsWithDetails() {
        const [want, watching, watched] = await Promise.all([
            this.getTVShowsWithDetails('want'),
            this.getTVShowsWithDetails('watching'),
            this.getTVShowsWithDetails('watched')
        ]);
        return [...want, ...watching, ...watched];
    }

    hasAnyWatchedEpisodes(tvId) {
        const allEpisodes = this._store.getAllEpisodes(tvId);
        return Object.values(allEpisodes).some(episodes => episodes.length > 0);
    }

    removeReview(type, id, seasonNumber = null) {
        this._store.removeReview(type, id, seasonNumber);
    }

    removeSeasonReview(tvId, seasonNumber) {
        this._store.removeReview('tv_season', tvId, seasonNumber);
    }

    removeAllSeasonReviews(tvId) {
        this._store.removeAllSeasonReviews(tvId);
    }

    markSeasonAsWatched(tvId, seasonNumber, totalEpisodes) {
        for (let i = 1; i <= totalEpisodes; i++) {
            this.markEpisodeAsWatched(tvId, seasonNumber, i);
        }
    }

    markSeasonAsUnwatched(tvId, seasonNumber) {
        const watchedEpisodes = this._store.getSeasonEpisodes(tvId, seasonNumber);
        
        watchedEpisodes.forEach(episodeNumber => {
            this._store.setEpisodeStatus(tvId, seasonNumber, episodeNumber, false);
        });
    }

    saveReview(type, id, review, seasonNumber = null) {
        this._store.saveReview(type, id, review, seasonNumber);
    }

    async getShowProgress(tvId) {
        try {
            const details = await TMDBService.getTVDetails(tvId);
            if (!details || !details.seasons) return null;

            // Считаем общее количество эпизодов во всех сезонах
            const totalEpisodes = details.seasons.reduce((total, season) => {
                if (season.season_number === 0) return total;
                return total + season.episode_count;
            }, 0);

            // Получаем количество просмотренных эпизодов
            const allEpisodes = this._store.getAllEpisodes(tvId);
            let watchedCount = 0;

            if (allEpisodes) {
                Object.entries(allEpisodes).forEach(([seasonNumber, episodes]) => {
                    if (seasonNumber === '0') return;
                    episodes.forEach(episodeNumber => {
                        if (this.isEpisodeWatched(tvId, parseInt(seasonNumber), episodeNumber)) {
                            watchedCount++;
                        }
                    });
                });
            }

            return {
                watchedEpisodes: watchedCount,
                totalEpisodes: totalEpisodes
            };
        } catch (error) {
            console.error('Error getting show progress:', error);
            return null;
        }
    }

    async getBatchShowProgress(showIds) {
        try {
            // Получаем детали всех сериалов параллельно
            const detailsPromises = showIds.map(id => TMDBService.getTVDetails(id));
            const showDetails = await Promise.all(detailsPromises);

            // Обрабатываем каждый сериал
            return showDetails.map((details, index) => {
                if (!details || !details.seasons) return null;

                const tvId = showIds[index];

                // Считаем общее количество эпизодов
                const totalEpisodes = details.seasons.reduce((total, season) => {
                    if (season.season_number === 0) return total;
                    return total + season.episode_count;
                }, 0);

                // Получаем просмотренные эпизоды
                const allEpisodes = this._store.getAllEpisodes(tvId);
                let watchedCount = 0;

                if (allEpisodes) {
                    Object.entries(allEpisodes).forEach(([seasonNumber, episodes]) => {
                        if (seasonNumber === '0') return;
                        episodes.forEach(episodeNumber => {
                            if (this.isEpisodeWatched(tvId, parseInt(seasonNumber), episodeNumber)) {
                                watchedCount++;
                            }
                        });
                    });
                }

                return {
                    showId: tvId,
                    watchedEpisodes: watchedCount,
                    totalEpisodes: totalEpisodes
                };
            });
        } catch (error) {
            console.error('Error getting batch show progress:', error);
            return [];
        }
    }
}

export const userMoviesService = new UserMoviesService(); 