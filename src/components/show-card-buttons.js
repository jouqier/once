import { haptic } from '../config/telegram.js';
import { userMoviesService } from '../services/user-movies.js';
import { i18n } from '../services/i18n.js';
import './action-sheet.js';
import './review-dialog.js';
import '@material/web/button/filled-tonal-button.js';

export class TVShowActionButtons extends HTMLElement {
    static States = {
        NONE: 'none',
        WANT: 'want',
        WATCHED: 'watched'
    };

    static Actions = {
        REMOVE_FROM_WANT: 'remove-from-want',
        REMOVE_FROM_WATCHED: 'remove-from-watched',
        MARK_ALL_WATCHED: 'mark-all-watched',
        MARK_ALL_UNWATCHED: 'mark-all-unwatched',
        MOVE_TO_WANT: 'move-to-want',
        WATCHING: 'watching'
    };

    static Activities = {
        WANT: 'want',
        WATCHED: 'watched',
        WATCHING: 'watching',
        REMOVED_FROM_WANT: 'removed-from-want',
        REMOVED_FROM_WATCHED: 'removed-from-watched'
    };

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._state = TVShowActionButtons.States.NONE;
        this._tvShow = null;
        this._hasWatchedEpisodes = false;
        this._activityScreen = document.createElement('activity-screen');
        
        // Сохраняем bound функции для правильной очистки слушателей
        this._boundHandlers = {
            allSeasonsWatched: this._handleAllSeasonsWatchedFromConstructor.bind(this),
            change: this._handleChangeFromConstructor.bind(this),
            episodeStatusChanged: this._handleEpisodeStatusChangedFromConstructor.bind(this),
            allSeasonsWatchedDup: this._handleAllSeasonsWatched.bind(this),
            allSeasonsUnwatched: this._handleAllSeasonsUnwatched.bind(this),
            episodeWatchedStatusChanged: this._handleEpisodeStatusChanged.bind(this)
        };
        
        // Кеш для проверки состояния всех сезонов
        this._allSeasonsWatchedCache = undefined;
        
        // Флаг для батчинга обновлений DOM
        this._pendingUpdate = false;
        
