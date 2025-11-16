import '@material/web/button/filled-tonal-button.js';
import { supabaseProfileService } from '../../services/supabase-profile-service.js';
import { TG, haptic } from '../../config/telegram.js';
import { navigationManager } from '../../config/navigation.js';
import { i18n } from '../../services/i18n.js';

export class FollowersFollowingPage extends HTMLElement {
    static get observedAttributes() {
        return ['user-id', 'active-tab'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._userId = null;
        this._activeTab = 'following'; // 'following' или 'followers'
        this._following = [];
        this._followers = [];
        this._isLoading = false;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'user-id' && newValue !== oldValue) {
            this._userId = newValue;
            if (this._initialized) {
                this._loadData();
            }
        } else if (name === 'active-tab' && newValue !== oldValue && ['following', 'followers'].includes(newValue)) {
            this._activeTab = newValue;
            if (this._initialized) {
                this.render();
            }
        }
    }

    async connectedCallback() {
        if (this._initialized) return;
        this._initialized = true;

        const userIdAttr = this.getAttribute('user-id');
        if (userIdAttr) {
            this._userId = userIdAttr;
        } else {
            // Если не указан, используем текущего пользователя
            this._userId = TG?.initDataUnsafe?.user?.id || sessionStorage.getItem('user_id');
        }

        const activeTabAttr = this.getAttribute('active-tab');
        if (activeTabAttr && ['following', 'followers'].includes(activeTabAttr)) {
            this._activeTab = activeTabAttr;
        }

        await this._loadData();
        this.render();
        this._setupEventListeners();
    }

