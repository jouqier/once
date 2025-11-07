import './episodes-badge.js';
import './rating-badge.js';

// Статический Set для отслеживания загруженных изображений между всеми инстансами
const loadedImages = new Set();

export class MediaPoster extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._isConnected = false;
        this._setupDOM();
    }

    static get observedAttributes() {
        return ['src', 'alt', 'watched-episodes', 'total-episodes', 'user-rating'];
    }

    _setupDOM() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    position: relative;
                    height: 100%;
                }

                .poster-container {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    border-radius: 8px;
                    background: var(--poster-placeholder-background, var(--md-sys-color-surface-container-low));
                    overflow: hidden;
                }

                .poster-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                    transition: opacity 0.3s ease-in-out;
                }

                .poster-image.loading {
                    opacity: 0;
                }

                .poster-image.loaded {
                    opacity: 1;
                }

                .poster-image.hidden {
                    display: none;
                }

                .poster-placeholder {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    color: var(--md-sys-color-on-surface);
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    font-size: 14px;
                    font-weight: 600;
                    word-break: break-word;
                    line-height: 1.2;
                    padding: 8px;
                }

                .poster-placeholder.hidden {
                    display: none;
                }
            </style>

            <div class="poster-container">
                <img class="poster-image hidden" alt="" loading="lazy">
                <div class="poster-placeholder">?</div>
                <episodes-badge watched-episodes="0" total-episodes="0"></episodes-badge>
                <rating-badge user-rating=""></rating-badge>
            </div>
        `;

        // Сохраняем ссылки на элементы
        this._img = this.shadowRoot.querySelector('.poster-image');
        this._placeholder = this.shadowRoot.querySelector('.poster-placeholder');
        this._episodesBadge = this.shadowRoot.querySelector('episodes-badge');
        this._ratingBadge = this.shadowRoot.querySelector('rating-badge');

        // Обработчики загрузки изображения
        this._img.addEventListener('load', () => this._onImageLoad());
        this._img.addEventListener('error', () => this._onImageError());
    }

    connectedCallback() {
        this._isConnected = true;
        this._updateAll();
    }

    disconnectedCallback() {
        this._isConnected = false;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (!this._isConnected || oldValue === newValue) return;

        switch (name) {
            case 'src':
            case 'alt':
                this._updateImage();
                break;
            case 'watched-episodes':
            case 'total-episodes':
                this._updateEpisodesBadge();
                this._updateRatingBadgeVisibility();
                break;
            case 'user-rating':
                this._updateRatingBadge();
                break;
        }
    }

    _updateAll() {
        this._updateImage();
        this._updateEpisodesBadge();
        this._updateRatingBadge();
    }

    _updateImage() {
        const src = this.getAttribute('src');
        const alt = this.getAttribute('alt') || '?';

        // Обновляем placeholder текст
        this._placeholder.textContent = alt;

        if (!src || src === 'null' || src === 'undefined' || src === '') {
            // Нет изображения - показываем только placeholder
            this._img.classList.add('hidden');
            this._img.removeAttribute('src');
            this._placeholder.classList.remove('hidden');
            return;
        }

        // Есть изображение
        this._img.alt = alt;

        // Проверяем, было ли изображение уже загружено
        if (loadedImages.has(src)) {
            // Изображение уже загружено - показываем сразу
            this._img.src = src;
            this._img.classList.remove('loading', 'hidden');
            this._img.classList.add('loaded');
            this._placeholder.classList.add('hidden');
        } else if (this._img.src === src && this._img.complete && this._img.naturalHeight !== 0) {
            // Изображение уже в DOM и загружено (из кэша)
            loadedImages.add(src);
            this._img.classList.remove('loading', 'hidden');
            this._img.classList.add('loaded');
            this._placeholder.classList.add('hidden');
        } else {
            // Нужно загрузить изображение
            this._img.classList.remove('loaded', 'hidden');
            this._img.classList.add('loading');
            this._placeholder.classList.remove('hidden');
            this._img.src = src;
        }
    }

    _onImageLoad() {
        const src = this._img.src;
        if (src) {
            loadedImages.add(src);
            // Используем requestAnimationFrame для плавности на iOS
            requestAnimationFrame(() => {
                this._img.classList.remove('loading');
                this._img.classList.add('loaded');
                this._placeholder.classList.add('hidden');
            });
        }
    }

    _onImageError() {
        this._img.classList.add('hidden');
        this._img.classList.remove('loading', 'loaded');
        this._placeholder.classList.remove('hidden');
    }

    _updateEpisodesBadge() {
        const watchedEpisodes = this.getAttribute('watched-episodes') || '0';
        const totalEpisodes = this.getAttribute('total-episodes') || '0';

        this._episodesBadge.setAttribute('watched-episodes', watchedEpisodes);
        this._episodesBadge.setAttribute('total-episodes', totalEpisodes);
    }

    _updateRatingBadge() {
        const userRating = this.getAttribute('user-rating') || '';
        this._ratingBadge.setAttribute('user-rating', userRating);
        this._updateRatingBadgeVisibility();
    }

    _updateRatingBadgeVisibility() {
        const watchedEpisodes = parseInt(this.getAttribute('watched-episodes')) || 0;
        const totalEpisodes = parseInt(this.getAttribute('total-episodes')) || 0;
        const userRating = this.getAttribute('user-rating');

        // Для сериалов (когда есть эпизоды) не показываем бейдж рейтинга
        const isTVShow = watchedEpisodes > 0 || totalEpisodes > 0;
        const shouldShowRating = !isTVShow && userRating;

        if (shouldShowRating) {
            this._ratingBadge.style.display = '';
        } else {
            this._ratingBadge.style.display = 'none';
        }
    }
}

customElements.define('media-poster', MediaPoster);
