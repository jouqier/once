import { haptic } from '../config/telegram.js';
import { i18n } from '../services/i18n.js';
import '@material/web/button/filled-tonal-button.js';

export class StoryViewer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._currentIndex = 0;
        this._stories = [];
        this._slideTimeout = null;
        this._slideDuration = 5000; // 5 секунд по умолчанию
        this._touchStartX = 0;
        this._actionButton = null;
        this._isNavigating = false;
    }

    set stories(value) {
        this._stories = value;
        this._render();
    }

    set slideDuration(value) {
        this._slideDuration = value;
    }

    set actionButton(value) {
        this._actionButton = value;
        this._updateActionButton();
    }

    connectedCallback() {
        this._render();
        this._setupEventListeners();
        this._startSlideTimer();
    }

    disconnectedCallback() {
        this._clearSlideTimer();
    }

    _render() {
        if (!this._stories.length) return;

        this._clearSlideTimer();

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 1000;
                    background: var(--md-sys-color-scrim);
                    display: flex;
                    flex-direction: column;
                    /* Фикс для iOS: создаем локальный стекинг контекст */
                    transform: translateZ(0);
                    -webkit-transform: translateZ(0);
                }

                .progress-container {
                    position: absolute;
                    top: 8px;
                    left: 8px;
                    right: 8px;
                    display: flex;
                    gap: 4px;
                    z-index: 2;
                }

                .progress-bar {
                    height: 2px;
                    flex: 1;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 2px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    background: white;
                    width: 0%;
                    transition: width linear;
                }

                .close-button {
                    position: absolute;
                    top: 16px;
                    left: 16px;
                    z-index: 2;
                    color: white;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 8px;
                }

                .story-container {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }

                .story-image {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                    background-color: #000;
                }

                .navigation {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                }

                .nav-area {
                    flex: 1;
                    cursor: pointer;
                }

                .action-button {
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    padding: 16px;
                    align-items: center;
                    align-self: stretch;
                    z-index: 2;
                }

                md-filled-tonal-button {
                    display: flex;
                    flex: 1 0 0;
                    height: 48px;
                    transition: all 0.3s ease;
                    --md-filled-tonal-button-container-shape: 1000px;
                    --md-filled-tonal-button-label-text-font: 600 14px sans-serif;
                    --md-filled-tonal-button-container-color: ${this._currentIndex === this._stories.length - 1 ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-on-primary-container)'};
                    --md-filled-tonal-button-label-text-color: ${this._currentIndex === this._stories.length - 1 ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-scrim)'};
                }
            </style>

            <div class="progress-container">
                ${this._stories.map((_, i) => `
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${i < this._currentIndex ? '100%' : '0%'}"></div>
                    </div>
                `).join('')}
            </div>

            <button class="close-button">✕</button>

            <div class="story-container">
                <img class="story-image" 
                    src="${this._stories[this._currentIndex]}" 
                    alt="${i18n.t('story')}"
                    onerror="this.onerror=null; console.error('Failed to load image:', this.src);">
                <div class="navigation">
                    <div class="nav-area" data-direction="prev"></div>
                    <div class="nav-area" data-direction="next"></div>
                </div>
            </div>

            <div class="action-button">
                <md-filled-tonal-button>
                    ${this._currentIndex === this._stories.length - 1 ? i18n.t('letsGetStarted') : i18n.t('next')}
                </md-filled-tonal-button>
            </div>
        `;

        const actionButton = this.shadowRoot.querySelector('.action-button md-filled-tonal-button');
        if (actionButton) {
            actionButton.addEventListener('click', () => {
                haptic.medium();
                if (this._currentIndex === this._stories.length - 1) {
                    if (this._actionButton?.callback) {
                        this._actionButton.callback();
                    }
                } else {
                    this._currentIndex++;
                    this._render();
                }
            });
        }

        this._setupEventListeners();
        this._startSlideProgress();
        this._startSlideTimer();
    }

    _setupEventListeners() {
        const closeButton = this.shadowRoot.querySelector('.close-button');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                haptic.medium();
                this._clearSlideTimer();
                if (this._actionButton?.callback) {
                    this._actionButton.callback();
                } else {
                    this.remove();
                }
            });
        }

        const navigation = this.shadowRoot.querySelector('.navigation');
        if (navigation) {
            navigation.addEventListener('click', this._handleNavigation.bind(this));
        }
    }

    _handleNavigation(e) {
        if (this._isNavigating) return;
        
        const area = e.target.closest('.nav-area');
        if (!area) return;
        
        this._isNavigating = true;
        this._clearSlideTimer();
        
        const direction = area.dataset.direction;
        
        if (direction === 'prev' && this._currentIndex > 0) {
            haptic.light();
            this._currentIndex--;
            this._render();
        } else if (direction === 'next' && this._currentIndex < this._stories.length - 1) {
            haptic.light();
            this._currentIndex++;
            this._render();
        } else if (direction === 'next' && this._currentIndex === this._stories.length - 1) {
            if (this._actionButton?.callback) {
                this._actionButton.callback();
            } else {
                this.remove();
            }
            return;
        }
        
        setTimeout(() => {
            this._isNavigating = false;
        }, 500);
    }

    _startSlideTimer() {
        this._clearSlideTimer();
        this._slideTimeout = setTimeout(() => {
            if (this._currentIndex < this._stories.length - 1) {
                this._currentIndex++;
                this._render();
            } else {
                this._clearSlideTimer();
                if (this._actionButton?.callback) {
                    this._actionButton.callback();
                } else {
                    this.remove();
                }
            }
        }, this._slideDuration);
    }

    _clearSlideTimer() {
        if (this._slideTimeout) {
            clearTimeout(this._slideTimeout);
            this._slideTimeout = null;
        }
    }

    _startSlideProgress() {
        const progressBars = this.shadowRoot.querySelectorAll('.progress-fill');
        progressBars.forEach((bar, index) => {
            if (index < this._currentIndex) {
                bar.style.width = '100%';
            } else if (index === this._currentIndex) {
                bar.style.width = '0%';
                bar.offsetHeight;
                bar.style.transition = `width ${this._slideDuration}ms linear`;
                bar.style.width = '100%';
            } else {
                bar.style.width = '0%';
                bar.style.transition = 'none';
            }
        });
    }

    _updateActionButton() {
        const actionButtonContainer = this.shadowRoot?.querySelector('.action-button');
        if (!actionButtonContainer) return;

        const button = actionButtonContainer.querySelector('md-filled-tonal-button');
        if (!button || !this._actionButton) return;

        button.addEventListener('click', () => {
            haptic.medium();
            this._actionButton.callback?.();
        });
    }
}

customElements.define('story-viewer', StoryViewer); 