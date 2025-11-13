import { API_CONFIG } from '../../config/api.js';
import { TG, haptic } from '../../config/telegram.js';
import { userMoviesService } from '../../services/user-movies.js';
import { userFollowingService } from '../../services/user-following.js';
import { i18n } from '../../services/i18n.js';
import { navigationManager } from '../../config/navigation.js';
import './profile-avatar.js';
import './profile-stats.js';
import './profile-page.js';
import '../../components/media-poster.js';

export class ProfileScreen extends HTMLElement {
    static get observedAttributes() {
        return ['active-tab', 'tabs-scroll-position'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._userData = null;
        this._activeTab = 'want';
        this._initialized = false;
        this._stats = {
            place: 481516,
            following: 0,
            followers: 42,
            want: 0,
            watched: 0,
            tvShows: 0
        };

        // Добавляем маппинг действий
        this._actionMappings = {
            want: 'movies',
            watched: 'movies',
            tvshows: 'tv',
            following: 'search'
        };
        
        // Сохраняем bound функции для правильной очистки слушателей
        this._boundHandlers = {
            reviewSubmitted: this._handleReviewSubmitted.bind(this),
            seasonReviewSubmitted: this._handleSeasonReviewSubmitted.bind(this),
            episodeStatusChanged: this._handleEpisodeStatusChanged.bind(this),
            followingListChanged: this._handleFollowingListChanged.bind(this)
        };
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'active-tab' && newValue && ['want', 'watched', 'tvshows', 'following'].includes(newValue)) {
            if (this._activeTab !== newValue) {
                this._activeTab = newValue;
                // Если компонент уже инициализирован, обновляем UI
                if (this._initialized) {
                    this._updateActiveTab();
                }
            }
        } else if (name === 'tabs-scroll-position' && newValue !== null) {
            // Восстанавливаем позицию скролла если компонент уже инициализирован
            if (this._initialized) {
                this._restoreTabsScrollPosition();
            }
        }
    }

    async connectedCallback() {
        if (this._initialized) return;
        
        this._initialized = true;
        
        // Восстанавливаем состояние из атрибутов (переданных из навигации)
        const activeTabAttr = this.getAttribute('active-tab');
        if (activeTabAttr && ['want', 'watched', 'tvshows', 'following'].includes(activeTabAttr)) {
            this._activeTab = activeTabAttr;
        }
        
        // Добавляем слушатели при подключении
        document.addEventListener('review-submitted', this._boundHandlers.reviewSubmitted);
        document.addEventListener('season-review-submitted', this._boundHandlers.seasonReviewSubmitted);
        document.addEventListener('episode-status-changed', this._boundHandlers.episodeStatusChanged);
        document.addEventListener('following-list-changed', this._boundHandlers.followingListChanged);
        
        // Запрашиваем обновленные данные пользователя
        document.dispatchEvent(new CustomEvent('tg-user-data-updated'));
        
        this._userData = TG?.initDataUnsafe?.user || null;
        await this.loadStats();
        this.render();
        this._setupEventListeners();
    }

    disconnectedCallback() {
        // Удаляем слушатели при отключении компонента
        document.removeEventListener('review-submitted', this._boundHandlers.reviewSubmitted);
        document.removeEventListener('season-review-submitted', this._boundHandlers.seasonReviewSubmitted);
        document.removeEventListener('episode-status-changed', this._boundHandlers.episodeStatusChanged);
        document.removeEventListener('following-list-changed', this._boundHandlers.followingListChanged);
    }

    async _handleReviewSubmitted(event) {
        const movieId = event.detail.movieId;
        const review = event.detail.review;
        
        // Обновляем постер, если он есть на странице
        await this._updatePosterRating(movieId, review?.rating);
    }

    async _handleSeasonReviewSubmitted(event) {
        const tvId = event.detail.tvId;
        
        // Обновляем постер, если он есть на странице
        await this._updateShowPoster(tvId);
    }

    async _handleEpisodeStatusChanged(event) {
        const tvId = event.detail.tvId;
        
        // Обновляем постер, если он есть на странице
        await this._updateShowPoster(tvId);
    }

