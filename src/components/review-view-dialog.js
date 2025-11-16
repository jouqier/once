import { haptic } from '../config/telegram.js';
import { scrollLock } from '../utils/scroll.js';
import { i18n } from '../services/i18n.js';
import { navigationManager } from '../config/navigation.js';

export class ReviewViewDialog extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._review = null;
        this._movie = null;
    }

    connectedCallback() {
        scrollLock.enable();
        navigationManager.pushModal(this);
        this.render();
        this._setupEventListeners();
    }

    disconnectedCallback() {
        scrollLock.disable();
        navigationManager.removeModal(this);
    }

    set review(value) {
        this._review = value;
        this.render();
    }

    set movie(value) {
        this._movie = value;
        this.render();
    }

    _getRatingStars(rating) {
        return Array(10).fill('★')
            .map((star, index) => `
                <span style="color: ${index < rating ? 'var(--md-sys-color-on-surface)' : 'var(--md-sys-color-outline)'}">
                    ${star}
                </span>
            `).join('');
    }

    render() {
        if (!this._review || !this._movie) return;

        const reviewUser = this._review.user || {};
        const reviewUserName = reviewUser.first_name || reviewUser.username || i18n.t('user');
        const reviewUserPhoto = reviewUser.avatar_url || null;
        const reviewUserInitial = reviewUserName.charAt(0).toUpperCase();
        const reviewText = this._review.review || this._review.text || '';
        const userId = reviewUser.user_id;

        this.shadowRoot.innerHTML = `
            <style>
                .overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 1000;
                    animation: fadeIn 0.2s ease-out;
                }
                
                .dialog {
                    position: fixed;
                    bottom: env(safe-area-inset-bottom);
                    left: 0;
                    right: 0;
                    background: var(--md-sys-color-surface-container-high);
                    border-radius: 40px 40px 0 0;
                    margin: 0;
                    z-index: 1001;
                    animation: slideUp 0.3s ease-out;
                    max-height: 90vh;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                }

                .review-content {
                    display: flex;
                    flex-direction: column;
                    padding: 24px;
                    gap: 16px;
                }

                .review-header {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 999px;
                    overflow: hidden;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                    flex-shrink: 0;
                }
                    
                .avatar:active {
                    transform: scale(0.95);
                }

                .avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .avatar-placeholder {
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(45deg, #7C3AED, #EC4899);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 600;
                    font-size: 20px;
                }

                .user-info {
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                    min-width: 0;
                }

                .username {
                    color: var(--md-sys-color-on-surface);
                    font-size: 16px;
                    font-style: normal;
                    font-weight: 600;
                    line-height: 24px;
                    cursor: pointer;
                    transition: opacity 0.2s ease;
                }
                    
                .username:active {
                    opacity: 0.7;
                }

                .rating-stars {
                    font-size: 16px;
                    letter-spacing: -2px;
                    margin-top: 4px;
                }

                .review-text {
                    color: var(--md-sys-color-on-surface);
                    font-size: 14px;
                    font-style: normal;
                    font-weight: 600;
                    line-height: 20px;
                    margin: 0;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }

                .close-button {
                    width: 100%;
                    height: 48px;
                    border-radius: 24px;
                    background: var(--md-sys-color-primary-container);
                    color: var(--md-sys-color-on-primary-container);
                    border: none;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: opacity 0.2s ease;
                    margin-top: 8px;
                }

                .close-button:active {
                    opacity: 0.7;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            </style>

            <div class="overlay">
                <div class="dialog">
                    <div class="review-content">
                        <div class="review-header ${userId ? 'clickable' : ''}" ${userId ? `data-user-id="${userId}"` : ''}>
                            <div class="avatar">
                                ${reviewUserPhoto 
                                    ? `<img src="${reviewUserPhoto}" alt="${reviewUserName}">`
                                    : `<div class="avatar-placeholder">${reviewUserInitial}</div>`
                                }
                            </div>
                            <div class="user-info">
                                <div class="username">${reviewUserName}</div>
                                <div class="rating-stars">${this._getRatingStars(this._review.rating)}</div>
                            </div>
                        </div>
                        <div class="review-text">${reviewText}</div>
                        <button class="close-button">${i18n.t('close')}</button>
                    </div>
                </div>
            </div>
        `;

        this._setupEventListeners();
    }

    _setupEventListeners() {
        const overlay = this.shadowRoot.querySelector('.overlay');
        overlay.addEventListener('click', (e) => {
            if (e.target.classList.contains('overlay')) {
                haptic.light();
                this.remove();
            }
        });

        const closeButton = this.shadowRoot.querySelector('.close-button');
        closeButton.addEventListener('click', () => {
            haptic.light();
            this.remove();
        });

        // Обработчик клика на review-header для перехода к профилю пользователя
        const reviewHeader = this.shadowRoot.querySelector('.review-header.clickable');
        if (reviewHeader) {
            reviewHeader.addEventListener('click', () => {
                const userId = reviewHeader.dataset.userId;
                if (userId) {
                    haptic.light();
                    this.remove();
                    navigationManager.navigateToUserProfile(userId);
                }
            });
        }
    }
}

customElements.define('review-view-dialog', ReviewViewDialog);

