import { haptic } from '../config/telegram.js';
import './movie-card-buttons.js';
import './show-card-buttons.js';
import './media-poster.js';
import { API_CONFIG } from '../config/api.js';
import { userMoviesService } from '../services/user-movies.js';
import { shareLinkService } from '../services/share-link.js';
import { i18n } from '../services/i18n.js';
import TMDBService from '../services/tmdb.js';
import './action-sheet.js';

export class MoviePoster extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._movie = null;
        this._createElements();

        // Сохраняем bound функции для правильной очистки слушателей
        this._boundHandlers = {
            reviewSubmitted: this._handleReviewSubmitted.bind(this),
            seasonReviewSubmitted: this._handleSeasonReviewSubmitted.bind(this),
            episodeStatusChanged: this._handleEpisodeStatusChanged.bind(this)
        };
    }

    connectedCallback() {
        // Добавляем слушатели при подключении к DOM
        document.addEventListener('review-submitted', this._boundHandlers.reviewSubmitted);
        document.addEventListener('season-review-submitted', this._boundHandlers.seasonReviewSubmitted);
        document.addEventListener('episode-status-changed', this._boundHandlers.episodeStatusChanged);
    }

    disconnectedCallback() {
        // Удаляем слушатели при отключении компонента
        document.removeEventListener('review-submitted', this._boundHandlers.reviewSubmitted);
        document.removeEventListener('season-review-submitted', this._boundHandlers.seasonReviewSubmitted);
        document.removeEventListener('episode-status-changed', this._boundHandlers.episodeStatusChanged);
    }

    _handleReviewSubmitted(event) {
        // Обновляем постер, если это фильм и ID совпадает
        if (this._movie &&
            this._movie.media_type === 'movie' &&
            event.detail.movieId === this._movie.id) {
            this._updateContent();
        }
    }

    _handleSeasonReviewSubmitted(event) {
        // Обновляем постер, если это сериал и ID совпадает
        if (this._movie &&
            this._movie.media_type === 'tv' &&
            String(event.detail.tvId) === String(this._movie.id)) {
            this._updateContent();
        }
    }

    _handleEpisodeStatusChanged(event) {
        // Обновляем постер, если это сериал и ID совпадает
        if (this._movie &&
            this._movie.media_type === 'tv' &&
            String(event.detail.tvId) === String(this._movie.id)) {
            this._updateContent();
        }
    }

    _createElements() {
        this.shadowRoot.innerHTML = `
            <style>
                .action-container {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    align-self: stretch;
                    border-radius: 40px;
                    position: relative;
                    overflow: hidden;
                }
                
                .action-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: var(--poster-background, lightgray);
                    background-position: center;
                    border-radius: 42px;
                }
                
                .action-container::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0.60) 60%);
                    backdrop-filter: blur(20px);
                }
                
                .image-container {
                    display: flex;
                    padding: 32px 88px 16px 88px;
                    flex-direction: column;
                    align-items: center;
                    align-self: stretch;
                    z-index: 1;
                    position: relative;
                }
                
                .poster {
                    aspect-ratio: 2/3;
                    position: relative;
                }

                .share-button {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.32);
                    border: none;
                    cursor: pointer;
                    z-index: 2;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                    padding: 0;
                }

                .share-button:active {
                    transform: scale(0.95);
                }

                .share-button svg {
                    width: 20px;
                    height: 20px;
                }

                .share-button svg path {
                    stroke: var(--md-sys-color-on-surface);
                }
                
                media-poster {
                    width: 100%;
                    height: 100%;
                    border-radius: 4px;
                    --poster-placeholder-background: transparent;
                }
                
                .actions-container {
                    z-index: 1;
                    width: 100%;
                }

                .play-button {
                    position: absolute;
                    bottom: 8px;
                    right: 8px;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.32);
                    border: none;
                    cursor: pointer;
                    z-index: 2;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }

                .play-button:hover {
                    transform: scale(1.1);
                    background: var(--md-sys-color-primary);
                }

                .play-button svg {
                    width: 24px;
                    height: 24px;
                    fill: var(--md-sys-color-on-primary-container);
                }

                .play-button:hover svg {
                    fill: var(--md-sys-color-on-primary);
                }
            </style>
            
            <div class="action-container">
                <div class="image-container">
                    <button class="share-button" title="Share">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5.83333 9.16667C5.05836 9.16667 4.67087 9.16667 4.35295 9.25185C3.49022 9.48302 2.81635 10.1569 2.58519 11.0196C2.5 11.3375 2.5 11.725 2.5 12.5V13.5C2.5 14.9001 2.5 15.6002 2.77248 16.135C3.01217 16.6054 3.39462 16.9878 3.86502 17.2275C4.3998 17.5 5.09987 17.5 6.5 17.5H13.5C14.9001 17.5 15.6002 17.5 16.135 17.2275C16.6054 16.9878 16.9878 16.6054 17.2275 16.135C17.5 15.6002 17.5 14.9001 17.5 13.5V12.5C17.5 11.725 17.5 11.3375 17.4148 11.0196C17.1836 10.1569 16.5098 9.48302 15.647 9.25185C15.3291 9.16667 14.9416 9.16667 14.1667 9.16667M13.3333 5.83333L10 2.5M10 2.5L6.66667 5.83333M10 2.5V12.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <div class="poster">
                        <media-poster size="large"></media-poster>
                        <button class="play-button" style="display: none">
                            <svg viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="actions-container">
                    <movie-action-buttons style="display: none"></movie-action-buttons>
                    <tv-show-action-buttons style="display: none"></tv-show-action-buttons>
                </div>
            </div>
        `;

        this._mediaPoster = this.shadowRoot.querySelector('media-poster');
        this._actionContainer = this.shadowRoot.querySelector('.action-container');
        this._movieActionButtons = this.shadowRoot.querySelector('movie-action-buttons');
        this._tvShowActionButtons = this.shadowRoot.querySelector('tv-show-action-buttons');
        this._playButton = this.shadowRoot.querySelector('.play-button');
        this._shareButton = this.shadowRoot.querySelector('.share-button');

        // Добавляем обработчик для кнопки "Поделиться"
        this._shareButton.addEventListener('click', () => this._handleShareClick());
    }

    set movie(value) {
        this._movie = value;
        if (this._movie) {
            this._updateContent();
            this._updateActions();
        }
    }

    async _updateContent() {
        if (!this._movie) return;

        if (this._movie.poster_path) {
            const posterUrl = `${API_CONFIG.IMAGE_BASE_URL}${this._movie.poster_path}`;
            this._mediaPoster.setAttribute('src', posterUrl);
            this._mediaPoster.setAttribute('alt', this._movie.title || this._movie.name);

            this._actionContainer.style.setProperty(
                '--poster-background',
                `url(${posterUrl}) lightgray 50% / cover no-repeat`
            );

            try {
                const videos = await TMDBService.getVideos(
                    this._movie.id,
                    this._movie.media_type || 'movie'
                );

                const trailer = videos.results.find(
                    video => video.type === 'Trailer' && video.site === 'YouTube'
                );

                if (trailer) {
                    this._playButton.style.display = 'flex';
                    this._playButton.addEventListener('click', () => {
                        haptic.medium();
                        window.open(`https://www.youtube.com/watch?v=${trailer.key}`, '_blank');
                    });
                }
            } catch (error) {
                console.error('Error loading videos:', error);
            }

            if (this._movie.media_type === 'tv') {
                // Используем getShowProgress для получения актуальных данных о прогрессе
                // Это более надежный способ, который работает с любой структурой данных
                try {
                    const progress = await userMoviesService.getShowProgress(this._movie.id);
                    if (progress && progress.totalEpisodes > 0) {
                        this._mediaPoster.setAttribute('watched-episodes', progress.watchedEpisodes || 0);
                        this._mediaPoster.setAttribute('total-episodes', progress.totalEpisodes);
                    } else {
                        // Если нет данных о прогрессе, пытаемся подсчитать вручную
                        const totalEpisodes = this._movie.seasons
                            ?.filter(season => season.season_number > 0)
                            .reduce((total, season) => {
                                const episodeCount = season.episodes?.length || season.episode_count || 0;
                                return total + episodeCount;
                            }, 0) || 0;

                        let watchedEpisodes = 0;
                        if (this._movie.seasons) {
                            this._movie.seasons.forEach(season => {
                                if (season.season_number > 0) {
                                    const episodeCount = season.episodes?.length || season.episode_count || 0;
                                    for (let i = 1; i <= episodeCount; i++) {
                                        if (userMoviesService.isEpisodeWatched(
                                            this._movie.id,
                                            season.season_number,
                                            i
                                        )) {
                                            watchedEpisodes++;
                                        }
                                    }
                                }
                            });
                        }

                        if (totalEpisodes > 0) {
                            this._mediaPoster.setAttribute('watched-episodes', watchedEpisodes);
                            this._mediaPoster.setAttribute('total-episodes', totalEpisodes);
                        } else {
                            this._mediaPoster.removeAttribute('watched-episodes');
                            this._mediaPoster.removeAttribute('total-episodes');
                        }
                    }
                } catch (error) {
                    console.error('Error getting show progress:', error);
                    // В случае ошибки убираем атрибуты
                    this._mediaPoster.removeAttribute('watched-episodes');
                    this._mediaPoster.removeAttribute('total-episodes');
                }
                // Убираем user-rating для сериалов, чтобы не показывать бейдж рейтинга
                this._mediaPoster.removeAttribute('user-rating');
            } else {
                const movieState = userMoviesService.getMovieState(this._movie.id);
                if (movieState === 'watched') {
                    const review = userMoviesService.getReview('movie', this._movie.id);
                    if (review?.rating) {
                        this._mediaPoster.setAttribute('user-rating', review.rating);
                    }
                }
            }
        }
    }

    _updateActions() {
        if (this._movie.media_type === 'tv') {
            this._movieActionButtons.style.display = 'none';
            this._tvShowActionButtons.style.display = 'flex';
            this._tvShowActionButtons.tvShow = this._movie;
        } else {
            this._tvShowActionButtons.style.display = 'none';
            this._movieActionButtons.style.display = 'flex';
            this._movieActionButtons.movie = this._movie;
        }
    }

    _handleShareClick() {
        if (!this._movie) return;
        haptic.light();

        const menu = document.createElement('context-menu');
        menu.options = [
            { label: i18n.t('shareWithPreview'), action: 'share-preview' },
            { label: i18n.t('shareToTelegram'), action: 'share-telegram' },
            { label: i18n.t('copyLink'), action: 'copy-link' }
        ];

        menu.addEventListener('menu-action', async (e) => {
            const mediaType = this._movie.media_type || 'movie';
            const title = this._movie.title || this._movie.name;
            const posterUrl = this._movie.poster_path 
                ? `${API_CONFIG.IMAGE_BASE_URL}${this._movie.poster_path}`
                : '';
            const description = this._movie.overview 
                ? this._movie.overview.substring(0, 200) + '...'
                : '';

            if (e.detail.action === 'share-preview') {
                shareLinkService.shareToTelegramWithPreview(
                    this._movie.id, 
                    mediaType, 
                    title, 
                    posterUrl,
                    description
                );
            } else if (e.detail.action === 'share-telegram') {
                shareLinkService.shareToTelegram(this._movie.id, mediaType, title);
            } else if (e.detail.action === 'copy-link') {
                await shareLinkService.copyToClipboard(this._movie.id, mediaType);
            }
        });

        document.body.appendChild(menu);
    }
}

customElements.define('movie-poster', MoviePoster);