    async _loadData() {
        if (!this._userId) return;

        this._isLoading = true;
        try {
            const [following, followers] = await Promise.all([
                supabaseProfileService.getFollowing(this._userId),
                supabaseProfileService.getFollowers(this._userId)
            ]);

            // Преобразуем данные following
            this._following = following.map(f => ({
                id: f.following_id,
                user_id: f.following_id,
                username: f.users?.username,
                first_name: f.users?.first_name,
                last_name: f.users?.last_name,
                avatar_url: f.users?.avatar_url || null,
                name: f.users?.first_name || f.users?.username || 'Unknown'
            }));

            // Преобразуем данные followers
            this._followers = followers.map(f => ({
                id: f.follower_id,
                user_id: f.follower_id,
                username: f.users?.username,
                first_name: f.users?.first_name,
                last_name: f.users?.last_name,
                avatar_url: f.users?.avatar_url || null,
                name: f.users?.first_name || f.users?.username || 'Unknown'
            }));
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        } finally {
            this._isLoading = false;
        }
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
                    this.setAttribute('active-tab', newTab);
                    this.render();
                    // Обновляем состояние навигации
                    const currentState = navigationManager.getCurrentState();
                    if (currentState?.type === 'followers_following') {
                        currentState.activeTab = newTab;
                        window.history.replaceState(currentState, '', window.location);
                    }
                }
            });
        });

        // Обработка кликов по пользователям
        this.shadowRoot.addEventListener('click', (e) => {
            const userItem = e.target.closest('.user-item');
            if (userItem) {
                haptic.light();
                const userId = userItem.dataset.userId;
                if (userId) {
                    // Получаем ID текущего пользователя
                    const currentUserId = TG?.initDataUnsafe?.user?.id || sessionStorage.getItem('user_id');
                    
                    // Если кликнули на себя, переходим на свой профиль (таб профиля)
                    if (userId === currentUserId) {
                        navigationManager.navigateToTab('profile');
                    } else {
                        navigationManager.navigateToUserProfile(userId);
                    }
                }
            }
        });
    }

    render() {
        const currentList = this._activeTab === 'following' ? this._following : this._followers;
        const followingCount = this._following.length;
        const followersCount = this._followers.length;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    height: 100%;
                    box-sizing: border-box;
                }

                .container {
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    height: 100%;
                    background: var(--md-sys-color-surface);
                }

                .tabs-container {
                    display: flex;
                    padding: 16px;
                    gap: 8px;
                }

                .tab {
                    flex: 1;
                    --md-filled-tonal-button-container-color: rgba(255, 255, 255, 0.0);
                    --md-filled-tonal-button-label-text-color: var(--md-sys-color-on-surface);
                    --md-filled-tonal-button-hover-label-text-color: var(--md-sys-color-on-surface);
                    --md-filled-tonal-button-pressed-label-text-color: var(--md-sys-color-on-surface);
                    --md-filled-tonal-button-container-shape: 1000px;
                    --md-filled-tonal-button-label-text-font: 600 14px sans-serif;
                    --md-filled-tonal-button-container-height: 40px;
                    --md-filled-tonal-button-focus-label-text-color: var(--md-sys-color-on-surface);
                    cursor: pointer;
                }

                .tab.active {
                    --md-filled-tonal-button-container-color: var(--md-sys-color-surface-container-low);
                }

                .users-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px 16px;
                }

                .user-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    border-radius: 16px;
                    background: var(--md-sys-color-surface-container-low);
                    margin-bottom: 8px;
                    cursor: pointer;
                    transition: transform 0.2s ease, background 0.2s ease;
                    will-change: transform;
                }

                .user-item:active {
                    transform: scale(0.98);
                    background: var(--md-sys-color-surface-container);
                }

                @media (hover: hover) {
                    .user-item:hover {
                        background: var(--md-sys-color-surface-container);
                    }
                }

                .user-avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    overflow: hidden;
                    background: var(--md-sys-color-surface-container);
                    flex-shrink: 0;
                }

                .user-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .user-avatar-placeholder {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #FF6B6B, #4ECDC4);
                    color: white;
                    font-size: 20px;
                    font-weight: 600;
                }

                .user-info {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    min-width: 0;
                }

                .user-name {
                    color: var(--md-sys-color-on-surface);
                    font-size: 16px;
                    font-weight: 600;
                    line-height: 20px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .user-username {
                    color: var(--md-sys-color-outline);
                    font-size: 14px;
                    line-height: 18px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 48px 16px;
                    gap: 8px;
                    text-align: center;
                    height: 100%;
                }

                .empty-state-title {
                    color: var(--md-sys-color-on-surface);
                    font-size: 22px;
                    font-weight: 600;
                    line-height: 28px;
                }

                .empty-state-description {
                    color: var(--md-sys-color-outline);
                    font-size: 14px;
                    line-height: 20px;
                }

                .loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 48px;
                    color: var(--md-sys-color-outline);
                }
            </style>

            <div class="container">
                <div class="tabs-container">
                    <md-filled-tonal-button 
                        class="tab ${this._activeTab === 'following' ? 'active' : ''}"
                        data-tab="following">
                        ${i18n.t('following')} ${followingCount}
                    </md-filled-tonal-button>
                    <md-filled-tonal-button 
                        class="tab ${this._activeTab === 'followers' ? 'active' : ''}"
                        data-tab="followers">
                        ${i18n.t('followers')} ${followersCount}
                    </md-filled-tonal-button>
                </div>

                <div class="users-list">
                    ${this._isLoading ? this._renderLoading() : this._renderUsersList(currentList)}
                </div>
            </div>
        `;

        this._setupEventListeners();
    }

    _renderLoading() {
        return '<div class="loading">Загрузка...</div>';
    }

    _renderUsersList(users) {
        if (!users || users.length === 0) {
            const emptyMessage = this._activeTab === 'following' 
                ? (i18n.t('followingListEmpty') || 'Нет подписок')
                : (i18n.t('followersListEmpty') || 'Нет подписчиков');
            return `
                <div class="empty-state">
                    <div class="empty-state-title">${emptyMessage}</div>
                </div>
            `;
        }

        return users.map(user => {
            const name = user.name || 'Unknown';
            const username = user.username ? `@${user.username}` : '';
            const initial = name.charAt(0).toUpperCase();
            const avatarUrl = user.avatar_url;

            return `
                <div class="user-item" data-user-id="${user.user_id}">
                    <div class="user-avatar">
                        ${avatarUrl 
                            ? `<img src="${avatarUrl}" alt="${name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                               <div class="user-avatar-placeholder" style="display: none;">${initial}</div>`
                            : `<div class="user-avatar-placeholder">${initial}</div>`
                        }
                    </div>
                    <div class="user-info">
                        <div class="user-name">${name}</div>
                        ${username ? `<div class="user-username">${username}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
}

customElements.define('followers-following-page', FollowersFollowingPage);

