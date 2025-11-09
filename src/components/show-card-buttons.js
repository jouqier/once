import { haptic } from '../config/telegram.js';
import { userMoviesService } from '../services/user-movies.js';
import { i18n } from '../services/i18n.js';
import './action-sheet.js';
import '@material/web/button/filled-tonal-button.js';

/**
 * Компонент кнопок управления сериалом
 * Состояния: none, want, watching, watched
 */
export class TVShowActionButtons extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._tvShow = null;
        this._state = 'none';
        this._render();
    }

    connectedCallback() {
        this._setupEventListeners();
        // Слушаем изменения эпизодов для автоматических переходов
        document.addEventListener('episode-checkbox-changed', this._handleEpisodeChange.bind(this));
        // Слушаем события от кнопок сезонов
        document.addEventListener('season-marked-watched', this._handleSeasonMarkedWatched.bind(this));
        document.addEventListener('season-marked-unwatched', this._handleSeasonMarkedUnwatched.bind(this));
    }

    disconnectedCallback() {
        document.removeEventListener('episode-checkbox-changed', this._handleEpisodeChange.bind(this));
        document.removeEventListener('season-marked-watched', this._handleSeasonMarkedWatched.bind(this));
        document.removeEventListener('season-marked-unwatched', this._handleSeasonMarkedUnwatched.bind(this));
    }

    set tvShow(value) {
        this._tvShow = value;
        if (this._tvShow) {
            this._state = userMoviesService.getTVShowState(this._tvShow.id);
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
                    --md-sys-color-on-secondary-container: #FFF;
                }

                .want-button.active {
                    --md-sys-color-secondary-container: transparent;
                    border: 2px solid var(--md-sys-color-on-surface);
                }

                .watching-button {
                    --md-sys-color-secondary-container: var(--md-sys-color-primary-container);
                    --md-sys-color-on-secondary-container: #FFF;
                }

                .watched-button {
                    --md-sys-color-secondary-container: rgba(255, 255, 255, 0.32);
                    --md-sys-color-on-secondary-container: #FFF;
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
            <md-filled-tonal-button class="watching-button hidden">
                ${i18n.t('watching')}
            </md-filled-tonal-button>
            <md-filled-tonal-button class="watched-button">
                ${i18n.t('watched')}
            </md-filled-tonal-button>
        `;
    }

    _setupEventListeners() {
        const wantBtn = this.shadowRoot.querySelector('.want-button');
        const watchingBtn = this.shadowRoot.querySelector('.watching-button');
        const watchedBtn = this.shadowRoot.querySelector('.watched-button');

        wantBtn.addEventListener('click', () => this._handleWantClick());
        watchingBtn.addEventListener('click', () => this._handleWatchingClick());
        watchedBtn.addEventListener('click', () => this._handleWatchedClick());
    }

    _handleWantClick() {
        if (!this._tvShow) return;
        haptic.light();

        if (this._state === 'want') {
            this._showWantMenu();
        } else {
            // Добавить в Want
            userMoviesService.addTVShowToWant(this._tvShow);
            this._state = 'want';
            this._updateUI();
        }
    }

    _handleWatchingClick() {
        if (!this._tvShow) return;
        haptic.light();
        this._showWatchingMenu();
    }

    _handleWatchedClick() {
        if (!this._tvShow) return;
        haptic.light();

        if (this._state === 'watched') {
            this._showWatchedMenu();
        } else {
            this._showWatchedMenu();
        }
    }

    _showWantMenu() {
        const menu = document.createElement('context-menu');
        menu.options = [
            { label: i18n.t('removeFromWant'), action: 'remove-from-want' },
            { label: i18n.t('imWatchingThis'), action: 'watching' },
            { label: i18n.t('markAllAsWatched'), action: 'mark-all-watched' }
        ];

        menu.addEventListener('menu-action', (e) => {
            const action = e.detail.action;

            if (action === 'remove-from-want') {
                userMoviesService.removeTVShowFromWant(this._tvShow.id);
                this._state = 'none';
                this._updateUI();
            } else if (action === 'watching') {
                userMoviesService.removeTVShowFromWant(this._tvShow.id);
                userMoviesService.addTVShowToWatching(this._tvShow);
                this._state = 'watching';
                this._updateUI();
            } else if (action === 'mark-all-watched') {
                userMoviesService.removeTVShowFromWant(this._tvShow.id);
                userMoviesService.addTVShowToWatched(this._tvShow);
                this._state = 'watched';
                this._updateUI();
                this._dispatchEvent('tv-action', { tvId: this._tvShow.id, action: 'mark-all-watched' });
            }
        });

        document.body.appendChild(menu);
    }

    _showWatchingMenu() {
        const menu = document.createElement('context-menu');
        menu.options = [
            { label: i18n.t('removeFromWatching'), action: 'remove-from-watching' },
            { label: i18n.t('markAllAsWatched'), action: 'mark-all-watched' },
            { label: i18n.t('moveToWant'), action: 'move-to-want' }
        ];

        menu.addEventListener('menu-action', (e) => {
            const action = e.detail.action;

            if (action === 'remove-from-watching') {
                userMoviesService.removeTVShowFromWatching(this._tvShow.id);
                userMoviesService.removeAllSeasonReviews(this._tvShow.id);
                this._state = 'none';
                this._updateUI();
                this._dispatchEvent('tv-action', { tvId: this._tvShow.id, action: 'clear-all-seasons' });
                this._dispatchEvent('season-reviews-removed', { tvId: this._tvShow.id });
            } else if (action === 'mark-all-watched') {
                userMoviesService.removeTVShowFromWatching(this._tvShow.id);
                userMoviesService.addTVShowToWatched(this._tvShow);
                this._state = 'watched';
                this._updateUI();
                this._dispatchEvent('tv-action', { tvId: this._tvShow.id, action: 'mark-all-watched' });
            } else if (action === 'move-to-want') {
                userMoviesService.removeTVShowFromWatching(this._tvShow.id);
                userMoviesService.removeAllSeasonReviews(this._tvShow.id);
                userMoviesService.addTVShowToWant(this._tvShow);
                this._state = 'want';
                this._updateUI();
                this._dispatchEvent('tv-action', { tvId: this._tvShow.id, action: 'clear-all-seasons' });
                this._dispatchEvent('season-reviews-removed', { tvId: this._tvShow.id });
            }
        });

        document.body.appendChild(menu);
    }

    _showWatchedMenu() {
        const menu = document.createElement('context-menu');
        menu.options = [
            { label: i18n.t('removeFromWatched'), action: 'remove-from-watched' },
            { label: i18n.t('moveToWant'), action: 'move-to-want' }
        ];

        // Если состояние none, добавляем опции для начала просмотра
        if (this._state === 'none') {
            menu.options = [
                { label: i18n.t('markAllAsWatched'), action: 'mark-all-watched' },
                { label: i18n.t('imWatchingThis'), action: 'watching' }
            ];
        }

        menu.addEventListener('menu-action', (e) => {
            const action = e.detail.action;

            if (action === 'remove-from-watched') {
                userMoviesService.removeTVShowFromWatched(this._tvShow.id);
                userMoviesService.removeAllSeasonReviews(this._tvShow.id);
                this._state = 'none';
                this._updateUI();
                this._dispatchEvent('tv-action', { tvId: this._tvShow.id, action: 'clear-all-seasons' });
                this._dispatchEvent('season-reviews-removed', { tvId: this._tvShow.id });
            } else if (action === 'move-to-want') {
                userMoviesService.removeTVShowFromWatched(this._tvShow.id);
                userMoviesService.removeAllSeasonReviews(this._tvShow.id);
                userMoviesService.addTVShowToWant(this._tvShow);
                this._state = 'want';
                this._updateUI();
                this._dispatchEvent('tv-action', { tvId: this._tvShow.id, action: 'clear-all-seasons' });
                this._dispatchEvent('season-reviews-removed', { tvId: this._tvShow.id });
            } else if (action === 'mark-all-watched') {
                userMoviesService.addTVShowToWatched(this._tvShow);
                this._state = 'watched';
                this._updateUI();
                this._dispatchEvent('tv-action', { tvId: this._tvShow.id, action: 'mark-all-watched' });
            } else if (action === 'watching') {
                userMoviesService.addTVShowToWatching(this._tvShow);
                this._state = 'watching';
                this._updateUI();
            }
        });

        document.body.appendChild(menu);
    }

    _handleEpisodeChange(e) {
        if (!this._tvShow || e.detail.tvId !== this._tvShow.id) return;

        const { checked, isLastUnwatched, wasAllWatched } = e.detail;

        // Переход в WATCHING при отметке первого эпизода
        if (checked && (this._state === 'none' || this._state === 'want')) {
            userMoviesService.removeTVShowFromWant(this._tvShow.id);
            userMoviesService.addTVShowToWatching(this._tvShow);
            this._state = 'watching';
            this._updateUI();
        }

        // Переход в WATCHED при отметке последнего эпизода
        if (checked && isLastUnwatched && this._state === 'watching') {
            userMoviesService.removeTVShowFromWatching(this._tvShow.id);
            userMoviesService.addTVShowToWatched(this._tvShow);
            this._state = 'watched';
            this._updateUI();
        }

        // Переход обратно в WATCHING при снятии отметки
        if (!checked && wasAllWatched && this._state === 'watched') {
            userMoviesService.removeTVShowFromWatched(this._tvShow.id);
            userMoviesService.addTVShowToWatching(this._tvShow);
            this._state = 'watching';
            this._updateUI();
        }
    }

    _handleSeasonMarkedWatched(e) {
        if (!this._tvShow || e.detail.tvId !== this._tvShow.id) return;

        const { allEpisodesWatched } = e.detail;

        if (allEpisodesWatched) {
            // Все эпизоды отмечены → переходим в WATCHED
            userMoviesService.removeTVShowFromWatching(this._tvShow.id);
            userMoviesService.removeTVShowFromWant(this._tvShow.id);
            userMoviesService.addTVShowToWatched(this._tvShow);
            this._state = 'watched';
            this._updateUI();
        } else if (this._state === 'none' || this._state === 'want') {
            // Не все эпизоды отмечены, но есть просмотренные → переходим в WATCHING
            userMoviesService.removeTVShowFromWant(this._tvShow.id);
            userMoviesService.addTVShowToWatching(this._tvShow);
            this._state = 'watching';
            this._updateUI();
        }
    }

    _handleSeasonMarkedUnwatched(e) {
        if (!this._tvShow || e.detail.tvId !== this._tvShow.id) return;

        const { wasAllWatched, hasAnyWatchedEpisodes } = e.detail;

        if (wasAllWatched) {
            // Был WATCHED, теперь не все отмечены
            if (hasAnyWatchedEpisodes) {
                // Есть просмотренные эпизоды → переходим в WATCHING
                userMoviesService.removeTVShowFromWatched(this._tvShow.id);
                userMoviesService.addTVShowToWatching(this._tvShow);
                this._state = 'watching';
                this._updateUI();
            } else {
                // Нет просмотренных эпизодов → переходим в NONE
                userMoviesService.removeTVShowFromWatched(this._tvShow.id);
                this._state = 'none';
                this._updateUI();
            }
        }
    }

    _updateUI() {
        const wantBtn = this.shadowRoot.querySelector('.want-button');
        const watchingBtn = this.shadowRoot.querySelector('.watching-button');
        const watchedBtn = this.shadowRoot.querySelector('.watched-button');

        // Сброс классов
        wantBtn.classList.remove('active', 'hidden');
        watchingBtn.classList.remove('hidden');
        watchedBtn.classList.remove('active', 'hidden');

        // Обновление в зависимости от состояния
        if (this._state === 'want') {
            wantBtn.classList.add('active');
            wantBtn.textContent = `✓ ${i18n.t('want')}`;
            watchingBtn.classList.add('hidden');
            watchedBtn.classList.add('hidden');
        } else if (this._state === 'watching') {
            wantBtn.classList.add('hidden');
            watchingBtn.classList.remove('hidden');
            watchedBtn.classList.add('hidden');
        } else if (this._state === 'watched') {
            wantBtn.classList.add('hidden');
            watchingBtn.classList.add('hidden');
            watchedBtn.classList.add('active');
            watchedBtn.textContent = `✓ ${i18n.t('watched')}`;
        } else {
            wantBtn.textContent = i18n.t('want');
            watchingBtn.classList.add('hidden');
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

customElements.define('tv-show-action-buttons', TVShowActionButtons);
