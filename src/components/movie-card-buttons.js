import { haptic } from '../config/telegram.js';
import { userMoviesService } from '../services/user-movies.js';
import { i18n } from '../services/i18n.js';
import './action-sheet.js';
import './review-dialog.js';
import '@material/web/button/filled-tonal-button.js';

/**
 * Компонент кнопок управления фильмом
 * Состояния: none, want, watched
 */
export class MovieActionButtons extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._movie = null;
        this._state = 'none';
        this._activityScreen = document.createElement('activity-screen');
        this._render();
    }

    connectedCallback() {
        this._setupEventListeners();
    }

    set movie(value) {
        this._movie = value;
        if (this._movie) {
            this._state = userMoviesService.getMovieState(this._movie.id);
            this._updateUI();
        }
    }

    _render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    padding: 16px;
                    gap: 8px;
                }
                
                md-filled-tonal-button {
                    flex: 1;
                    --md-filled-tonal-button-container-shape: 1000px;
                    --md-filled-tonal-button-label-text-font: 600 14px sans-serif;
                    height: 48px;
                    transition: all 0.3s ease;
                }

                .want-button {
                    --md-sys-color-secondary-container: rgba(255, 255, 255, 0.32);
                    --md-sys-color-on-secondary-container: var(--md-sys-color-on-surface);
                }

                .want-button.active {
                    --md-sys-color-secondary-container: transparent;
                    border: 2px solid var(--md-sys-color-on-surface);
                }

                .watched-button {
                    --md-sys-color-secondary-container: rgba(255, 255, 255, 0.32);
                    --md-sys-color-on-secondary-container: var(--md-sys-color-on-primary-container);
                }

                .watched-button.active {
                    --md-sys-color-secondary-container: var(--md-sys-color-primary-container);
                }

                .hidden {
                    display: none;
                }
            </style>
            
            <md-filled-tonal-button class="want-button">
                ${i18n.t('want')}
            </md-filled-tonal-button>
            <md-filled-tonal-button class="watched-button">
                ${i18n.t('watched')}
            </md-filled-tonal-button>
        `;
    }

    _setupEventListeners() {
        const wantBtn = this.shadowRoot.querySelector('.want-button');
        const watchedBtn = this.shadowRoot.querySelector('.watched-button');

        wantBtn.addEventListener('click', () => this._handleWantClick());
        watchedBtn.addEventListener('click', () => this._handleWatchedClick());
    }

    _handleWantClick() {
        if (!this._movie) return;
        haptic.light();

        if (this._state === 'want') {
            this._showWantMenu();
        } else {
            // Добавить в Want
            userMoviesService.addToWant(this._movie);
            this._activityScreen.addActivity(this._movie, 'want');
            this._state = 'want';
            this._updateUI();
        }
    }

    _handleWatchedClick() {
        if (!this._movie) return;
        haptic.light();

        if (this._state === 'watched') {
            this._showWatchedMenu();
        } else {
            // Открыть диалог оценки
            this._openReviewDialog();
        }
    }

    _showWantMenu() {
        const menu = document.createElement('context-menu');
        menu.options = [
            { label: i18n.t('moveToWatched'), action: 'move-to-watched' },
            { label: i18n.t('removeFromWant'), action: 'remove-from-want' }
        ];

        menu.addEventListener('menu-action', (e) => {
            if (e.detail.action === 'move-to-watched') {
                userMoviesService.removeFromWant(this._movie.id);
                this._activityScreen.addActivity(this._movie, 'removed-from-want');
                this._openReviewDialog();
            } else if (e.detail.action === 'remove-from-want') {
                userMoviesService.removeFromWant(this._movie.id);
                this._activityScreen.addActivity(this._movie, 'removed-from-want');
                this._state = 'none';
                this._updateUI();
            }
        });

        document.body.appendChild(menu);
    }

    _showWatchedMenu() {
        const menu = document.createElement('context-menu');
        menu.options = [
            { label: i18n.t('moveToWant'), action: 'move-to-want' },
            { label: i18n.t('removeFromWatched'), action: 'remove-from-watched' },
            { label: i18n.t('editReview'), action: 'edit-review' }
        ];

        menu.addEventListener('menu-action', (e) => {
            if (e.detail.action === 'move-to-want') {
                userMoviesService.removeFromWatched(this._movie.id);
                userMoviesService.removeReview('movie', this._movie.id);
                userMoviesService.addToWant(this._movie);
                this._activityScreen.addActivity(this._movie, 'removed-from-watched');
                this._activityScreen.addActivity(this._movie, 'want');
                this._state = 'want';
                this._updateUI();
                this._dispatchEvent('review-removed', { movieId: this._movie.id, type: 'movie' });
            } else if (e.detail.action === 'remove-from-watched') {
                userMoviesService.removeFromWatched(this._movie.id);
                userMoviesService.removeReview('movie', this._movie.id);
                this._activityScreen.addActivity(this._movie, 'removed-from-watched');
                this._state = 'none';
                this._updateUI();
                this._dispatchEvent('review-removed', { movieId: this._movie.id, type: 'movie' });
            } else if (e.detail.action === 'edit-review') {
                this._openReviewDialog(true);
            }
        });

        document.body.appendChild(menu);
    }

    _openReviewDialog(isEdit = false) {
        const dialog = document.createElement('review-dialog');
        dialog.movie = this._movie;
        dialog.isEdit = isEdit;

        if (isEdit) {
            const review = userMoviesService.getReview('movie', this._movie.id);
            if (review) {
                dialog.review = review;
            }
        }

        const handleReviewSubmitted = (e) => {
            if (e.detail.movieId === this._movie.id) {
                userMoviesService.addToWatched(this._movie);
                this._activityScreen.addActivity(this._movie, 'watched');
                this._activityScreen.addActivity(this._movie, isEdit ? 'edited-review' : 'review');
                this._state = 'watched';
                this._updateUI();
                document.removeEventListener('review-submitted', handleReviewSubmitted);
            }
        };

        document.addEventListener('review-submitted', handleReviewSubmitted);
        document.body.appendChild(dialog);
    }

    _updateUI() {
        const wantBtn = this.shadowRoot.querySelector('.want-button');
        const watchedBtn = this.shadowRoot.querySelector('.watched-button');

        // Сброс классов
        wantBtn.classList.remove('active', 'hidden');
        watchedBtn.classList.remove('active', 'hidden');

        // Обновление в зависимости от состояния
        if (this._state === 'want') {
            wantBtn.classList.add('active');
            wantBtn.textContent = `✓ ${i18n.t('want')}`;
            watchedBtn.classList.add('hidden');
        } else if (this._state === 'watched') {
            wantBtn.classList.add('hidden');
            watchedBtn.classList.add('active');
            watchedBtn.textContent = `✓ ${i18n.t('watched')}`;
        } else {
            wantBtn.textContent = i18n.t('want');
            watchedBtn.textContent = i18n.t('watched');
        }
    }

    _dispatchEvent(name, detail) {
        document.dispatchEvent(new CustomEvent(name, {
            bubbles: true,
            composed: true,
            detail
        }));
    }
}

customElements.define('movie-action-buttons', MovieActionButtons);
