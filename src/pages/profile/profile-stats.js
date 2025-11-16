import { navigationManager } from '../../config/navigation.js';
import { TG, haptic } from '../../config/telegram.js';

export class ProfileStats extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._userId = null;
    }

    static get observedAttributes() {
        return ['place', 'following', 'followers', 'user-id'];
    }

    connectedCallback() {
        const userIdAttr = this.getAttribute('user-id');
        if (userIdAttr) {
            this._userId = userIdAttr;
        } else {
            // Если не указан, используем текущего пользователя
            this._userId = TG?.initDataUnsafe?.user?.id || sessionStorage.getItem('user_id');
        }
        this.render();
        this._setupEventListeners();
    }

    attributeChangedCallback() {
        if (this._initialized) {
            const userIdAttr = this.getAttribute('user-id');
            if (userIdAttr) {
                this._userId = userIdAttr;
            } else {
                this._userId = TG?.initDataUnsafe?.user?.id || sessionStorage.getItem('user_id');
            }
            this.render();
            this._setupEventListeners();
        }
    }

    _setupEventListeners() {
        this._initialized = true;
        
        // Обработчик клика на following
        const followingStat = this.shadowRoot.querySelector('.stat.following');
        if (followingStat) {
            followingStat.addEventListener('click', () => {
                haptic.light();
                navigationManager.navigateToFollowersFollowing(this._userId, 'following');
            });
        }

        // Обработчик клика на followers
        const followersStat = this.shadowRoot.querySelector('.stat.followers');
        if (followersStat) {
            followersStat.addEventListener('click', () => {
                haptic.light();
                navigationManager.navigateToFollowersFollowing(this._userId, 'followers');
            });
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    padding: 16px;
                    justify-content: space-between;
                    align-items: center;
                    align-self: stretch;
                }
                
                .stat {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    flex: 1 0 0;
                }

                .stat.following,
                .stat.followers {
                    cursor: pointer;
                    transition: opacity 0.2s ease;
                }

                .stat.following:active,
                .stat.followers:active {
                    opacity: 0.7;
                }

                @media (hover: hover) {
                    .stat.following:hover,
                    .stat.followers:hover {
                        opacity: 0.8;
                    }
                }
                
                .count {
                    color: var(--md-sys-color-on-surface);
                    font-size: 16px;
                    font-weight: 600;
                    line-height: 24px;
                }
                
                .label {
                    color: var(--md-sys-color-outline);
                    font-size: 12px;
                    line-height: 16px;
                }
            </style>
            
            <div class="stat">
                <span class="count">${this.getAttribute('place') || 0}</span>
                <span class="label">Place</span>
            </div>
            <div class="stat following">
                <span class="count">${this.getAttribute('following') || 0}</span>
                <span class="label">Following</span>
            </div>
            <div class="stat followers">
                <span class="count">${this.getAttribute('followers') || 0}</span>
                <span class="label">Followers</span>
            </div>
        `;
        
        if (this._initialized) {
            this._setupEventListeners();
        }
    }
}

customElements.define('profile-stats', ProfileStats); 