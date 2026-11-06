import { API_CONFIG } from '../config/api.js';

class TMDBService {
    static async makeRequest(endpoint, params = {}) {
        try {
            const url = new URL(`${API_CONFIG.BASE_URL}${endpoint}`);
            
            // Добавляем базовые параметры
            url.searchParams.append('api_key', API_CONFIG.API_KEY);
            url.searchParams.append('language', API_CONFIG.LANGUAGE);
            
            // Добавляем дополнительные параметры
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });

            const options = {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                mode: 'cors'
            };

            const response = await fetch(url.toString(), options);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Получить популярные фильмы
    static async getPopularMovies(page = 1) {
        const data = await this.makeRequest('/movie/popular', { page });
        return { ...data, results: data.results.slice(0, 15) };
    }

    // Получить трендовые фильмы
    static async getTrendingMovies() {
        const data = await this.makeRequest('/trending/movie/day');
        return data.results.slice(0, 15);
    }

    // Получить предстоящие фильмы
    static async getUpcomingMovies() {
        const data = await this.makeRequest('/movie/upcoming');
        return data.results.slice(0, 15);
    }

    // Получить детали фильма
    static async getMovieDetails(movieId) {
        return this.makeRequest(`/movie/${movieId}`);
    }

    // Поиск фильмов
    static async searchMovies(query) {
        return this.makeRequest('/search/movie', { query: encodeURIComponent(query) });
    }

    // Получить актёрский состав фильма
    static async getMovieCredits(movieId) {
        return this.makeRequest(`/movie/${movieId}/credits`);
    }

    // Получить рекомендации для фильма
    static async getMovieRecommendations(movieId) {
        return this.makeRequest(`/movie/${movieId}/recommendations`);
    }

    // Получить полную информацию о фильме (детали + актёры + рекомендации)
    static async getFullMovieInfo(id, type = 'movie') {
        try {
            const [details, credits, recommendations] = await Promise.all([
                type === 'movie' ? this.getMovieDetails(id) : this.getTVDetails(id),
                type === 'movie' ? this.getMovieCredits(id) : this.getTVCredits(id),
                type === 'movie' ? this.getMovieRecommendations(id) : this.getTVRecommendations(id)
            ]);

            let seasons = [];
            if (type === 'tv') {
                seasons = await this.getTVSeasons(id);
            }

            // Для фильмов добавляем режиссёров, для сериалов - создателей
            let crewToAdd = [];
            if (type === 'movie') {
                crewToAdd = credits.crew.filter(person => person.job === 'Director');
            } else if (type === 'tv' && details.created_by) {
                // Для сериалов берём создателей из details.created_by
                crewToAdd = details.created_by.map(creator => ({
                    ...creator,
                    job: 'Creator',
                    media_type: 'tv'
                }));
            }

            const fullCast = [...crewToAdd, ...credits.cast];

            return {
                ...details,
                type,
                seasons,
                credits: {
                    cast: fullCast,
                    crew: credits.crew
                },
                recommendations: recommendations.results
            };
        } catch (error) {
            console.error('Error fetching full info:', error);
            throw error;
        }
    }

