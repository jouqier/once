import TMDBService from '../../services/tmdb.js';
import { haptic } from '../../config/telegram.js';
import { userMoviesService } from '../../services/user-movies.js';
import { i18n } from '../../services/i18n.js';
import '../../components/media-poster.js';
import '../../components/movie-trailers.js';
import { API_CONFIG } from '../../config/api.js';

export class MoviesScreen extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._trendingMovies = [];
        this._upcomingMovies = [];
        this._popularMovies = [];
        this._upcomingTrailers = [];
        this._recommendedMovies = [];
        this._dataLoaded = false;
        
        // Сохраняем bound функции для правильной очистки слушателей
        this._boundHandlers = {
            reviewSubmitted: this._handleReviewSubmitted.bind(this)
        };
    }

    async connectedCallback() {
        console.log('MoviesScreen connecting...');
        // Добавляем слушатели при подключении
        document.addEventListener('review-submitted', this._boundHandlers.reviewSubmitted);
        
        try {
            if (!this._dataLoaded) {
                await this.loadData();
                this._dataLoaded = true;
            }
            this.render();
        } catch (error) {
            console.error(i18n.t('errorInMoviesScreen'), error);
        }
    }

    disconnectedCallback() {
        // Удаляем слушатели при отключении компонента
        document.removeEventListener('review-submitted', this._boundHandlers.reviewSubmitted);
    }

    _handleReviewSubmitted(event) {
        const movieId = event.detail.movieId;
        const review = event.detail.review;
        
        // Обновляем постеры в списках
        this._updatePosterRating(movieId, review?.rating);
    }

    _updatePosterRating(movieId, rating) {
        // Обновляем постеры во всех секциях
        const allCards = this.shadowRoot.querySelectorAll(`[data-movie-id="${movieId}"]`);
        allCards.forEach(card => {
            const poster = card.querySelector('media-poster');
            if (poster) {
                if (rating) {
                    poster.setAttribute('user-rating', rating);
                } else {
                    poster.removeAttribute('user-rating');
                }
            }
        });
    }

    async loadData() {
        try {
            // Получаем списки пользователя для рекомендаций
            const wantList = userMoviesService.getWantList();
            const watchedList = userMoviesService.getWatchedList();

            console.log('Movies user lists:', { 
                want: wantList.length, 
                watched: watchedList.length 
            });

            const cachedData = MoviesScreen._cache;
            
            if (cachedData) {
                console.log('Using cached movies data, recommended count:', cachedData.recommended?.length || 0);
                this._trendingMovies = cachedData.trending;
                this._upcomingMovies = cachedData.upcoming;
                this._popularMovies = cachedData.popular;
                this._upcomingTrailers = cachedData.upcomingTrailers;
                this._recommendedMovies = cachedData.recommended || [];
                
                // Если в кеше нет рекомендаций, но есть списки пользователя - загружаем рекомендации
                if ((!cachedData.recommended || cachedData.recommended.length === 0) && 
                    (wantList.length > 0 || watchedList.length > 0)) {
                    console.log('Cache missing recommendations, fetching...');
                    const recommended = await TMDBService.getPersonalizedRecommendations(wantList, watchedList);
                    const recommendedWithRatings = recommended.map(movie => ({
                        ...movie,
                        userRating: userMoviesService.getReview('movie', movie.id)?.rating
                    }));
                    this._recommendedMovies = recommendedWithRatings;
                    console.log('Fetched movie recommendations:', recommendedWithRatings.length);
                    
                    // Обновляем кеш
                    MoviesScreen._cache.recommended = recommendedWithRatings;
                }
                return;
            }

            const [trending, upcoming, popular, trailers, recommended] = await Promise.all([
                TMDBService.getTrendingMovies(),
                TMDBService.getUpcomingMovies(),
                TMDBService.getPopularMovies(),
                TMDBService.getUpcomingMoviesWithTrailers(),
                TMDBService.getPersonalizedRecommendations(wantList, watchedList)
            ]);

            console.log('Loaded fresh movies data, recommended count:', recommended.length);

            const moviesWithRatings = {
                trending: trending.map(movie => ({
                    ...movie,
                    userRating: userMoviesService.getReview('movie', movie.id)?.rating
                })),
                upcoming: upcoming.map(movie => ({
                    ...movie,
                    userRating: userMoviesService.getReview('movie', movie.id)?.rating
                })),
                popular: popular?.results.map(movie => ({
                    ...movie,
                    userRating: userMoviesService.getReview('movie', movie.id)?.rating
                })) || [],
                recommended: recommended.map(movie => ({
                    ...movie,
                    userRating: userMoviesService.getReview('movie', movie.id)?.rating
                }))
            };
            
            MoviesScreen._cache = {
                trending: moviesWithRatings.trending,
                upcoming: moviesWithRatings.upcoming,
                popular: moviesWithRatings.popular,
                upcomingTrailers: trailers,
                recommended: moviesWithRatings.recommended,
                timestamp: Date.now()
            };
            
            this._trendingMovies = moviesWithRatings.trending;
            this._upcomingMovies = moviesWithRatings.upcoming;
            this._popularMovies = moviesWithRatings.popular;
            this._upcomingTrailers = trailers;
            this._recommendedMovies = moviesWithRatings.recommended;
        } catch (error) {
            console.error('Error loading movies:', error);
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    padding-top: 16px;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 16px;                    
                }

                .section {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    align-self: stretch;
                }

                .section-article {
                    display: flex;
                    padding: 8px 16px 0px 16px;
                    flex-direction: column;
                    justify-content: center;
                    align-self: stretch;                
                    color: var(--md-sys-color-outline);
                    font-size: 12px;
                    font-style: normal;
                    font-weight: 600;
                    line-height: 16px;
                }

                .section-title {
                    display: flex;
                    padding: 0px 16px 8px 16px;
                    flex-direction: column;
                    justify-content: center;
                    align-self: stretch;
                    color: var(--md-sys-color-on-surface);
                    font-size: 24px;
                    font-weight: 600;
                    line-height: 32px;
                }

                .primary {
                    font-size: 32px;
                    line-height: 40px;
                }                

                /* Общие стили для скроллируемых контейнеров */
                .movies-scroll {
                    display: flex;
                    gap: 8px;
                    overflow-x: auto;
                    padding-bottom: 8px;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    padding: 8px 16px;
                }

                .movies-scroll::-webkit-scrollbar {
                    display: none;
                }

                /* Стили для трендовых фильмов */
                .trending-movie-card {
                    flex: 0 0 auto;
                    width: 228px;
                    aspect-ratio: 2/3;
                    cursor: pointer;
                    transition: transform 0.2s;
                }

                .scroll-movie-card {
                    flex: 0 0 auto;
                    width: 128px;
                    aspect-ratio: 2/3;
                    cursor: pointer;
                    transition: transform 0.2s;
                }

                .trending-movie-card:active,
                .scroll-movie-card:active {
                    transform: scale(0.95);
                }

                .movies-scroll-container {
                    position: relative;
                    display: flex;
                    padding: 8px 0;
                    flex-direction: column;
                    align-items: flex-start;
                    align-self: stretch;
                }

                .movies-scroll-wrapper {
                    width: 100%;
                    overflow-x: auto;
                    scrollbar-width: none;
                }

                .movies-scroll-wrapper::-webkit-scrollbar {
                    display: none;
                }

                .movies-scroll-container::before,
                .movies-scroll-container::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 16px;
                    pointer-events: none;
                    z-index: 1;
                }

                .movies-scroll-container::before {
                    left: 0;
                    background: linear-gradient(to right, var(--md-sys-color-scrim), transparent);
                }

                .movies-scroll-container::after {
                    right: 0;
                    background: linear-gradient(to left, var(--md-sys-color-scrim), transparent);
                }

                .movies-scroll {
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                    flex-wrap: nowrap;
                    padding: 0 16px;
                }

                .trending-movie-card,
                .scroll-movie-card {
                    cursor: pointer;
                    transition: transform 0.2s;
                }

                .trending-movie-card:active {
                    transform: scale(0.95);
                }

                .trailers-section {
                    padding: 0 16px;
                }
            </style>

            <movie-trailers></movie-trailers>

            <div class="section" data-section="trending">
                <div class="section-article">${i18n.t('moviesLabel')}</div>
                <div class="section-title primary">${i18n.t('trendingNow')}</div>
                <div class="movies-scroll-container">
                    <div class="movies-scroll-wrapper">
                        <div class="movies-scroll">
                            ${this._renderTrendingMovies(this._trendingMovies)}
                        </div>
                    </div>
                </div>
            </div>

            ${this._recommendedMovies.length > 0 ? `
                <div class="section" data-section="recommended">
                    <div class="section-article">${i18n.t('moviesLabel')}</div>
                    <div class="section-title">${i18n.t('forYou')}</div>
                    <div class="movies-scroll-container">
                        <div class="movies-scroll-wrapper">
                            <div class="movies-scroll">
                                ${this._renderScrollMovieCards(this._recommendedMovies)}
                            </div>
                        </div>
                    </div>
                </div>
            ` : ''}

            <div class="section" data-section="upcoming">
                <div class="section-article">${i18n.t('moviesLabel')}</div>
                <div class="section-title">${i18n.t('upcoming')}</div>
                <div class="movies-scroll-container">
                    <div class="movies-scroll-wrapper">
                        <div class="movies-scroll">
                            ${this._renderScrollMovieCards(this._upcomingMovies)}
                        </div>
                    </div>
                </div>
            </div>

            <div class="section" data-section="popular">
                <div class="section-article">${i18n.t('moviesLabel')}</div>
                <div class="section-title">${i18n.t('mostPopular')}</div>
                <div class="movies-scroll-container">
                    <div class="movies-scroll-wrapper">
                        <div class="movies-scroll">
                            ${this._renderScrollMovieCards(this._popularMovies)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this._setupEventListeners();

        const trailersComponent = this.shadowRoot.querySelector('movie-trailers');
        trailersComponent.trailers = this._upcomingTrailers;
    }

    _renderTrendingMovies(movies) {
        return movies.map(movie => {
            const userReview = userMoviesService.getReview('movie', movie.id);
            const userRating = userReview?.rating;

            return `
                <div class="trending-movie-card" data-movie-id="${movie.id}">
                    <media-poster
                        src="${API_CONFIG.IMAGE_BASE_URL}${movie.poster_path}"
                        alt="${movie.title}"
                        ${userRating ? `user-rating="${userRating}"` : ''}>
                    </media-poster>
                </div>
            `;
        }).join('');
    }

    _renderScrollMovieCards(movies) {
        return movies.map(movie => {
            const userReview = userMoviesService.getReview('movie', movie.id);
            const userRating = userReview?.rating;

            return `
                <div class="scroll-movie-card" data-movie-id="${movie.id}">
                    <media-poster
                        src="${API_CONFIG.IMAGE_BASE_URL}${movie.poster_path}"
                        alt="${movie.title}"
                        ${userRating ? `user-rating="${userRating}"` : ''}
                        size="small">
                    </media-poster>
                </div>
            `;
        }).join('');
    }

    _setupEventListeners() {
        this.shadowRoot.querySelectorAll('.trending-movie-card, .scroll-movie-card').forEach(card => {
            card.addEventListener('click', () => {
                haptic.light();
                const movieId = card.dataset.movieId;
                this.dispatchEvent(new CustomEvent('movie-selected', {
                    detail: { movieId, type: 'movie' },
                    bubbles: true,
                    composed: true
                }));
            });
        });
    }

}

MoviesScreen._cache = null;

customElements.define('movies-screen', MoviesScreen);

// Добавляем глобальную функцию для отладки
if (typeof window !== 'undefined') {
    window.clearMoviesCache = () => {
        MoviesScreen._cache = null;
        console.log('✓ Movies cache cleared! Reload the page.');
    };
} 