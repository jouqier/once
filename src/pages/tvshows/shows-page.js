import TMDBService from '../../services/tmdb.js';
import { haptic } from '../../config/telegram.js';
import { userMoviesService } from '../../services/user-movies.js';
import '../../components/media-poster.js';
import '../../components/movie-trailers.js';
import { API_CONFIG } from '../../config/api.js';

export class TVShowsScreen extends HTMLElement {
    constructor() {
        super();
        this._showsProgress = new Map();
        this._progressCache = new Map();
        this.attachShadow({ mode: 'open' });
        this._trendingShows = [];
        this._anticipatedShows = [];
        this._popularShows = [];
        this._upcomingTrailers = [];
        
        // Сохраняем bound функции для правильной очистки слушателей
        this._boundHandlers = {
            seasonReviewSubmitted: this._handleSeasonReviewSubmitted.bind(this),
            episodeStatusChanged: this._handleEpisodeStatusChanged.bind(this)
        };
        
        this.shadowRoot.innerHTML = this._getLoadingTemplate();
    }

    async connectedCallback() {
        // Добавляем слушатели при подключении
        document.addEventListener('season-review-submitted', this._boundHandlers.seasonReviewSubmitted);
        document.addEventListener('episode-status-changed', this._boundHandlers.episodeStatusChanged);
        
        this.loadData().then(() => this.render());
        this._preloadShowProgress();
    }

    disconnectedCallback() {
        // Удаляем слушатели при отключении компонента
        document.removeEventListener('season-review-submitted', this._boundHandlers.seasonReviewSubmitted);
        document.removeEventListener('episode-status-changed', this._boundHandlers.episodeStatusChanged);
    }

    async _handleSeasonReviewSubmitted(event) {
        const tvId = event.detail.tvId;
        // Обновляем прогресс и рейтинг для сериала
        await this._updateShowPoster(tvId);
    }

    async _handleEpisodeStatusChanged(event) {
        const tvId = event.detail.tvId;
        // Обновляем прогресс для сериала
        await this._updateShowPoster(tvId);
    }

    async _updateShowPoster(tvId) {
        // Инвалидируем кеш прогресса
        this._progressCache.delete(tvId);
        
        // Получаем новый прогресс
        const progress = await userMoviesService.getShowProgress(tvId);
        
        // Обновляем постеры во всех секциях
        const allCards = this.shadowRoot.querySelectorAll(`[data-show-id="${tvId}"]`);
        allCards.forEach(card => {
            const poster = card.querySelector('media-poster');
            if (poster) {
                if (progress) {
                    poster.setAttribute('watched-episodes', progress.watchedEpisodes || 0);
                    poster.setAttribute('total-episodes', progress.totalEpisodes || 0);
                    if (progress.rating) {
                        poster.setAttribute('user-rating', progress.rating);
                    } else {
                        poster.removeAttribute('user-rating');
                    }
                }
            }
        });
    }

    async loadData() {
        try {
            // Проверяем наличие данных в localStorage
            const cachedData = localStorage.getItem('tvShowsData');
            if (cachedData) {
                const { trending, anticipated, popular } = JSON.parse(cachedData);
                this._trendingShows = trending;
                this._anticipatedShows = anticipated;
                this._popularShows = popular;
                this._upcomingTrailers = await TMDBService.getTrendingTVWithTrailers();
                return;
            }

            // Если данных нет, загружаем их с сервера
            const [trending, popular, topRated, trailers] = await Promise.all([
                TMDBService.getTrendingTV(),
                TMDBService.getPopularTV(),
                TMDBService.getTopRatedTV(),
                TMDBService.getTrendingTVWithTrailers()
            ]);

            this._trendingShows = trending;
            this._anticipatedShows = popular?.results || [];
            this._popularShows = topRated;
            this._upcomingTrailers = trailers;

            // Сохраняем данные в localStorage
            localStorage.setItem('tvShowsData', JSON.stringify({
                trending: this._trendingShows,
                anticipated: this._anticipatedShows,
                popular: this._popularShows
            }));
        } catch (error) {
            console.error('Error loading TV shows:', error);
        }
    }

    async _preloadShowProgress() {
        const allShows = [...this._trendingShows, ...this._anticipatedShows, ...this._popularShows];
        const showIds = allShows.map(show => show.id);
        
        const progressData = await userMoviesService.getBatchShowProgress(showIds);
        progressData.forEach(progress => {
            this._progressCache.set(progress.showId, progress);
        });
        return progressData;
    }

    async _getShowProgress(show) {
        if (this._progressCache.has(show.id)) {
            return this._progressCache.get(show.id);
        }

        const progress = await userMoviesService.getShowProgress(show.id);
        this._progressCache.set(show.id, progress);
        return progress;
    }

    _getLoadingTemplate() {
        return `
            <style>
                .loading-skeleton {
                    background: linear-gradient(90deg, #2c2c2c 25%, #3c3c3c 50%, #2c2c2c 75%);
                    background-size: 200% 100%;
                    animation: loading 1.5s infinite;
                }
                @keyframes loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            </style>
            <div class="section">
                <!-- Добавьте скелетон-загрузку здесь -->
            </div>
        `;
    }

