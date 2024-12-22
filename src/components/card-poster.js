import { haptic } from '../config/telegram.js';
import './movie-card-buttons.js';
import './show-card-buttons.js';
import './media-poster.js';
import { API_CONFIG } from '../config/api.js';
import { userMoviesService } from '../services/user-movies.js';
import TMDBService from '../services/tmdb.js';

export class MoviePoster extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._movie = null;
        this._createElements();
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
                }
                
                .poster {
                    aspect-ratio: 2/3;
                    position: relative;
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
                const totalEpisodes = this._movie.seasons
                    .filter(season => season.season_number > 0)
                    .reduce((total, season) => total + (season.episode_count || 0), 0);
                
                let watchedEpisodes = 0;
                this._movie.seasons.forEach(season => {
                    if (season.season_number > 0) {
                        for (let i = 1; i <= season.episode_count; i++) {
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
                
                if (totalEpisodes > 0) {
                    this._mediaPoster.setAttribute('watched-episodes', watchedEpisodes);
                    this._mediaPoster.setAttribute('total-episodes', totalEpisodes);
                }
                
                const seasonReviews = this._movie.seasons
                    .filter(season => season.season_number > 0)
                    .map(season => userMoviesService.getSeasonReview(this._movie.id, season.season_number))
                    .filter(Boolean);
                
                if (seasonReviews.length > 0) {
                    const lastReview = seasonReviews[seasonReviews.length - 1];
                    this._mediaPoster.setAttribute('user-rating', lastReview.rating);
                }
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
}

customElements.define('movie-poster', MoviePoster);