        this._createElements();
        this._setupButtonEventListeners();
    }

    _checkAllSeasonsWatched() {
        // Проверяем кеш
        if (this._allSeasonsWatchedCache !== undefined) {
            return this._allSeasonsWatchedCache;
        }
        
        // Вычисляем состояние (если есть seasons)
        if (!this._seasons || !this._seasons.length) {
            return false;
        }
        
        const result = this._seasons.every(season => {
            if (season.season_number === 0) return true;
            const totalEpisodes = season.episodes?.length;
            if (!totalEpisodes) return true;
            
            return userMoviesService.isSeasonFullyWatched(
                this._tvShow.id,
                season.season_number,
                totalEpisodes
            );
        });
        
        this._allSeasonsWatchedCache = result;
        return result;
    }

    _invalidateCache() {
        this._allSeasonsWatchedCache = undefined;
    }

    connectedCallback() {
        // Добавляем глобальные слушатели при подключении к DOM
        document.addEventListener('all-seasons-watched', this._boundHandlers.allSeasonsWatched);
        document.addEventListener('change', this._boundHandlers.change);
        document.addEventListener('episode-status-changed', this._boundHandlers.episodeStatusChanged);
        document.addEventListener('all-seasons-watched', this._boundHandlers.allSeasonsWatchedDup);
        document.addEventListener('all-seasons-unwatched', this._boundHandlers.allSeasonsUnwatched);
        document.addEventListener('episode-watched-status-changed', this._boundHandlers.episodeWatchedStatusChanged);
    }

    disconnectedCallback() {
        // Удаляем глобальные слушатели при отключении компонента
        document.removeEventListener('all-seasons-watched', this._boundHandlers.allSeasonsWatched);
        document.removeEventListener('change', this._boundHandlers.change);
        document.removeEventListener('episode-status-changed', this._boundHandlers.episodeStatusChanged);
        document.removeEventListener('all-seasons-watched', this._boundHandlers.allSeasonsWatchedDup);
        document.removeEventListener('all-seasons-unwatched', this._boundHandlers.allSeasonsUnwatched);
        document.removeEventListener('episode-watched-status-changed', this._boundHandlers.episodeWatchedStatusChanged);
    }

    _handleAllSeasonsWatchedFromConstructor(e) {
        if (this._tvShow?.id === e.detail.tvId) {
            userMoviesService.addToWatched(this._tvShow);
            this._activityScreen.addActivity(this._tvShow, TVShowActionButtons.Activities.WATCHED);
            this._state = TVShowActionButtons.States.WATCHED;
            this._updateButtonStates();
        }
    }

    _handleChangeFromConstructor(e) {
        if (e.target.tagName === 'MD-CHECKBOX' && this._tvShow) {
            if (this._state === TVShowActionButtons.States.NONE && e.target.checked) {
                this._handleWatching();
            }
        }
    }

    _handleEpisodeStatusChangedFromConstructor(e) {
        if (this._tvShow?.id === e.detail.tvId && e.detail.hasWatchedEpisodes) {
            this._handleWatching();
        }
    }

    _createElements() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    padding: 16px;
                    align-items: center;
                    gap: 8px;
                    align-self: stretch;
                    z-index: 1;
                }
                
                md-filled-tonal-button {
                    flex: 1 0 0;
                    --md-filled-tonal-button-container-shape: 1000px;
                    --md-filled-tonal-button-label-text-font: 600 14px sans-serif;
                    height: 48px;
                    transition: all 0.3s ease;
                }

                .want-button {
                    --md-sys-color-secondary-container: ${this._getWantButtonColor()};
                    --md-sys-color-on-secondary-container: #FFF;
                    border: ${this._getWantButtonBorder()};
                    display: ${this._getWantButtonDisplay()};
                }

                .watched-button {
                    --md-sys-color-secondary-container: ${this._getWatchedButtonColor()};
                    --md-sys-color-on-secondary-container: #FFF;
                    display: ${this._getWatchedButtonDisplay()};
                }

                .button-content {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
            </style>
            
            <md-filled-tonal-button class="want-button">
                <div class="button-content">${i18n.t('want')}</div>
            </md-filled-tonal-button>
            <md-filled-tonal-button class="watched-button">
                <div class="button-content">${i18n.t('watched')}</div>
            </md-filled-tonal-button>
        `;

        this._wantButton = this.shadowRoot.querySelector('.want-button');
        this._watchedButton = this.shadowRoot.querySelector('.watched-button');
        this._wantButtonContent = this._wantButton.querySelector('.button-content');
        this._watchedButtonContent = this._watchedButton.querySelector('.button-content');
    }

    _getWantButtonColor() {
        return this._state === TVShowActionButtons.States.WANT ? 
            'transparent' : 
            'rgba(255, 255, 255, 0.32)';
    }

    _getWantButtonBorder() {
        return this._state === TVShowActionButtons.States.WANT ? 
            '2px solid var(--md-sys-color-on-surface)' : 
            'none';
    }

    _getWantButtonDisplay() {
        return this._state === TVShowActionButtons.States.WATCHED ? 'none' : 'flex';
    }

    _getWatchedButtonColor() {
        return this._state === TVShowActionButtons.States.WATCHED ? 
            'var(--md-sys-color-primary-container)' : 
            'rgba(255, 255, 255, 0.32)';
    }

    _getWatchedButtonDisplay() {
        return this._state === TVShowActionButtons.States.WANT ? 'none' : 'flex';
    }

    _setupButtonEventListeners() {
        this._wantButton.addEventListener('click', () => {
            if (!this._tvShow) return;
            haptic.light();
            
            if (this._state === TVShowActionButtons.States.WANT) {
                this._showWantContextMenu();
            } else {
                this._addToWant();
            }
        });

        this._watchedButton.addEventListener('click', () => {
            if (!this._tvShow) return;
            haptic.light();
            this._showTVWatchedMenu();
        });
    }

    set tvShow(value) {
        this._tvShow = value;
        if (this._tvShow) {
            this._state = userMoviesService.getMovieState(this._tvShow.id);
            this._invalidateCache(); // Сбрасываем кеш при смене сериала
            this._updateButtonStates();
        }
    }

    set seasons(value) {
        this._seasons = value;
        this._invalidateCache(); // Сбрасываем кеш при установке сезонов
    }

    _handleAllSeasonsWatched(e) {
        if (this._tvShow?.id === e.detail.tvId) {
            haptic.medium();
            this._markAsWatched();
        }
    }

    _handleAllSeasonsUnwatched(e) {
        if (this._tvShow?.id === e.detail.tvId) {
            this._removeFromWatched();
        }
    }

    _handleEpisodeStatusChanged(e) {
        if (this._tvShow?.id === e.detail.tvId) {
            this._hasWatchedEpisodes = e.detail.hasWatchedEpisodes;
            this._updateButtonStates();
        }
    }

    _updateButtonStates() {
        if (this._pendingUpdate) return;
        
        this._pendingUpdate = true;
        requestAnimationFrame(() => {
            this._doUpdateButtonStates();
            this._pendingUpdate = false;
        });
    }

    _doUpdateButtonStates() {
        this._updateButtonContent();
        this._updateButtonVisibility();
        this._updateButtonStyles();
    }

    _updateButtonContent() {
        this._wantButtonContent.textContent = this._state === TVShowActionButtons.States.WANT ? 
            `✓ ${i18n.t('want')}` : i18n.t('want');
        this._watchedButtonContent.textContent = this._state === TVShowActionButtons.States.WATCHED ? 
            `✓ ${i18n.t('watched')}` : i18n.t('watched');
    }

    _updateButtonVisibility() {
        if (this._state === TVShowActionButtons.States.WATCHED || 
            this._state === TVShowActionButtons.States.WANT) {
            this._wantButton.style.display = this._getWantButtonDisplay();
            this._watchedButton.style.display = this._getWatchedButtonDisplay();
        } else if (this._hasWatchedEpisodes) {
            this._wantButton.style.display = 'none';
            this._watchedButton.style.display = 'flex';
        } else {
            this._wantButton.style.display = 'flex';
            this._watchedButton.style.display = 'flex';
        }
    }

    _updateButtonStyles() {
        this._wantButton.style.border = this._getWantButtonBorder();
        this._wantButton.style.setProperty('--md-sys-color-secondary-container', this._getWantButtonColor());
        this._watchedButton.style.setProperty('--md-sys-color-secondary-container', this._getWatchedButtonColor());
    }

    _addToWant() {
        userMoviesService.addToWant(this._tvShow);
        this._activityScreen.addActivity(this._tvShow, TVShowActionButtons.Activities.WANT);
        this._state = TVShowActionButtons.States.WANT;
        this._updateButtonStates();
    }

    _markAsWatched() {
        userMoviesService.addToWatched(this._tvShow);
        this._activityScreen.addActivity(this._tvShow, TVShowActionButtons.Activities.WATCHED);
        this._state = TVShowActionButtons.States.WATCHED;
        this._updateButtonStates();
    }

    _removeFromWatched() {
        userMoviesService.removeFromWatched(this._tvShow.id);
        userMoviesService.removeAllSeasonReviews(this._tvShow.id);
        this._activityScreen.addActivity(this._tvShow, TVShowActionButtons.Activities.REMOVED_FROM_WATCHED);
        this._state = TVShowActionButtons.States.NONE;
        this._updateButtonStates();
        this._dispatchTVAction('clear-all-seasons');
        
        document.dispatchEvent(new CustomEvent('season-reviews-removed', {
            bubbles: true,
            composed: true,
            detail: { tvId: this._tvShow.id }
        }));
    }

    _showWantContextMenu() {
        const menu = document.createElement('context-menu');
        menu.options = [
            { 
                label: i18n.t('removeFromWant'),
                action: TVShowActionButtons.Actions.REMOVE_FROM_WANT
            },
            {
                label: i18n.t('imWatchingThis'),
                action: TVShowActionButtons.Actions.WATCHING
            },
            {
                label: i18n.t('markAllAsWatched'),
                action: TVShowActionButtons.Actions.MARK_ALL_WATCHED
            }
        ];

        menu.addEventListener('menu-action', this._handleWantMenuAction.bind(this));
        document.body.appendChild(menu);
    }

    _showTVWatchedMenu() {
        const menu = document.createElement('context-menu');
        
        const checkPromise = new Promise(resolve => {
            console.log('Waiting for check-all-seasons-result...');
            document.addEventListener('check-all-seasons-result', (e) => {
                console.log('Got check-all-seasons-result:', e.detail);
                if (this._tvShow?.id === e.detail.tvId) {
                    resolve(e.detail.allWatched);
                }
            }, { once: true });
        });

        console.log('Dispatching check-all-seasons for tvId:', this._tvShow.id);
        document.dispatchEvent(new CustomEvent('check-all-seasons', {
            bubbles: true,
            composed: true,
            detail: { tvId: this._tvShow.id }
        }));

        checkPromise.then(allSeasonsWatched => {
            console.log('Creating menu with allSeasonsWatched:', allSeasonsWatched);
            menu.options = this._getContextMenuOptions(allSeasonsWatched);
            menu.addEventListener('menu-action', this._handleWatchedMenuAction.bind(this));
            document.body.appendChild(menu);
        });
    }

    _getContextMenuOptions(allSeasonsWatched) {
        if (this._state === TVShowActionButtons.States.WATCHED) {
            return allSeasonsWatched ? [
                { label: i18n.t('removeFromWatched'), action: TVShowActionButtons.Actions.REMOVE_FROM_WATCHED },
                { label: i18n.t('markAllAsUnwatched'), action: TVShowActionButtons.Actions.MARK_ALL_UNWATCHED },
                { label: i18n.t('moveToWant'), action: TVShowActionButtons.Actions.MOVE_TO_WANT }
            ] : [
                { label: i18n.t('removeFromWatched'), action: TVShowActionButtons.Actions.REMOVE_FROM_WATCHED },
                { label: i18n.t('markAllAsWatched'), action: TVShowActionButtons.Actions.MARK_ALL_WATCHED },
                { label: i18n.t('moveToWant'), action: TVShowActionButtons.Actions.MOVE_TO_WANT }
            ];
        }
        
        return [
            { label: i18n.t('markAllAsWatched'), action: TVShowActionButtons.Actions.MARK_ALL_WATCHED },
            { label: i18n.t('imWatchingThis'), action: TVShowActionButtons.Actions.WATCHING }
        ];
    }

    _handleWantMenuAction(e) {
        switch (e.detail.action) {
            case TVShowActionButtons.Actions.REMOVE_FROM_WANT:
                this._handleRemoveFromWant();
                break;
            case TVShowActionButtons.Actions.WATCHING:
                this._handleWatching();
                break;
            case TVShowActionButtons.Actions.MARK_ALL_WATCHED:
                this._handleMarkAllWatched();
                break;
        }
    }

    _handleWatchedMenuAction(e) {
        switch (e.detail.action) {
            case TVShowActionButtons.Actions.REMOVE_FROM_WATCHED:
                this._handleRemoveFromWatched();
                break;
            case TVShowActionButtons.Actions.MARK_ALL_UNWATCHED:
                this._handleMarkAllUnwatched();
                break;
            case TVShowActionButtons.Actions.MARK_ALL_WATCHED:
                this._dispatchTVAction(e.detail.action);
                break;
            case TVShowActionButtons.Actions.MOVE_TO_WANT:
                this._handleMoveToWant();
                break;
            case TVShowActionButtons.Actions.WATCHING:
                this._handleWatching();
                break;
        }
    }

    _handleRemoveFromWant() {
        userMoviesService.removeFromWant(this._tvShow.id);
        userMoviesService.removeAllSeasonReviews(this._tvShow.id);
        this._activityScreen.addActivity(this._tvShow, TVShowActionButtons.Activities.REMOVED_FROM_WANT);
        this._state = TVShowActionButtons.States.NONE;
        this._updateButtonStates();
        this._dispatchTVAction('clear-all-seasons');
    }

    _handleRemoveFromWatched() {
        userMoviesService.removeFromWatched(this._tvShow.id);
        userMoviesService.removeAllSeasonReviews(this._tvShow.id);
        this._activityScreen.addActivity(this._tvShow, TVShowActionButtons.Activities.REMOVED_FROM_WATCHED);
        this._state = TVShowActionButtons.States.NONE;
        this._invalidateCache(); // Сбрасываем кеш
        this._updateButtonStates();
        this._dispatchTVAction('clear-all-seasons');
        
        document.dispatchEvent(new CustomEvent('season-reviews-removed', {
            bubbles: true,
            composed: true,
            detail: { tvId: this._tvShow.id }
        }));
    }

    _handleWatching() {
        userMoviesService.addToWatched(this._tvShow);
        this._activityScreen.addActivity(this._tvShow, TVShowActionButtons.Activities.WATCHING);
        this._state = TVShowActionButtons.States.WATCHED;
        this._updateButtonStates();
    }

    _handleMoveToWant() {
        userMoviesService.removeFromWatched(this._tvShow.id);
        userMoviesService.removeAllSeasonReviews(this._tvShow.id);
        userMoviesService.addToWant(this._tvShow);
        this._activityScreen.addActivity(this._tvShow, TVShowActionButtons.Activities.WANT);
        this._state = TVShowActionButtons.States.WANT;
        this._invalidateCache(); // Сбрасываем кеш
        this._updateButtonStates();
        
        document.dispatchEvent(new CustomEvent('season-reviews-removed', {
            bubbles: true,
            composed: true,
            detail: { tvId: this._tvShow.id }
        }));
    }

    _handleMarkAllWatched() {
        haptic.medium();
        
        this._dispatchTVAction(TVShowActionButtons.Actions.MARK_ALL_WATCHED);
        
        userMoviesService.removeFromWant(this._tvShow.id);
        userMoviesService.addToWatched(this._tvShow);
        this._activityScreen.addActivity(this._tvShow, TVShowActionButtons.Activities.WATCHED);
        this._state = TVShowActionButtons.States.WATCHED;
        this._invalidateCache(); // Сбрасываем кеш
        this._updateButtonStates();
    }

    _handleMarkAllUnwatched() {
        haptic.medium();
        
        this._dispatchTVAction(TVShowActionButtons.Actions.MARK_ALL_UNWATCHED);
        
        this._invalidateCache(); // Сбрасываем кеш
        this._updateButtonStates();
    }

    _dispatchTVAction(action) {
        document.dispatchEvent(new CustomEvent('tv-action', {
            bubbles: true,
            composed: true,
            detail: {
                tvId: this._tvShow.id,
                action
            }
        }));
    }
}

customElements.define('tv-show-action-buttons', TVShowActionButtons); 