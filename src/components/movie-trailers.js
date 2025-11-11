import { trailersStore } from '../services/trailers-store.js';
import { haptic } from '../config/telegram.js';
import './poster-skeleton.js';

export class MovieTrailers extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._trailers = [];
    }

    set trailers(value) {
        this._trailers = value || [];
        if (this._trailers.length > 0) {
            this._trailers.sort((a, b) => {
                const aWatched = trailersStore.isWatched(a.trailer.key);
                const bWatched = trailersStore.isWatched(b.trailer.key);
                return aWatched === bWatched ? 0 : aWatched ? 1 : -1;
            });
        }
        this.render();
    }

    render() {
        // Всегда рендерим контейнер, даже если трейлеров нет
        const hasTrailers = this._trailers?.length > 0;

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    align-self: stretch;
                }

                h1,
                h2,
                h3,
                h4,
                p {
                    margin: 0;
                }

                .trailers-container {
                    position: relative;
                    display: flex;
                    padding: 8px 0;
                    flex-direction: column;
                    align-items: flex-start;
                    align-self: stretch;
                }

                .trailers-container::before,
                .trailers-container::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 16px;
                    pointer-events: none;
                    z-index: 1;
                }

                .trailers-container::before {
                    left: 0;
                    background: linear-gradient(to right, var(--md-sys-color-scrim), transparent);
                }

                .trailers-container::after {
                    right: 0;
                    background: linear-gradient(to left, var(--md-sys-color-scrim), transparent);
                }

                .trailers-wrapper {
                    width: 100%;
                    overflow-x: auto;
                    scrollbar-width: none;
                }

                .trailers-wrapper::-webkit-scrollbar {
                    display: none;
                }

                .trailers-list {
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                    flex-wrap: nowrap;
                    padding: 0 16px;
                    overflow-x: auto;
                    scrollbar-width: none;
                }

                .trailer-item {
                    position: relative;
                    padding: 2px;
                    width: 68px;
                }

                .trailer-border {
                    position: absolute;
                    height: 68px;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    border-radius: 999px;
                    background: var(--md-sys-color-primary-container);
                    padding: 2px;
                    z-index: -1;
                }

                .trailer-border.watched {
                    background: #666;
                }

                .trailer-slide {
                    width: 68px;
                    height: 68px;
                    border-radius: 999px;
                    overflow: hidden;
                    background: var(--md-sys-color-surface);
                    background-size: cover;
                    background-position: center;
                    transition: filter 0.3s ease;
                    box-shadow: 0px 0px 0px 2px var(--md-sys-color-scrim) inset;
                }

                .trailer-slide.watched {
                    filter: grayscale(100%);
                }

                .trailer-info {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    align-self: stretch;
                    margin-top: 8px;
                }

                .trailer-title {
                    align-self: stretch;
                    color: var(--md-sys-color-on-surface);
                    text-align: center;
                    font-size: 12px;
                    font-style: normal;
                    font-weight: 600;
                    line-height: 16px;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .trailer-date {
                    font-size: 10px;
                    opacity: 0.8;
                    margin: 4px 0 0 0;
                }
            </style>

            <div class="trailers-container">
                <div class="trailers-wrapper">
                    <div class="trailers-list">
                        ${hasTrailers ? this._trailers.map(movie => {
                            const isWatched = trailersStore.isWatched(movie.trailer.key);
                            return `
                                <div class="trailer-item" data-trailer-id="${movie.trailer.key}">
                                    <div class="trailer-border ${isWatched ? 'watched' : ''}"></div>
                                    <div class="trailer-slide ${isWatched ? 'watched' : ''}" 
                                         style="background-image: url(https://img.youtube.com/vi/${movie.trailer.key}/maxresdefault.jpg)">
                                    </div>
                                    <div class="trailer-info">
                                        <p class="trailer-title">
                                            ${movie.title.length > 50 ? movie.title.substring(0, 50) + '...' : movie.title}
                                        </p>
                                    </div> 
                                </div>
                            `;
                        }).join('') : Array(5).fill(0).map(() => 
                            '<poster-skeleton size="trailer"></poster-skeleton>'
                        ).join('')}
                    </div>
                </div>
            </div>
        `;

        if (hasTrailers) {
            this._setupTrailerClicks();
        }
    }

    _setupTrailerClicks() {
        this.shadowRoot.querySelectorAll('.trailer-item').forEach(slide => {
            slide.addEventListener('click', () => {
                haptic.medium();
                const trailerId = slide.dataset.trailerId;
                trailersStore.markAsWatched(trailerId);
                
                const border = slide.querySelector('.trailer-border');
                const trailer = slide.querySelector('.trailer-slide');
                border.classList.add('watched');
                trailer.classList.add('watched');
                
                window.open(`https://www.youtube.com/watch?v=${trailerId}`, '_blank');
            });
        });
    }
}

customElements.define('movie-trailers', MovieTrailers); 