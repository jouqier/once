import { haptic } from '../config/telegram.js';
import { userMoviesService } from '../services/user-movies.js';
import { i18n } from '../services/i18n.js';

/**
 * Компонент управления сезонами и эпизодами сериала
 * Отображает список сезонов, эпизоды и кнопки управления
 */
export class TVSeasons extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._tvId = null;
        this._tvShow = null;
        this._seasons = null;
        this._currentSeasonNumber = 1;
    }

    connectedCallback() {
        // Слушаем глобальные события от основных кнопок
        document.addEventListener('tv-action', this._handleTvAction.bind(this));
    }

    set tvId(value) {
        this._tvId = value;
    }

    set tvShow(value) {
        this._tvShow = value;
    }

    set seasons(value) {
        this._seasons = value;
        if (value && value.length > 0) {
            this._render();
            this._showSeason(1);
        }
    }

    _render() {
        if (!this._seasons || !this._seasons.length) return;

        const seasonTabs = this._seasons
            .filter(s => s.episodes?.length > 0)
            .map((season, index) => `
                <md-filled-tonal-button 
                    class="season-tab" 
                    data-season="${season.season_number}"
                    ${index === 0 ? 'selected' : ''}>
                    ${i18n.t('season')} ${season.season_number}
                </md-filled-tonal-button>
            `).join('');

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                }

                :host-context(movie-info) {
                    display: none !important;
                }

                .seasons-container {
                    position: relative;
                    height: 40px;
                    padding: 8px 0;
                }

                .seasons-list-wrapper {
                    width: 100%;
                    height: 100%;
                    overflow-x: auto;
                    overflow-y: hidden;
                    scrollbar-width: none;
                    -webkit-overflow-scrolling: touch;
                }

                .seasons-list-wrapper::-webkit-scrollbar {
                    display: none;
                }

                .seasons-container::before,
                .seasons-container::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 16px;
                    pointer-events: none;
                    z-index: 1;
                }

                .seasons-container::before {
                    left: 0;
                    background: linear-gradient(to right, var(--md-sys-color-scrim), transparent);
                }

                .seasons-container::after {
                    right: 0;
                    background: linear-gradient(to left, var(--md-sys-color-scrim), transparent);
                }

                .seasons-list {
                    display: flex;
                    padding: 0 16px;
                    gap: 4px;
                }

                .season-tab {
                    --md-filled-tonal-button-container-color: rgba(255, 255, 255, 0.0);
                    --md-filled-tonal-button-label-text-color: var(--md-sys-color-on-surface);
                    --md-filled-tonal-button-container-shape: 1000px;
                    --md-filled-tonal-button-label-text-font: 600 14px sans-serif;
                    --md-filled-tonal-button-container-height: 40px;
                    padding: 0 16px;
                    flex-shrink: 0;
                }

                .season-tab[selected] {
                    --md-filled-tonal-button-container-color: var(--md-sys-color-surface-container);
                }

                .episodes-list {
                    display: flex;
                    flex-direction: column;
                    padding-top: 8px;
                }

                .episode-item {
                    display: flex;
                    padding: 10px 16px;
                    align-items: center;
                    gap: 4px;
                }

                .episode-number {
                    width: 20px;
                    color: var(--md-sys-color-outline);
                    font-size: 14px;
                    font-weight: 600;
                    line-height: 20px;
                }

                .episode-info {
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                    min-width: 0;
                }

                .episode-title {
                    color: var(--md-sys-color-on-surface);
                    font-size: 14px;
                    font-weight: 600;
                    line-height: 20px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .episode-date {
                    color: var(--md-sys-color-outline);
                    font-size: 12px;
                    font-weight: 600;
                    line-height: 16px;
                }

                .divider {
                    height: 1px;
                    background: var(--md-sys-color-surface-container-low);
                    margin: 8px 16px;
                }

                md-checkbox {
                    --md-checkbox-container-shape: 4px;
                    --md-checkbox-outline-color: rgba(255, 255, 255, 0.5);
                    --md-checkbox-selected-container-color: #E0E2ED;
                    --md-checkbox-selected-icon-color: #10131B;
                }

                .unwatched-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: var(--md-sys-color-primary-container);
                    display: inline-block;
                    margin-left: 4px;
                }

                .season-actions {
                    display: flex;
                    padding: 8px 16px;
                    gap: 8px;
                }

                .season-actions md-filled-tonal-button {
                    --md-filled-tonal-button-container-color: var(--md-sys-color-surface-container-high);
                    --md-filled-tonal-button-label-text-color: var(--md-sys-color-on-surface);
                    flex: 1;
                }
            </style>

            <div class="seasons-container">
                <div class="seasons-list-wrapper">
                    <div class="seasons-list">
                        ${seasonTabs}
                        <div style="padding-right: 4px; flex-shrink: 0;">&nbsp;</div>
                    </div>
                </div>
            </div>

            <div class="episodes-list"></div>
        `;

        // Устанавливаем обработчики для табов
        this.shadowRoot.querySelectorAll('.season-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                haptic.light();
                this._showSeason(parseInt(tab.dataset.season));
            });
        });
    }

    _showSeason(seasonNumber) {
        this._currentSeasonNumber = seasonNumber;
        const season = this._seasons.find(s => s.season_number === seasonNumber);
        if (!season || !season.episodes?.length) return;

        // Обновляем активный таб
        this.shadowRoot.querySelectorAll('.season-tab').forEach(tab => {
            tab.toggleAttribute('selected', parseInt(tab.dataset.season) === seasonNumber);
        });

        // Рендерим эпизоды
        const episodesList = this.shadowRoot.querySelector('.episodes-list');
        const episodesHTML = season.episodes.map(episode => {
            const isWatched = userMoviesService.isEpisodeWatched(
                this._tvId,
                seasonNumber,
                episode.episode_number
            );
            return `
                <div class="episode-wrapper">
                    <div class="episode-item">
                        <div class="episode-number">
                            ${episode.episode_number}
                            ${!isWatched ? '<span class="unwatched-dot"></span>' : ''}
                        </div>
                        <div class="episode-info">
                            <div class="episode-title">${episode.name}</div>
                            <div class="episode-date">
                                ${new Date(episode.air_date).toLocaleDateString(
                                    i18n.getLocale() === 'ru' ? 'ru-RU' : 'en-US'
                                )}
                            </div>
                        </div>
                        <md-checkbox 
                            touch-target="wrapper"
                            data-episode="${episode.episode_number}"
                            ${isWatched ? 'checked' : ''}
                        ></md-checkbox>
                    </div>
                    <div class="divider"></div>
                </div>
            `;
        }).join('');

        // Проверяем состояние сезона
        const isFullyWatched = userMoviesService.isSeasonFullyWatched(
            this._tvId,
            seasonNumber,
            season.episodes.length
        );
        const hasReview = userMoviesService.getSeasonReview(this._tvId, seasonNumber);

        // Рендерим кнопки управления
        const actionsHTML = this._getSeasonActionsHTML(isFullyWatched, hasReview);

        episodesList.innerHTML = episodesHTML + actionsHTML;

        // Устанавливаем обработчики
        this._setupEpisodeListeners(seasonNumber);
        this._setupActionButtons(seasonNumber, season.episodes.length);
    }

    _getSeasonActionsHTML(isFullyWatched, hasReview) {
        if (isFullyWatched) {
            return `
                <div class="season-actions">
                    ${!hasReview ? `
                        <md-filled-tonal-button class="rate-season-button">
                            ${i18n.t('rateSeason')}
                        </md-filled-tonal-button>
                    ` : ''}
                    <md-filled-tonal-button class="mark-unwatched-button">
                        ${i18n.t('markAsUnwatched')}
                    </md-filled-tonal-button>
                </div>
            `;
        } else {
            return `
                <div class="season-actions">
                    <md-filled-tonal-button class="mark-watched-button">
                        ${i18n.t('markAsWatched')}
                    </md-filled-tonal-button>
                </div>
            `;
        }
    }

    _setupEpisodeListeners(seasonNumber) {
        this.shadowRoot.querySelectorAll('md-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                haptic.medium();
                const episodeNumber = parseInt(checkbox.dataset.episode);

                // Проверяем состояние ДО изменения
                const wasAllWatched = this._checkIfAllEpisodesWatched();
                const isLastUnwatched = checkbox.checked && 
                    this._checkIfLastUnwatchedEpisode(seasonNumber, episodeNumber);

                // Обновляем точку в UI
                const episodeItem = checkbox.closest('.episode-item');
                const numberEl = episodeItem.querySelector('.episode-number');
                const dot = numberEl.querySelector('.unwatched-dot');
                
                if (checkbox.checked && dot) {
                    dot.remove();
                } else if (!checkbox.checked && !dot) {
                    numberEl.innerHTML += '<span class="unwatched-dot"></span>';
                }

                // Сохраняем изменение
                if (checkbox.checked) {
                    userMoviesService.markEpisodeAsWatched(this._tvId, seasonNumber, episodeNumber);
                } else {
                    userMoviesService.markEpisodeAsUnwatched(this._tvId, seasonNumber, episodeNumber);
                }

                // Отправляем событие для автоматических переходов
                document.dispatchEvent(new CustomEvent('episode-checkbox-changed', {
                    bubbles: true,
                    composed: true,
                    detail: {
                        tvId: this._tvId,
                        seasonNumber,
                        episodeNumber,
                        checked: checkbox.checked,
                        isLastUnwatched,
                        wasAllWatched,
                        isBulkOperation: false
                    }
                }));

                // Обновляем кнопки сезона
                this._updateSeasonActions(seasonNumber);
            });
        });
    }

    _setupActionButtons(seasonNumber, totalEpisodes) {
        // Кнопка "Mark as Watched"
        const watchedBtn = this.shadowRoot.querySelector('.mark-watched-button');
        if (watchedBtn) {
            watchedBtn.addEventListener('click', () => {
                haptic.medium();
                this._markSeasonWatched(seasonNumber, totalEpisodes);
            });
        }

        // Кнопка "Mark as Unwatched"
        const unwatchedBtn = this.shadowRoot.querySelector('.mark-unwatched-button');
        if (unwatchedBtn) {
            unwatchedBtn.addEventListener('click', () => {
                haptic.medium();
                this._markSeasonUnwatched(seasonNumber);
            });
        }

        // Кнопка "Rate Season"
        const rateBtn = this.shadowRoot.querySelector('.rate-season-button');
        if (rateBtn) {
            rateBtn.addEventListener('click', () => {
                haptic.light();
                this._openReviewDialog(seasonNumber);
            });
        }
    }

    _markSeasonWatched(seasonNumber, totalEpisodes) {
        // Отмечаем все эпизоды
        for (let i = 1; i <= totalEpisodes; i++) {
            userMoviesService.markEpisodeAsWatched(this._tvId, seasonNumber, i);
        }

        // Обновляем чекбоксы
        this.shadowRoot.querySelectorAll('md-checkbox').forEach(checkbox => {
            checkbox.checked = true;
            const episodeItem = checkbox.closest('.episode-item');
            const dot = episodeItem.querySelector('.unwatched-dot');
            if (dot) dot.remove();
        });

        // Проверяем, все ли эпизоды всех сезонов теперь отмечены
        const allEpisodesWatched = this._checkIfAllEpisodesWatched();

        // Отправляем событие с информацией о состоянии
        document.dispatchEvent(new CustomEvent('season-marked-watched', {
            bubbles: true,
            composed: true,
            detail: { 
                tvId: this._tvId, 
                allEpisodesWatched 
            }
        }));

        // Обновляем кнопки
        this._updateSeasonActions(seasonNumber);
    }

    _markSeasonUnwatched(seasonNumber) {
        // Проверяем состояние ДО снятия отметок
        const wasAllWatched = this._checkIfAllEpisodesWatched();

        // Снимаем отметки со всех эпизодов
        userMoviesService.markSeasonAsUnwatched(this._tvId, seasonNumber);

        // Обновляем чекбоксы
        this.shadowRoot.querySelectorAll('md-checkbox').forEach(checkbox => {
            checkbox.checked = false;
            const episodeItem = checkbox.closest('.episode-item');
            const numberEl = episodeItem.querySelector('.episode-number');
            if (!numberEl.querySelector('.unwatched-dot')) {
                numberEl.innerHTML += '<span class="unwatched-dot"></span>';
            }
        });

        // Проверяем, есть ли хоть один просмотренный эпизод после снятия отметок
        const hasAnyWatchedEpisodes = this._checkIfHasAnyWatchedEpisodes();

        // Отправляем событие с информацией о состоянии
        document.dispatchEvent(new CustomEvent('season-marked-unwatched', {
            bubbles: true,
            composed: true,
            detail: { 
                tvId: this._tvId, 
                wasAllWatched,
                hasAnyWatchedEpisodes
            }
        }));

        // Обновляем кнопки
        this._updateSeasonActions(seasonNumber);
    }

    _updateSeasonActions(seasonNumber) {
        const season = this._seasons.find(s => s.season_number === seasonNumber);
        if (!season) return;

        const isFullyWatched = userMoviesService.isSeasonFullyWatched(
            this._tvId,
            seasonNumber,
            season.episodes.length
        );
        const hasReview = userMoviesService.getSeasonReview(this._tvId, seasonNumber);

        const actionsContainer = this.shadowRoot.querySelector('.season-actions');
        if (actionsContainer) {
            actionsContainer.innerHTML = this._getSeasonActionsHTML(isFullyWatched, hasReview)
                .replace('<div class="season-actions">', '')
                .replace('</div>', '');
            
            // Переустанавливаем обработчики
            this._setupActionButtons(seasonNumber, season.episodes.length);
        }
    }

    _openReviewDialog(seasonNumber) {
        const dialog = document.createElement('review-dialog');
        dialog.setAttribute('season-number', seasonNumber);
        dialog.setAttribute('tv-id', this._tvId);

        const seasonInfo = {
            ...this._seasons.find(s => s.season_number === seasonNumber),
            name: this._tvShow?.name || '',
            media_type: 'tv_season'
        };

        const existingReview = userMoviesService.getSeasonReview(this._tvId, seasonNumber);
        if (existingReview) {
            dialog.review = existingReview;
            dialog.isEdit = true;
        }

        dialog.movie = seasonInfo;

        dialog.addEventListener('review-submitted', (e) => {
            userMoviesService.saveSeasonReview(this._tvId, seasonNumber, e.detail.review);
            this._updateSeasonActions(seasonNumber);
        });

        document.body.appendChild(dialog);
    }

    _handleTvAction(e) {
        if (this._tvId !== e.detail.tvId) return;

        switch (e.detail.action) {
            case 'mark-all-watched':
                this._markAllSeasonsWatched();
                break;
            case 'mark-all-unwatched':
                this._markAllSeasonsUnwatched();
                break;
            case 'clear-all-seasons':
                this._clearAllSeasons();
                break;
        }
    }

    _markAllSeasonsWatched() {
        haptic.medium();

        this._seasons.forEach(season => {
            if (season.season_number === 0) return;
            season.episodes?.forEach(episode => {
                userMoviesService.markEpisodeAsWatched(
                    this._tvId,
                    season.season_number,
                    episode.episode_number
                );
            });
        });

        // Обновляем текущий сезон
        this._showSeason(this._currentSeasonNumber);
    }

    _markAllSeasonsUnwatched() {
        haptic.medium();

        this._seasons.forEach(season => {
            if (season.season_number === 0) return;
            userMoviesService.markSeasonAsUnwatched(this._tvId, season.season_number);
        });

        // Обновляем текущий сезон
        this._showSeason(this._currentSeasonNumber);
    }

    _clearAllSeasons() {
        haptic.light();

        this._seasons.forEach(season => {
            if (season.season_number === 0) return;
            userMoviesService.markSeasonAsUnwatched(this._tvId, season.season_number);
        });

        // Обновляем текущий сезон
        this._showSeason(this._currentSeasonNumber);
    }

    _checkIfAllEpisodesWatched() {
        if (!this._seasons) return false;

        return this._seasons.every(season => {
            if (season.season_number === 0) return true;
            const totalEpisodes = season.episodes?.length;
            if (!totalEpisodes) return true;

            return userMoviesService.isSeasonFullyWatched(
                this._tvId,
                season.season_number,
                totalEpisodes
            );
        });
    }

    _checkIfLastUnwatchedEpisode(currentSeasonNumber, currentEpisodeNumber) {
        if (!this._seasons) return false;

        let unwatchedCount = 0;

        this._seasons.forEach(season => {
            if (season.season_number === 0) return;

            season.episodes?.forEach(episode => {
                // Пропускаем текущий эпизод, который мы отмечаем
                if (season.season_number === currentSeasonNumber &&
                    episode.episode_number === currentEpisodeNumber) {
                    return;
                }

                const isWatched = userMoviesService.isEpisodeWatched(
                    this._tvId,
                    season.season_number,
                    episode.episode_number
                );

                if (!isWatched) {
                    unwatchedCount++;
                }
            });
        });

        return unwatchedCount === 0;
    }

    _checkIfHasAnyWatchedEpisodes() {
        if (!this._seasons) return false;

        return this._seasons.some(season => {
            if (season.season_number === 0) return false;

            return season.episodes?.some(episode => {
                return userMoviesService.isEpisodeWatched(
                    this._tvId,
                    season.season_number,
                    episode.episode_number
                );
            });
        });
    }
}

customElements.define('tv-seasons', TVSeasons);