    async _renderTrendingShows(shows) {
        const showsWithProgress = await Promise.all(shows.map(async show => {
            const progress = await userMoviesService.getShowProgress(show.id);
            
            return `
                <div class="trending-show-card" data-show-id="${show.id}">
                    <media-poster
                        src="${API_CONFIG.IMAGE_BASE_URL}${show.poster_path}"
                        alt="${show.name}"
                        ${progress ? `watched-episodes="${progress.watchedEpisodes}"` : ''}
                        ${progress ? `total-episodes="${progress.totalEpisodes}"` : ''}
                        ${progress?.rating ? `user-rating="${progress.rating}"` : ''}
                        size="large">
                    </media-poster>
                </div>
            `;
        }));

        return showsWithProgress.join('');
    }

    async _renderScrollShowCards(shows) {
        const progressPromises = shows.map(show => this._getShowProgress(show));
        const progresses = await Promise.all(progressPromises);
        
        return shows.map((show, index) => {
            const progress = progresses[index];
            return `
                <div class="scroll-show-card" data-show-id="${show.id}">
                    <media-poster
                        loading="lazy"
                        src="${API_CONFIG.IMAGE_BASE_URL}${show.poster_path}"
                        alt="${show.name}"
                        ${progress ? `watched-episodes="${progress.watchedEpisodes}"` : ''}
                        ${progress ? `total-episodes="${progress.totalEpisodes}"` : ''}
                        ${progress?.rating ? `user-rating="${progress.rating}"` : ''}
                        size="small">
                    </media-poster>
                </div>
            `;
        }).join('');
    }

    async render() {
        this.shadowRoot.innerHTML = `<div>Loading...</div>`;
        
        try {
            const trendingContent = await this._renderTrendingShows(this._trendingShows);
            const anticipatedContent = await this._renderScrollShowCards(this._anticipatedShows);
            const popularContent = await this._renderScrollShowCards(this._popularShows);

            // Рендерим весь контент
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

                    .shows-scroll {
                        display: flex;
                        gap: 8px;
                        overflow-x: auto;
                        padding-bottom: 8px;
                        scrollbar-width: none;
                        -ms-overflow-style: none;
                        padding: 8px 16px;
                    }

                    .shows-scroll::-webkit-scrollbar {
                        display: none;
                    }

                    .trending-show-card {
                        flex: 0 0 auto;
                        width: 228px;
                        aspect-ratio: 2/3;
                        cursor: pointer;
                        transition: transform 0.2s;
                    }

                    .scroll-show-card {
                        flex: 0 0 auto;
                        width: 128px;
                        aspect-ratio: 2/3;
                        cursor: pointer;
                        transition: transform 0.2s;
                    }

                    .trending-show-card:active,
                    .scroll-show-card:active {
                        transform: scale(0.95);
                    }

                    .shows-scroll-container {
                        position: relative;
                        display: flex;
                        padding: 8px 0;
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 8px;
                        align-self: stretch;
                    }

                    .shows-scroll-wrapper {
                        width: 100%;
                        overflow-x: auto;
                        scrollbar-width: none;
                    }

                    .shows-scroll-wrapper::-webkit-scrollbar {
                        display: none;
                    }

                    .shows-scroll-container::before,
                    .shows-scroll-container::after {
                        content: '';
                        position: absolute;
                        top: 0;
                        bottom: 0;
                        width: 16px;
                        pointer-events: none;
                        z-index: 1;
                    }

                    .shows-scroll-container::before {
                        left: 0;
                        background: linear-gradient(to right, var(--md-sys-color-scrim), transparent);
                    }

                    .shows-scroll-container::after {
                        right: 0;
                        background: linear-gradient(to left, var(--md-sys-color-scrim), transparent);
                    }

                    .shows-scroll {
                        display: flex;
                        align-items: flex-start;
                        gap: 8px;
                        flex-wrap: nowrap;
                        padding: 0 16px;
                    }

                    .trending-show-card,
                    .scroll-show-card {
                        cursor: pointer;
                        transition: transform 0.2s;
                    }

                    .trending-show-card:active {
                        transform: scale(0.95);
                    }
                    
                    .trailers-section {
                        padding: 0 16px;
                    }
                </style>

                <movie-trailers></movie-trailers>

                <div class="section">
                    <div class="section-article">TV SHOWS</div>
                    <div class="section-title primary">Trending Now</div>
                    <div class="shows-scroll-container">
                        <div class="shows-scroll-wrapper">
                            <div class="shows-scroll">
                                ${trendingContent}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-article">TV SHOWS</div>
                    <div class="section-title">Most Popular</div>
                    <div class="shows-scroll-container">
                        <div class="shows-scroll-wrapper">
                            <div class="shows-scroll">
                                ${anticipatedContent}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div class="section-article">TV SHOWS</div>
                    <div class="section-title">Top Rated</div>
                    <div class="shows-scroll-container">
                        <div class="shows-scroll-wrapper">
                            <div class="shows-scroll">
                                ${popularContent}
                            </div>
                        </div>
                    </div>
                </div>

            `;

            this._setupEventListeners();

            // Инициализируем компонент с трейлерами
            const trailersComponent = this.shadowRoot.querySelector('movie-trailers');
            trailersComponent.trailers = this._upcomingTrailers;
        } catch (error) {
            console.error('Error rendering shows:', error);
            this.shadowRoot.innerHTML = `<div>Error loading content</div>`;
        }
    }

    _setupEventListeners() {
        this.shadowRoot.querySelectorAll('.trending-show-card, .scroll-show-card').forEach(card => {
            card.addEventListener('click', () => {
                haptic.light();
                const showId = card.dataset.showId;
                this.dispatchEvent(new CustomEvent('movie-selected', {
                    detail: { movieId: showId, type: 'tv' },
                    bubbles: true,
                    composed: true
                }));
            });
        });
    }
}

customElements.define('tv-shows-screen', TVShowsScreen); 