    static async searchMulti(query) {
        try {
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/search/multi?api_key=${API_CONFIG.API_KEY}&language=${API_CONFIG.LANGUAGE}&query=${encodeURIComponent(query)}`
            );
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error searching:', error);
            throw error;
        }
    }

    // Получить детали сериала
    static async getTVDetails(id) {
        return this.makeRequest(`/tv/${id}`);
    }

    // Получить актёрский состав сериала
    static async getTVCredits(tvId) {
        return this.makeRequest(`/tv/${tvId}/credits`);
    }

    // Получить рекомендации для сериала
    static async getTVRecommendations(tvId) {
        return this.makeRequest(`/tv/${tvId}/recommendations`);
    }

    static async getTVSeasons(tvId) {
        try {
            const details = await this.getTVDetails(tvId);
            
            const regularSeasons = details.seasons.filter(season => season.season_number > 0);
            
            const seasonsPromises = regularSeasons.map(season => 
                this.makeRequest(`/tv/${tvId}/season/${season.season_number}`)
            );

            return await Promise.all(seasonsPromises);
        } catch (error) {
            console.error('Error fetching TV seasons:', error);
            throw error;
        }
    }

    static async getTrendingTV() {
        const data = await this.makeRequest('/trending/tv/day');
        return data.results.slice(0, 15);
    }

    static async getAnticipatedTV() {
        const data = await this.makeRequest('/tv/on_the_air');
        return data.results;
    }

    static async getPopularTV() {
        const data = await this.makeRequest('/tv/popular');
        return { ...data, results: data.results.slice(0, 15) };
    }

    static async getAiringTodayTV() {
        const data = await this.makeRequest('/tv/airing_today');
        return data.results.slice(0, 15);
    }

    static async getTopRatedTV() {
        const data = await this.makeRequest('/tv/top_rated');
        return data.results.slice(0, 15);
    }

    static async getOnTheAirTV() {
        return this.makeRequest('/tv/on_the_air');
    }

    // Новинки за последние 3 месяца, самые популярные первыми.
    // Для сериалов берём премьеры (first_air_date), новые сезоны старых шоу сюда не попадают
    static async getRecentReleases(type = 'movie') {
        const toDate = (d) =>
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const today = new Date();
        const from = new Date(today);
        from.setMonth(from.getMonth() - 3);

        const dateField = type === 'movie' ? 'primary_release_date' : 'first_air_date';
        const params = {
            [`${dateField}.gte`]: toDate(from),
            [`${dateField}.lte`]: toDate(today),
            sort_by: 'popularity.desc',
            include_adult: false,
            // Порог голосов отсекает малоизвестные релизы с пустыми карточками
            'vote_count.gte': type === 'movie' ? 50 : 10,
        };
        if (type === 'tv') {
            // Без новостей, реалити и ток-шоу: они забивают выдачу по популярности
            params.without_genres = '10763,10764,10767';
        }

        const data = await this.makeRequest(`/discover/${type}`, params);
        return data.results.filter((item) => item.poster_path).slice(0, 15);
    }

    static async getMoviesByGenre(genreId, page = 1) {
        try {
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/discover/movie?api_key=${API_CONFIG.API_KEY}&language=${API_CONFIG.LANGUAGE}&with_genres=${genreId}&page=${page}`
            );
            return await response.json();
        } catch (error) {
            console.error('Error fetching movies by genre:', error);
            throw error;
        }
    }

    static async getTVShowsByGenre(genreId, page = 1) {
        try {
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/discover/tv?api_key=${API_CONFIG.API_KEY}&language=${API_CONFIG.LANGUAGE}&with_genres=${genreId}&page=${page}`
            );
            return await response.json();
        } catch (error) {
            console.error('Error fetching TV shows by genre:', error);
            throw error;
        }
    }

    static GENRE_MAP = {
        'Action': 28,
        'Adventure': 12,
        'Animation': 16,
        'Comedy': 35,
        'Crime': 80,
        'Documentary': 99,
        'Drama': 18,
        'Family': 10751,
        'Fantasy': 14,
        'History': 36,
        'Horror': 27,
        'Music': 10402,
        'Mystery': 9648,
        'Romance': 10749,
        'Science Fiction': 878,
        'TV Movie': 10770,
        'Thriller': 53,
        'War': 10752,
        'Western': 37
    };

    static getGenreId(genreName) {
        return this.GENRE_MAP[genreName] || '';
    }

    static GENRE_EMOJI_MAP = {
        'Action': '💥',
        'Adventure': '🗺️',
        'Animation': '🎨',
        'Comedy': '😂',
        'Crime': '🚔',
        'Documentary': '📹',
        'Drama': '🎭',
        'Family': '👨‍👩‍👧‍👦',
        'Fantasy': '🔮',
        'History': '📜',
        'Horror': '👻',
        'Music': '🎵',
        'Mystery': '🔍',
        'Romance': '❤️',
        'Science Fiction': '🚀',
        'TV Movie': '📺',
        'Thriller': '😱',
        'War': '⚔️',
        'Western': '🤠'
    };

    static getGenreEmoji(genreName) {
        return this.GENRE_EMOJI_MAP[genreName] || '🎬';
    }

    async getPersonDetails(personId) {
        const response = await this._fetch(`/person/${personId}`);
        return response;
    }

    async getPersonCredits(personId) {
        const response = await this._fetch(`/person/${personId}/combined_credits`);
        return response;
    }

    static async getPersonDetails(personId) {
        try {
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/person/${personId}?api_key=${API_CONFIG.API_KEY}&language=${API_CONFIG.LANGUAGE}`
            );
            return await response.json();
        } catch (error) {
            console.error('Error fetching person details:', error);
            throw error;
        }
    }

    static async getPersonCredits(personId) {
        try {
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/person/${personId}/combined_credits?api_key=${API_CONFIG.API_KEY}&language=${API_CONFIG.LANGUAGE}`
            );
            const data = await response.json();
            
            // Разделяем на фильмы и сериалы
            return {
                movie_credits: {
                    cast: data.cast.filter(item => item.media_type === 'movie'),
                    crew: data.crew.filter(item => item.media_type === 'movie')
                },
                tv_credits: {
                    cast: data.cast.filter(item => item.media_type === 'tv'),
                    crew: data.crew.filter(item => item.media_type === 'tv')
                }
            };
        } catch (error) {
            console.error('Error fetching person credits:', error);
            throw error;
        }
    }

    static async getPersonImages(personId) {
        try {
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/person/${personId}/images?api_key=${API_CONFIG.API_KEY}`
            );
            return await response.json();
        } catch (error) {
            console.error('Error fetching person images:', error);
            throw error;
        }
    }

    static async getUpcomingMoviesWithTrailers() {
        try {
            const upcoming = await this.makeRequest('/movie/upcoming');
            const moviesWithTrailers = await Promise.all(
                upcoming.results.slice(0, 10).map(async movie => {
                    const videos = await this.makeRequest(`/movie/${movie.id}/videos`);
                    const trailer = videos.results.find(
                        video => video.type === 'Trailer' && video.site === 'YouTube'
                    );
                    return {
                        ...movie,
                        trailer: trailer || null
                    };
                })
            );
            return moviesWithTrailers.filter(movie => movie.trailer);
        } catch (error) {
            console.error('Error fetching trailers:', error);
            return [];
        }
    }

    static async getUpcomingTVWithTrailers() {
        try {
            const popular = await this.makeRequest('/tv/popular');
            const showsWithTrailers = await Promise.all(
                popular.results.slice(0, 10).map(async show => {
                    const videos = await this.makeRequest(`/tv/${show.id}/videos`);
                    const trailer = videos.results.find(
                        video => video.type === 'Trailer' && video.site === 'YouTube'
                    );
                    return {
                        ...show,
                        title: show.name,
                        trailer: trailer || null
                    };
                })
            );
            return showsWithTrailers.filter(show => show.trailer);
        } catch (error) {
            console.error('Error fetching popular TV trailers:', error);
            return [];
        }
    }

    static async getTrendingTVWithTrailers() {
        try {
            const trending = await this.makeRequest('/trending/tv/day');
            const showsWithTrailers = await Promise.all(
                trending.results.slice(0, 10).map(async show => {
                    const videos = await this.makeRequest(`/tv/${show.id}/videos`);
                    const trailer = videos.results.find(
                        video => video.type === 'Trailer' && video.site === 'YouTube'
                    );
                    return {
                        ...show,
                        title: show.name,
                        trailer: trailer || null
                    };
                })
            );
            return showsWithTrailers.filter(show => show.trailer);
        } catch (error) {
            console.error('Error fetching trending TV trailers:', error);
            return [];
        }
    }

    // Получить видео для фильма или сериала
    static async getVideos(id, type = 'movie') {
        return this.makeRequest(`/${type}/${id}/videos`);
    }

    // Получить персонализированные рекомендации на основе списков пользователя
    static async getPersonalizedRecommendations(wantList = [], watchedList = [], limit = 20) {
        try {
            // Если нет фильмов в списках, возвращаем пустой массив
            if (wantList.length === 0 && watchedList.length === 0) {
                return [];
            }

            // Объединяем ВСЕ списки для создания полного Set ID пользователя
            const allUserItems = [...watchedList, ...wantList];
            
            // Создаем Set всех ID из списков пользователя (включая фильмы и сериалы)
            const allUserIds = new Set(allUserItems.map(item => item.id));

            // Фильтруем только фильмы для получения рекомендаций
            const allMovies = allUserItems.filter(movie => movie.type === 'movie');

            if (allMovies.length === 0) {
                return [];
            }

            // Рандомно выбираем 3 фильма из списков
            const selectedMovies = this._getRandomItems(allMovies, 3);

            // Получаем рекомендации для каждого выбранного фильма
            const recommendationsPromises = selectedMovies.map(movie => 
                this.getMovieRecommendations(movie.id)
                    .then(data => data.results || [])
                    .catch(err => {
                        console.error(`Error fetching recommendations for movie ${movie.id}:`, err);
                        return [];
                    })
            );

            const recommendationsArrays = await Promise.all(recommendationsPromises);

            // Объединяем все рекомендации
            const allRecommendations = recommendationsArrays.flat();

            const seenIds = new Set();
            const uniqueRecommendations = [];

            // Фильтруем дубликаты и фильмы из списков пользователя
            for (const movie of allRecommendations) {
                if (!seenIds.has(movie.id) && !allUserIds.has(movie.id)) {
                    seenIds.add(movie.id);
                    uniqueRecommendations.push(movie);
                }
            }

            // Сортируем по популярности и рейтингу
            uniqueRecommendations.sort((a, b) => {
                const scoreA = (a.vote_average || 0) * (a.popularity || 0);
                const scoreB = (b.vote_average || 0) * (b.popularity || 0);
                return scoreB - scoreA;
            });

            // Если после фильтрации осталось меньше чем limit, пытаемся добавить еще
            if (uniqueRecommendations.length < limit) {
                const additionalMovies = this._getRandomItems(allMovies, 2);
                
                for (const movie of additionalMovies) {
                    if (uniqueRecommendations.length >= limit) break;
                    
                    try {
                        const moreRecs = await this.getMovieRecommendations(movie.id);
                        const filtered = (moreRecs.results || []).filter(m => 
                            !seenIds.has(m.id) && !allUserIds.has(m.id)
                        );
                        
                        for (const rec of filtered) {
                            if (uniqueRecommendations.length >= limit) break;
                            if (!seenIds.has(rec.id)) {
                                seenIds.add(rec.id);
                                uniqueRecommendations.push(rec);
                            }
                        }
                    } catch (err) {
                        console.error('Error fetching additional recommendations:', err);
                    }
                }
            }

            // Возвращаем ограниченное количество
            return uniqueRecommendations.slice(0, limit);
        } catch (error) {
            console.error('Error getting personalized recommendations:', error);
            return [];
        }
    }

    // Получить персонализированные рекомендации сериалов
    static async getPersonalizedTVRecommendations(wantList = [], watchedList = [], watchingList = [], limit = 20) {
        try {
            // Если нет сериалов в списках, возвращаем пустой массив
            if (wantList.length === 0 && watchedList.length === 0 && watchingList.length === 0) {
                return [];
            }

            // Объединяем ВСЕ списки для создания полного Set ID пользователя
            const allUserItems = [...watchedList, ...watchingList, ...wantList];
            
            // Создаем Set всех ID из списков пользователя (включая фильмы и сериалы)
            const allUserIds = new Set(allUserItems.map(item => item.id));

            // Фильтруем только сериалы для получения рекомендаций
            const allShows = allUserItems.filter(show => show.type === 'tv');

            if (allShows.length === 0) {
                return [];
            }

            // Рандомно выбираем 3 сериала из списков
            const selectedShows = this._getRandomItems(allShows, 3);

            // Получаем рекомендации для каждого выбранного сериала
            const recommendationsPromises = selectedShows.map(show => 
                this.getTVRecommendations(show.id)
                    .then(data => data.results || [])
                    .catch(err => {
                        console.error(`Error fetching recommendations for TV show ${show.id}:`, err);
                        return [];
                    })
            );

            const recommendationsArrays = await Promise.all(recommendationsPromises);

            // Объединяем все рекомендации
            const allRecommendations = recommendationsArrays.flat();

            const seenIds = new Set();
            const uniqueRecommendations = [];

            // Фильтруем дубликаты и сериалы из списков пользователя
            for (const show of allRecommendations) {
                if (!seenIds.has(show.id) && !allUserIds.has(show.id)) {
                    seenIds.add(show.id);
                    uniqueRecommendations.push(show);
                }
            }

            // Сортируем по популярности и рейтингу
            uniqueRecommendations.sort((a, b) => {
                const scoreA = (a.vote_average || 0) * (a.popularity || 0);
                const scoreB = (b.vote_average || 0) * (b.popularity || 0);
                return scoreB - scoreA;
            });

            // Если после фильтрации осталось меньше чем limit, пытаемся добавить еще
            if (uniqueRecommendations.length < limit) {
                const additionalShows = this._getRandomItems(allShows, 2);
                
                for (const show of additionalShows) {
                    if (uniqueRecommendations.length >= limit) break;
                    
                    try {
                        const moreRecs = await this.getTVRecommendations(show.id);
                        const filtered = (moreRecs.results || []).filter(s => 
                            !seenIds.has(s.id) && !allUserIds.has(s.id)
                        );
                        
                        for (const rec of filtered) {
                            if (uniqueRecommendations.length >= limit) break;
                            if (!seenIds.has(rec.id)) {
                                seenIds.add(rec.id);
                                uniqueRecommendations.push(rec);
                            }
                        }
                    } catch (err) {
                        console.error('Error fetching additional TV recommendations:', err);
                    }
                }
            }

            // Возвращаем ограниченное количество
            return uniqueRecommendations.slice(0, limit);
        } catch (error) {
            console.error('Error getting personalized TV recommendations:', error);
            return [];
        }
    }

    // Получить словарь жанров { id: name } для фильмов или сериалов
    static async getGenreMap(type = 'movie') {
        this._genreMaps = this._genreMaps || {};
        const key = `${type}_${API_CONFIG.LANGUAGE}`;
        if (!this._genreMaps[key]) {
            this._genreMaps[key] = this.makeRequest(`/genre/${type}/list`)
                .then(data => Object.fromEntries((data.genres || []).map(g => [g.id, g.name])))
                .catch(err => {
                    delete this._genreMaps[key];
                    throw err;
                });
        }
        return this._genreMaps[key];
    }

    // Вспомогательная функция для получения случайных элементов из массива
    static _getRandomItems(array, count) {
        if (array.length <= count) {
            return [...array];
        }
        
        const shuffled = [...array].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }
}

export default TMDBService; 