    async _handleFollowingListChanged(event) {
        // Обновляем счетчик подписок
        const followingCount = userFollowingService.getFollowingCount();
        this._stats.following = followingCount;
        
        // Обновляем счетчик в табе
        const followingTab = this.shadowRoot.querySelector('.tab[data-tab="following"]');
        if (followingTab) {
            const count = followingTab.querySelector('.tab-count');
            if (count) {
                count.textContent = followingCount;
            }
        }

        // Если мы на табе "Following", обновляем контент
        if (this._activeTab === 'following') {
            await this._initializeContent();
        }
    }

    async _updatePosterRating(movieId, rating) {
        // Обновляем постеры в текущей вкладке
        const allCards = this.shadowRoot.querySelectorAll(`[data-id="${movieId}"][data-type="movie"]`);
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
        
        // Обновляем постеры в текущей вкладке
        const allCards = this.shadowRoot.querySelectorAll(`[data-id="${tvId}"][data-type="tv"]`);
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

    async loadStats() {
        // Получаем списки фильмов (только ID для подсчета)
        const moviesWant = userMoviesService.getWantList() || [];
        const moviesWatched = userMoviesService.getWatchedList() || [];

        // Получаем списки сериалов (только ID для подсчета)
        const tvWant = userMoviesService.getTVShowWantList() || [];
        const tvWatching = userMoviesService.getTVShowWatchingList() || [];
        const tvWatched = userMoviesService.getTVShowWatchedList() || [];

        // Объединяем все ID сериалов и удаляем дубликаты
        const allTVShowIds = [...new Set([...tvWant, ...tvWatching, ...tvWatched])];

        // Получаем количество подписок на персон
        const followingCount = userFollowingService.getFollowingCount();

        // Обновляем статистику
        this._stats = {
            place: 481516,
            following: followingCount,
            followers: 42,
            want: moviesWant.length,
            watched: moviesWatched.length,
            tvShows: allTVShowIds.length
        };
    }

    _setupEventListeners() {
        // Обработка кликов по табам
        const tabs = this.shadowRoot.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const newTab = tab.dataset.tab;
                if (this._activeTab !== newTab) {
                    haptic.light();
                    this._activeTab = newTab;
                    tabs.forEach(t => {
                        t.classList.toggle('active', t.dataset.tab === newTab);
                    });
                    this._saveProfileState();
                    this._initializeContent();
                }
            });
        });
        
        // Сохраняем позицию скролла табов при прокрутке
        const tabsListWrapper = this.shadowRoot.querySelector('.tabs-list-wrapper');
        if (tabsListWrapper) {
            tabsListWrapper.addEventListener('scroll', () => {
                this._saveProfileState();
            });
        }

        // Делегирование событий только для кнопок действий
        this.shadowRoot.addEventListener('click', (e) => {
            const actionButton = e.target.closest('.action-button');
            if (actionButton) {
                const action = actionButton.dataset.action;
                this.dispatchEvent(new CustomEvent('tab-changed', {
                    detail: { tab: action },
                    bubbles: true,
                    composed: true
                }));
            }
        });

        this._setupMovieItemListeners();
    }

    // Добавляем новый метод для установки слушателей на элементы фильмов
    _setupMovieItemListeners() {
        // Находим все элементы с постерами
        const movieItems = this.shadowRoot.querySelectorAll('.movie-item');
        
        movieItems.forEach(item => {
            item.addEventListener('click', () => {
                haptic.light();
                
                const id = item.dataset.id;
                const type = item.dataset.type;
                
                // Сохраняем состояние профиля перед переходом
                this._saveProfileState();
                
                // Диспатчим событие для навигации
                this.dispatchEvent(new CustomEvent('movie-selected', {
                    detail: { 
                        movieId: id, 
                        type: type 
                    },
                    bubbles: true,
                    composed: true
                }));
            });

            // Добавляем стили для интерактивности
            item.style.cursor = 'pointer';
            item.addEventListener('mousedown', () => {
                item.style.transform = 'scale(0.95)';
            });
            
            item.addEventListener('mouseup', () => {
                item.style.transform = 'scale(1)';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.transform = 'scale(1)';
            });
        });

        // Находим все элементы персон
        const personItems = this.shadowRoot.querySelectorAll('.person-item');
        
        personItems.forEach(item => {
            item.addEventListener('click', () => {
                haptic.light();
                
                const personId = item.dataset.personId;
                
                // Сохраняем состояние профиля перед переходом
                this._saveProfileState();
                
                // Диспатчим событие для навигации к персоне
                this.dispatchEvent(new CustomEvent('person-selected', {
                    detail: { 
                        personId: personId
                    },
                    bubbles: true,
                    composed: true
                }));
            });
        });
    }

    render() {
        const profileHeader = `<profile-avatar></profile-avatar>`;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    width: 100%;
                    box-sizing: border-box;
                }

                .content {
                    display: flex;
                    /* padding: 8px 0px; */
                    flex-direction: column;
                    align-items: flex-start;
                    align-self: stretch;
                    border-radius: 36px;
                    /* background: var(--md-sys-color-surface); */
                    overflow: hidden;
                }   

                .movies-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 8px;
                    padding: 8px 16px;
                }

                .people-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 16px;
                    padding: 16px;
                }

                .person-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                    will-change: transform;
                }

                .person-item:active {
                    transform: scale(0.95);
                }

                @media (hover: hover) {
                    .person-item:hover {
                        transform: scale(1.05);
                    }
                }

                .person-avatar {
                    width: 100%;
                    aspect-ratio: 1;
                    border-radius: 50%;
                    overflow: hidden;
                    background: var(--md-sys-color-surface-container);
                }

                .person-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .person-avatar-placeholder {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #FF6B6B, #4ECDC4);
                    color: white;
                    font-size: 32px;
                    font-weight: 600;
                }

                .person-name {
                    color: var(--md-sys-color-on-surface);
                    text-align: center;
                    font-size: 12px;
                    font-weight: 600;
                    line-height: 16px;
                    width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                }
                
                .tab-content {
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
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
                    background: linear-gradient(to right, var(--md-sys-color-scrim), transparent);
                }
                
                .tabs-container::after {
                    right: 0;
                    background: linear-gradient(to left, var(--md-sys-color-scrim), transparent);
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
                
                .empty-state {
                    display: flex;
                    flex: auto;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 48px 16px;
                    gap: 8px;
                    text-align: center;
                }
                
                .empty-state-title {
                    color: var(--md-sys-color-on-surface);
                    font-size: 22px;
                    font-style: normal;
                    font-weight: 600;
                    line-height: 28px;
                }

                .empty-state-description {
                    color: var(--md-sys-color-outline);
                    font-size: 12px;
                    font-style: normal;
                    font-weight: 600;
                    line-height: 16px;
                    margin-bottom: 24px;
                }
                
                .action-button {
                    --md-filled-tonal-button-container-color: var(--md-sys-color-surface-container);
                    --md-filled-tonal-button-label-text-color: var(--md-sys-color-on-surface);
                }
                
                .movie-item {
                    aspect-ratio: 2/3;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                    will-change: transform;
                }
                
                .movie-item:active {
                    transform: scale(0.95);
                }

                @media (hover: hover) {
                    .movie-item:hover {
                        transform: scale(1.02);
                    }
                }
                
                .show-progress {
                    color: var(--md-sys-color-outline);
                    font-size: 12px;
                    line-height: 16px;
                    text-align: center;
                }

                .tab-count {
                    margin-left: 4px;
                    color: var(--md-sys-color-outline);
                }
            </style>

            ${profileHeader}

        <!--    <profile-stats
                place="${this._stats.place}"
                following="${this._stats.following}"
                followers="${this._stats.followers}">
            </profile-stats> -->

            <div class="content">
                <div class="tabs-container">
                    <div class="tabs-list-wrapper">
                        <div class="tabs-list">
                            <md-filled-tonal-button 
                                class="tab ${this._activeTab === 'want' ? 'active' : ''}"
                                data-tab="want">
                                ${i18n.t('want')}
                                <span class="tab-count">${this._stats.want}</span>
                            </md-filled-tonal-button>
                            <md-filled-tonal-button 
                                class="tab ${this._activeTab === 'watched' ? 'active' : ''}"
                                data-tab="watched">
                                ${i18n.t('watched')}
                                <span class="tab-count">${this._stats.watched}</span>
                            </md-filled-tonal-button>
                            <md-filled-tonal-button 
                                class="tab ${this._activeTab === 'tvshows' ? 'active' : ''}"
                                data-tab="tvshows">
                                ${i18n.t('tvShows')}
                                <span class="tab-count">${this._stats.tvShows}</span>
                            </md-filled-tonal-button>
                            <md-filled-tonal-button 
                                class="tab ${this._activeTab === 'following' ? 'active' : ''}"
                                data-tab="following">
                                ${i18n.t('following')}
                                <span class="tab-count">${this._stats.following}</span>
                            </md-filled-tonal-button>
                            <div style="padding-right: 8px; flex-shrink: 0;">&nbsp;</div>
                        </div>
                    </div>
                </div>
                <div class="tab-content">
                    ${this._renderContent()}
                </div>
            </div>
        `;

        const profileAvatar = this.shadowRoot.querySelector('profile-avatar');
        profileAvatar.userData = this._userData;

        this._initializeContent();
        this._setupEventListeners();
        
        // Восстанавливаем позицию скролла табов после полного рендера
        // Используем двойной requestAnimationFrame для гарантии полного рендера
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this._restoreTabsScrollPosition();
            });
        });
    }

    async _initializeContent() {
        const contentContainer = this.shadowRoot.querySelector('.tab-content');
        if (contentContainer) {
            const content = await this._renderContent();
            contentContainer.innerHTML = content;
            this._setupMovieItemListeners(); // Добавляем установку слушателей после рендера контента
        }
    }

    async _renderContent() {
        const activeTab = this._activeTab.toLowerCase();
        
        // Получаем списки фильмов с полными данными
        const moviesWant = await userMoviesService.getMoviesWithDetails('want') || [];
        const moviesWatched = await userMoviesService.getMoviesWithDetails('watched') || [];
        
        // Получаем списки сериалов с полными данными
        const tvWant = await userMoviesService.getTVShowsWithDetails('want') || [];
        const tvWatching = await userMoviesService.getTVShowsWithDetails('watching') || [];
        const tvWatched = await userMoviesService.getTVShowsWithDetails('watched') || [];
        
        // Получаем список подписанных персон с полными данными
        const following = await userFollowingService.getFollowingWithDetails() || [];
        
        // Формируем списки для отображения
        const lists = {
            want: moviesWant,
            watched: moviesWatched,
            tvshows: [...tvWant, ...tvWatching, ...tvWatched]
                .filter((item, index, self) => 
                    index === self.findIndex((t) => t.id === item.id)
                ),
            following: following
        };

        // Обновляем статистику
        const newStats = {
            ...this._stats,
            want: lists.want.length,
            watched: lists.watched.length,
            tvShows: lists.tvshows.length,
            following: lists.following.length
        };

        // Обновляем счетчики если изменились
        if (JSON.stringify(this._stats) !== JSON.stringify(newStats)) {
            this._updateStats(newStats);
        }

        const currentList = lists[activeTab];
        if (!currentList || currentList.length === 0) {
            return this._renderEmptyState(activeTab);
        }

        // Для персон используем свой рендеринг
        if (activeTab === 'following') {
            return this._renderFollowingList(currentList);
        }

        // Сортируем список от новых к старым (обращаем порядок)
        const sortedList = [...currentList].reverse();

        // Рендерим все элементы асинхронно
        const renderedItems = await Promise.all(
            sortedList.map(item => this._renderMediaItem(item))
        );

        return `
            <div class="movies-grid">
                ${renderedItems.join('')}
            </div>
        `;
    }

    async _renderMediaItem(item) {
        let userRating = null;
        let progress = null;

        if (item.media_type === 'tv') {
            // Для сериалов получаем только прогресс, рейтинг не показываем
            progress = await userMoviesService.getShowProgress(item.id);
        } else {
            // Для фильмов получаем рейтинг
            const userReview = userMoviesService.getReview('movie', item.id);
            userRating = userReview?.rating;
        }

        // Убеждаемся, что progress полностью разрешен
        const watchedEpisodes = progress?.watchedEpisodes || 0;
        const totalEpisodes = progress?.totalEpisodes || 0;

        return `
            <div class="movie-item" 
                 data-id="${item.id}" 
                 data-type="${item.media_type}">
                <media-poster
                    src="${API_CONFIG.IMAGE_BASE_URL}${item.poster_path}"
                    alt="${item.title || item.name}"
                    ${progress ? `
                        watched-episodes="${watchedEpisodes}"
                        total-episodes="${totalEpisodes}"
                    ` : ''}
                    ${userRating ? `user-rating="${userRating}"` : ''}
                ></media-poster>
            </div>
        `;
    }

    _renderFollowingList(persons) {
        const personItems = persons.map(person => {
            const initial = person.name?.charAt(0).toUpperCase() || '?';
            const imageUrl = person.profile_path 
                ? `${API_CONFIG.IMAGE_BASE_URL}${person.profile_path}`
                : null;

            return `
                <div class="person-item" data-person-id="${person.id}">
                    <div class="person-avatar">
                        ${imageUrl 
                            ? `<img src="${imageUrl}" alt="${person.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                               <div class="person-avatar-placeholder" style="display: none;">${initial}</div>`
                            : `<div class="person-avatar-placeholder">${initial}</div>`
                        }
                    </div>
                    <div class="person-name">${person.name}</div>
                </div>
            `;
        }).join('');

        return `
            <div class="people-grid">
                ${personItems}
            </div>
        `;
    }

    _renderEmptyState(activeTab) {
        const messages = {
            want: i18n.t('wantListEmpty'),
            watched: i18n.t('watchedListEmpty'),
            tvshows: i18n.t('tvShowsListEmpty'),
            following: i18n.t('followingListEmpty')
        };

        const descriptions = {
            want: i18n.t('startAddingToWant'),
            watched: i18n.t('startAddingToWatched'),
            tvshows: i18n.t('startAddingTVShows'),
            following: i18n.t('startAddingToFollowing')
        };

        const actions = {
            want: i18n.t('browseMovies'),
            watched: i18n.t('browseMovies'),
            tvshows: i18n.t('browseTVShows'),
            following: i18n.t('browseActors')
        };

        return `
            <div class="empty-state">
                <div class="empty-state-title">${messages[activeTab]}</div>
                <div class="empty-state-description">${descriptions[activeTab]}</div>
                <md-filled-tonal-button 
                    class="action-button"
                    data-action="${this._actionMappings[activeTab]}">
                    ${actions[activeTab]}
                </md-filled-tonal-button>
            </div>
        `;
    }

    _updateStats(newStats) {
        this._stats = newStats;
        this.shadowRoot.querySelectorAll('.tab').forEach(tab => {
            const count = tab.querySelector('.tab-count');
            if (count) {
                const tabName = tab.dataset.tab;
                let value;
                if (tabName === 'tvshows') {
                    value = this._stats.tvShows;
                } else {
                    value = this._stats[tabName];
                }
                count.textContent = value;
            }
        });
    }

    _saveProfileState() {
        const tabsListWrapper = this.shadowRoot.querySelector('.tabs-list-wrapper');
        const tabsScrollPosition = tabsListWrapper ? tabsListWrapper.scrollLeft : 0;
        navigationManager.updateProfileState(this._activeTab, tabsScrollPosition);
    }

    _updateActiveTab() {
        // Обновляем классы активности на табах
        const tabs = this.shadowRoot.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === this._activeTab);
        });
        // Обновляем контент
        this._initializeContent();
    }

    _restoreTabsScrollPosition() {
        const tabsScrollPositionAttr = this.getAttribute('tabs-scroll-position');
        if (tabsScrollPositionAttr !== null) {
            const scrollPosition = parseInt(tabsScrollPositionAttr, 10);
            if (!isNaN(scrollPosition)) {
                // Используем requestAnimationFrame для гарантии, что DOM полностью отрисован
                requestAnimationFrame(() => {
                    const tabsListWrapper = this.shadowRoot.querySelector('.tabs-list-wrapper');
                    if (tabsListWrapper) {
                        tabsListWrapper.scrollLeft = scrollPosition;
                    }
                });
            }
        }
    }
}

customElements.define('profile-screen', ProfileScreen); 