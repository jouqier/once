import './episodes-badge.js';
import './rating-badge.js';

export class MediaPoster extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._loadedImages = new Set();
        this._imageObserver = null;
    }

    static get observedAttributes() {
        return ['src', 'alt', 'watched-episodes', 'total-episodes', 'user-rating'];
    }

    connectedCallback() {
        this.render();
        this._setupImageLoading();
    }

    _setupImageLoading() {
        const img = this.shadowRoot.querySelector('.poster-image');
        if (!img) return;

        // Если изображение уже было загружено ранее, сразу показываем его
        const imageUrl = img.getAttribute('data-src');
        if (imageUrl && this._loadedImages.has(imageUrl)) {
            img.src = imageUrl;
            img.style.opacity = '1';
            return;
        }

        // Если изображение уже загружено (например, из кэша)
        if (img.complete && img.naturalHeight !== 0) {
            img.style.opacity = '1';
        }

        this._imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (imageUrl && !this._loadedImages.has(imageUrl)) {
                        this._loadedImages.add(imageUrl);
                        
                        img.onload = () => {
                            requestAnimationFrame(() => {
                                img.style.opacity = '1';
                            });
                        };
                        
                        img.onerror = () => {
                            img.removeAttribute('src');
                            img.style.opacity = '0';
                        };

                        img.src = imageUrl;
                    }
                }
            });
        }, {
            rootMargin: '50px'
        });
        
        this._imageObserver.observe(img);
    }

    disconnectedCallback() {
        if (this._imageObserver) {
            this._imageObserver.disconnect();
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this.render();
        }
    }

    render() {
        const watchedEpisodes = parseInt(this.getAttribute('watched-episodes')) || 0;
        const totalEpisodes = parseInt(this.getAttribute('total-episodes')) || 0;
        const userRating = this.getAttribute('user-rating');
        const posterSrc = this.getAttribute('src');
        const posterAlt = this.getAttribute('alt');

        // Для сериалов (когда есть watched-episodes) не показываем бейдж рейтинга
        const isTVShow = watchedEpisodes > 0 || totalEpisodes > 0;
        const shouldShowRating = !isTVShow && userRating;

        // Проверяем, было ли изображение уже загружено
        const isImageLoaded = posterSrc && this._loadedImages.has(posterSrc);

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
                    transition: opacity 0.3s;
                    opacity: ${isImageLoaded ? '1' : '0'};
                }

                .poster-placeholder {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    color: var(--md-sys-color-on-surface);
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    font-size: 14px;
                    font-weight: 600;
                    word-break: break-word;
                    line-height: 1.2;
                    display: none;
                }

                .poster-image:not([src]) ~ .poster-placeholder,
                .poster-image[src=""] ~ .poster-placeholder,
                .poster-image[src="null"] ~ .poster-placeholder,
                .poster-image[src="undefined"] ~ .poster-placeholder {
                    display: flex;
                }
            </style>

            <div class="poster-container">
                ${posterSrc ? `
                    <img class="poster-image" 
                         data-src="${posterSrc}"
                         alt="${posterAlt}"
                         loading="lazy"
                         ${isImageLoaded ? `src="${posterSrc}"` : ''}>
                    <div class="poster-placeholder">
                        ${posterAlt || '?'}
                    </div>
                ` : `
                    <div class="poster-placeholder">
                        ${posterAlt || '?'}
                    </div>
                `}
                
                <episodes-badge 
                    watched-episodes="${watchedEpisodes}"
                    total-episodes="${totalEpisodes}">
                </episodes-badge>

                ${shouldShowRating ? `
                    <rating-badge 
                        user-rating="${userRating}">
                    </rating-badge>
                ` : ''}
            </div>
        `;
    }
}

customElements.define('media-poster', MediaPoster); 