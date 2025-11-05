import { TG, haptic } from '../../config/telegram.js';
import { userMoviesService } from '../../services/user-movies.js';
import TMDBService from '../../services/tmdb.js';
import '../../components/media-poster.js';
import { navigationManager } from '../../config/navigation.js';

export class GenreScreen extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._items = [];
        this._genreName = '';
        this._genreId = null;
        this._mediaType = 'movie';
        this._loading = true;
        
        // Сохраняем bound функции для правильной очистки слушателей
        this._boundHandlers = {
            reviewSubmitted: this._handleReviewSubmitted.bind(this),
            seasonReviewSubmitted: this._handleSeasonReviewSubmitted.bind(this),
            episodeStatusChanged: this._handleEpisodeStatusChanged.bind(this)
        };
    }

    async connectedCallback() {
        // Добавляем слушатели при подключении
        document.addEventListener('review-submitted', this._boundHandlers.reviewSubmitted);
        document.addEventListener('season-review-submitted', this._boundHandlers.seasonReviewSubmitted);
        document.addEventListener('episode-status-changed', this._boundHandlers.episodeStatusChanged);
        
        this._genreId = new URLSearchParams(window.location.search).get('id');
        this._genreName = new URLSearchParams(window.location.search).get('name');
        this._mediaType = new URLSearchParams(window.location.search).get('type') || 'movie';
        
        this.render();
        await this.loadData();
        this._loading = false;
        this.render();
        this._setupEventListeners();
    }

    disconnectedCallback() {
        // Удаляем слушатели при отключении компонента
        document.removeEventListener('review-submitted', this._boundHandlers.reviewSubmitted);
        document.removeEventListener('season-review-submitted', this._boundHandlers.seasonReviewSubmitted);
        document.removeEventListener('episode-status-changed', this._boundHandlers.episodeStatusChanged);
    }

    async _handleReviewSubmitted(event) {
        const movieId = event.detail.movieId;
        const review = event.detail.review;
        
        // Обновляем постер, если это фильмы и постер есть на странице
        if (this._mediaType === 'movie') {
            await this._updatePosterRating(movieId, review?.rating);
        }
    }

    async _handleSeasonReviewSubmitted(event) {
        const tvId = event.detail.tvId;
        
        // Обновляем постер, если это сериалы и постер есть на странице
        if (this._mediaType === 'tv') {
            await this._updateShowPoster(tvId);
        }
    }

    async _handleEpisodeStatusChanged(event) {
        const tvId = event.detail.tvId;
        
        // Обновляем постер, если это сериалы и постер есть на странице
        if (this._mediaType === 'tv') {
            await this._updateShowPoster(tvId);
        }
    }

    async _updatePosterRating(movieId, rating) {
        // Обновляем постеры
        const allCards = this.shadowRoot.querySelectorAll(`[data-id="${movieId}"]`);
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

    async _updateShowPoster(tvId) {
        // Получаем новый прогресс
        const progress = await userMoviesService.getShowProgress(tvId);
        
        // Обновляем постеры
        const allCards = this.shadowRoot.querySelectorAll(`[data-id="${tvId}"]`);
        allCards.forEach(card => {
            const poster = card.querySelector('media-poster');
            if (poster) {
                if (progress) {
                    poster.setAttribute('watched-episodes', progress.watchedEpisodes || 0);
                    poster.setAttribute('total-episodes', progress.totalEpisodes || 0);
                    // Для сериалов не устанавливаем user-rating
                    poster.removeAttribute('user-rating');
                }
            }
        });
    }

    async loadData() {
        try {
            console.log('Loading data for genre:', {
                genreId: this._genreId,
                genreName: this._genreName,
                mediaType: this._mediaType
            });
            
            // Загружаем первые 3 страницы для получения минимум 42 результатов
            const pages = await Promise.all([
                this._mediaType === 'tv' 
                    ? await TMDBService.getTVShowsByGenre(this._genreId, 1)
                    : await TMDBService.getMoviesByGenre(this._genreId, 1),
                this._mediaType === 'tv'
                    ? await TMDBService.getTVShowsByGenre(this._genreId, 2)
                    : await TMDBService.getMoviesByGenre(this._genreId, 2),
                this._mediaType === 'tv'
                    ? await TMDBService.getTVShowsByGenre(this._genreId, 3)
                    : await TMDBService.getMoviesByGenre(this._genreId, 3)
            ]);

            // Объединяем результаты всех страниц
            const allResults = pages.reduce((acc, page) => {
                return acc.concat(page.results);
            }, []);
            
            const params = new URLSearchParams(window.location.search);
            const currentId = params.get('from');
            const currentIdNum = currentId ? parseInt(currentId, 10) : null;

            // Фильтруем результаты, исключая текущий фильм/сериал
            const filteredResults = currentIdNum && !isNaN(currentIdNum)
                ? allResults.filter(item => item.id !== currentIdNum)
                : allResults;

            // Берем только первые 42 элемента
            this._items = filteredResults.slice(0, 42);
        } catch (error) {
            console.error('Error loading genre data:', error);
            this._items = [];
        }
    }

    async render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .content {
                    display: flex;
                    padding: 8px 0px;
                    flex-direction: column;
                    align-items: flex-start;
                    align-self: stretch;
                    border-radius: 36px;
                    //background: var(--md-sys-color-surface-container-lowest);
                    overflow: hidden;
                }  

                .tab-content {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    flex: 1;
                    overflow-y: auto;
                    min-height: 0;
                }
                
                .tabs-container {
                    position: relative;
                    display: flex;
                    padding: 8px 0;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                    align-self: stretch;
                    height: 40px;
                    touch-action: none;
                }
                
                .tabs-list-wrapper {
                    width: 100%;
                    height: 100%;
                    overflow-x: auto;
                    overflow-y: hidden;
                    scrollbar-width: none;
                    -webkit-overflow-scrolling: touch;
                    touch-action: pan-x;
                }
                
                .tabs-list-wrapper::-webkit-scrollbar {
                    display: none;
                }
                
                .tabs-container::before,
                .tabs-container::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 16px;
                    pointer-events: none;
                    z-index: 1;
                }
                
                .tabs-container::before {
                    left: 0;
                    background: linear-gradient(to right, var(--md-sys-color-surface-container-lowest), transparent);
                }
                
                .tabs-container::after {
                    right: 0;
                    background: linear-gradient(to left, var(--md-sys-color-surface-container-lowest), transparent);
                }
                
                .tabs-list {
                    display: flex;
                    align-items: flex-start;
                    flex-wrap: nowrap;
                    padding: 0 16px;
                    touch-action: pan-x;
                    pointer-events: auto;
                }
                
                .tab {
                    pointer-events: auto;
                    touch-action: manipulation;
                    --md-filled-tonal-button-container-color: rgba(255, 255, 255, 0.0);
                    --md-filled-tonal-button-label-text-color: var(--md-sys-color-on-surface);
                    --md-filled-tonal-button-hover-label-text-color: var(--md-sys-color-on-surface);
                    --md-filled-tonal-button-pressed-label-text-color: var(--md-sys-color-on-surface);
                    --md-filled-tonal-button-container-shape: 1000px;
                    --md-filled-tonal-button-label-text-font: 600 14px sans-serif;
                    --md-filled-tonal-button-container-height: 40px;
                    --md-filled-tonal-button-focus-label-text-color: var(--md-sys-color-on-surface);
                    padding-inline-start: 16px;
                    padding-inline-end: 16px;
                    flex: 0 0 auto;
                }
                
                .tab.active {
                    --md-filled-tonal-button-container-color: var(--md-sys-color-surface-container-low);
                }

                .tab-count {
                    margin-left: 4px;
                    color: var(--md-sys-color-outline);
                }                
                
                .header {
                    display: flex;
                    padding: 32px;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                    align-self: stretch;
                }

                .icon-genre {
                    color: var(--md-sys-color-on-surface);
                    text-align: center;
                    font-size: 80px;
                    line-height: 80px;
                }

                .genre-title {
                    color: var(--md-sys-color-on-surface);
                    text-align: center;
                    font-size: 22px;
                    font-weight: 600;
                    line-height: 28px;
                }

                .media-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 8px;
                    padding: 8px 16px;
                }

                .media-item {
                    aspect-ratio: 2/3;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                    will-change: transform;
                }

                .media-item:active {
                    transform: scale(0.95);
                }

                @media (hover: hover) {
                    .media-item:hover {
                        transform: scale(1.02);
                    }
                }
            </style>
            <div class="header">
                <div class="icon-genre">${TMDBService.getGenreEmoji(this._genreName)}</div>
                <div class="genre-title">${this._genreName}</div>
            </div>
            <div class="content"> 
                <div class="media-grid">
                    Loading...
                </div>
            </div>
        `;

        // Рендерим контент
        const renderedItems = await Promise.all(this._items.map(async (item) => {
            let userRating = null;
            let progress = null;

            if (this._mediaType === 'tv') {
                // Для сериалов получаем только прогресс, рейтинг не показываем
                progress = await userMoviesService.getShowProgress(item.id);
            } else {
                const userReview = userMoviesService.getReview('movie', item.id);
                userRating = userReview?.rating;
            }

            return `
                <div class="media-item" 
                     data-id="${item.id}"
                     data-type="${this._mediaType}">
                    <media-poster
                        src="https://image.tmdb.org/t/p/w342${item.poster_path}"
                        alt="${item.title || item.name}"
                        ${progress ? `
                            watched-episodes="${progress.watchedEpisodes}"
                            total-episodes="${progress.totalEpisodes}"
                        ` : ''}
                        ${userRating ? `user-rating="${userRating}"` : ''}
                    ></media-poster>
                </div>
            `;
        }));

        const mediaGrid = this.shadowRoot.querySelector('.media-grid');
        if (mediaGrid) {
            mediaGrid.innerHTML = renderedItems.join('');
        }

        this._setupEventListeners();
    }

    _setupEventListeners() {
        const mediaItems = this.shadowRoot.querySelectorAll('.media-item');
        mediaItems.forEach(item => {
            item.addEventListener('click', () => {
                haptic.light();
                const id = item.dataset.id;
                const type = item.dataset.type;
                
                this.dispatchEvent(new CustomEvent('movie-selected', {
                    detail: { 
                        movieId: id, 
                        type: type 
                    },
                    bubbles: true,
                    composed: true
                }));
            });
        });
    }
}

customElements.define('genre-screen', GenreScreen); 