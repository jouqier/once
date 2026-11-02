import TMDBService from '../services/tmdb.js';
import TMDBCacheService from '../services/tmdb-cache.js';
import { userMoviesService } from '../services/user-movies.js';
import { i18n } from '../services/i18n.js';
import { haptic } from '../config/telegram.js';
import { API_CONFIG } from '../config/api.js';
import { scrollLock } from '../utils/scroll.js';
import { navigationManager } from '../config/navigation.js';
import sheetHandle from '../../public/assets/svg/sheet-handle.svg';

// Если персональных рекомендаций меньше, добиваем пул популярным
const MIN_POOL_SIZE = 8;
// Сколько карточек мелькает за один прокрут
const SPIN_STEPS = 16;
const SPIN_DURATION = 2000;

const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export class SurpriseDialog extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._pool = [];
        this._shownKeys = new Set();
        this._genres = { movie: {}, tv: {} };
        this._current = null;
        this._spinning = false;
        this._closed = false;
    }

    connectedCallback() {
        scrollLock.enable();
        navigationManager.pushModal(this);
        this.render();
        this._setupEventListeners();
        this._start();
    }

    disconnectedCallback() {
        this._closed = true;
        scrollLock.disable();
        navigationManager.removeModal(this);
    }

    async _start() {
        try {
            await this._loadPool();
        } catch (error) {
            console.error('Error loading surprise pool:', error);
        }

        if (this._closed) return;

        if (!this._pool.length) {
            this._renderEmpty();
            return;
        }

        this.spin();
    }

    async _loadPool() {
        const genresPromise = Promise.all([
            TMDBService.getGenreMap('movie').catch(() => ({})),
            TMDBService.getGenreMap('tv').catch(() => ({}))
        ]);

        const [allMovies, allShows] = await Promise.all([
            userMoviesService.getAllMoviesWithDetails().catch(() => []),
            userMoviesService.getAllTVShowsWithDetails().catch(() => [])
        ]);

        const movieWant = allMovies.filter(m => userMoviesService.getMovieState(m.id) === 'want');
        const movieWatched = allMovies.filter(m => userMoviesService.getMovieState(m.id) === 'watched');
        const tvWant = allShows.filter(s => userMoviesService.getTVShowState(s.id) === 'want');
        const tvWatched = allShows.filter(s => userMoviesService.getTVShowState(s.id) === 'watched');
        const tvWatching = allShows.filter(s => userMoviesService.getTVShowState(s.id) === 'watching');

        const [movies, shows] = await Promise.all([
            TMDBCacheService.getPersonalizedRecommendations(movieWant, movieWatched).catch(() => []),
            TMDBCacheService.getPersonalizedTVRecommendations(tvWant, tvWatched, tvWatching).catch(() => [])
        ]);

        // Всё, что уже есть в списках пользователя, в пул не попадает
        const excluded = new Set([
            ...allMovies.map(m => `movie_${m.id}`),
            ...allShows.map(s => `tv_${s.id}`)
        ]);

        const pool = [];
        const addToPool = (items, type) => {
            for (const item of items || []) {
                const key = `${type}_${item.id}`;
                if (!item.poster_path || excluded.has(key)) continue;
                excluded.add(key);
                pool.push({ ...item, media_type: type });
            }
        };

        addToPool(movies, 'movie');
        addToPool(shows, 'tv');

        if (pool.length < MIN_POOL_SIZE) {
            const [popularMovies, popularShows] = await Promise.all([
                TMDBService.getPopularMovies().then(d => d.results).catch(() => []),
                TMDBService.getPopularTV().then(d => d.results).catch(() => [])
            ]);
            addToPool(popularMovies, 'movie');
            addToPool(popularShows, 'tv');
        }

        const [movieGenres, tvGenres] = await genresPromise;
        this._genres = { movie: movieGenres, tv: tvGenres };
        this._pool = pool;
    }

    _key(item) {
        return `${item.media_type}_${item.id}`;
    }

    _pickNext() {
        let candidates = this._pool.filter(item => !this._shownKeys.has(this._key(item)));
        if (!candidates.length) {
            // Всё уже показали, начинаем круг заново, кроме текущего
            this._shownKeys.clear();
            candidates = this._pool.filter(item => !this._current || this._key(item) !== this._key(this._current));
        }
        if (!candidates.length) candidates = this._pool;
        return candidates[Math.floor(Math.random() * candidates.length)];
    }

    _preloadImage(src) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = img.onerror = () => resolve();
            img.src = src;
        });
    }

    async spin() {
        if (this._spinning || !this._pool.length) return;
        this._spinning = true;
        this._setSpinning(true);

        const result = this._pickNext();
        this._shownKeys.add(this._key(result));
        const posterPromise = this._preloadImage(this._posterUrl(result));

        const others = this._pool.filter(item => item !== result);
        const steps = Math.min(SPIN_STEPS, Math.max(others.length, 1));
        const sequence = [];
        for (let i = 0; i < steps; i++) {
            sequence.push(others.length ? others[Math.floor(Math.random() * others.length)] : result);
        }

        // Даём постерам кадров немного времени на загрузку, чтобы не мелькали пустые карточки
        await Promise.race([
            Promise.all(sequence.map(item => this._preloadImage(this._posterUrl(item, 'w342')))),
            new Promise(r => setTimeout(r, 800))
        ]);

        // Интервалы растут к концу, чтобы карточка «тормозила»
        const weights = sequence.map((_, i) => 1 + Math.pow(i / steps, 2) * 6);
        const totalWeight = weights.reduce((a, b) => a + b, 0);

        for (let i = 0; i < sequence.length; i++) {
            if (this._closed) return;
            this._showItem(sequence[i], 'w342');
            haptic.light();
            await new Promise(r => setTimeout(r, (weights[i] / totalWeight) * SPIN_DURATION));
        }

        await posterPromise;
        if (this._closed) return;

        this._current = result;
        this._showItem(result);
        haptic.heavy();
        this._spinning = false;
        this._setSpinning(false);
    }

    _posterUrl(item, size = 'w500') {
        return `${API_CONFIG.IMAGE_BASE_URL.replace('/w500', `/${size}`)}${item.poster_path}`;
    }

    _meta(item) {
        const parts = [];

        const genre = (this._genres[item.media_type] || {})[(item.genre_ids || [])[0]];
        if (genre) parts.push(escapeHtml(genre));

        if (item.vote_average) parts.push(`${item.vote_average.toFixed(1)} IMDb`);

        const dateString = item.release_date || item.first_air_date;
        if (dateString) {
            const locale = i18n.getLocale() === 'ru' ? 'ru-RU' : 'en-US';
            parts.push(new Date(dateString).toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }));
        }

        return parts.map(part => `<span>${part}</span>`).join('<span>·</span>');
    }

    _showItem(item, size) {
        const poster = this.shadowRoot.querySelector('.poster');
        poster.classList.remove('skeleton');
        poster.innerHTML = `<img src="${this._posterUrl(item, size)}" alt="">`;
        poster.classList.remove('tick');
        // Перезапускаем анимацию смены постера
        void poster.offsetWidth;
        poster.classList.add('tick');

        this.shadowRoot.querySelector('.title').textContent = item.title || item.name || '';
        this.shadowRoot.querySelector('.additional').innerHTML = this._meta(item);
    }

    _setSpinning(spinning) {
        this.shadowRoot.querySelector('.dialog').classList.toggle('spinning', spinning);
    }

    _renderEmpty() {
        const dialog = this.shadowRoot.querySelector('.dialog');
        dialog.classList.add('empty');
        this.shadowRoot.querySelector('.title').textContent = i18n.t('surpriseEmpty');
    }

    _setupEventListeners() {
        this.shadowRoot.querySelector('.overlay').addEventListener('click', (e) => {
            if (e.target.classList.contains('overlay')) {
                haptic.light();
                this.remove();
            }
        });

        this.shadowRoot.querySelector('.spin-button').addEventListener('click', () => {
            if (this._spinning) return;
            haptic.light();
            this.spin();
        });

        this.shadowRoot.querySelector('.open-button').addEventListener('click', () => {
            const item = this._current;
            if (!item || this._spinning) return;
            haptic.light();
            this.remove();
            document.dispatchEvent(new CustomEvent('movie-selected', {
                detail: { movieId: item.id.toString(), type: item.media_type, movie: item }
            }));
        });
    }

    render() {
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
                    max-width: 624px;
                    margin: 8px auto;
                    width: calc(100% - 16px);
                    background: var(--md-sys-color-surface-container-high);
                    border-radius: 40px;
                    overflow: hidden;
                    z-index: 1001;
                    animation: slideUp 0.3s ease-out;

                    display: flex;
                    padding: 16px 0px;
                    flex-direction: column;
                    align-items: stretch;
                }

                .sheet-header {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .image {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 32px 80px 88px;
                }

                .poster {
                    position: relative;
                    width: 100%;
                    max-width: 240px;
                    aspect-ratio: 2 / 3;
                    border-radius: 6px;
                    overflow: hidden;
                    background: var(--md-sys-color-surface-container-highest);
                }

                .poster img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }

                .poster.skeleton {
                    animation: pulse 1.2s ease-in-out infinite;
                }

                .poster.tick {
                    animation: tick 0.12s ease-out;
                }

                .info {
                    position: absolute;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    text-align: center;
                }

                .title {
                    width: 100%;
                    color: var(--md-sys-color-on-surface);
                    font-size: 22px;
                    font-style: normal;
                    font-weight: 600;
                    line-height: 28px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .dialog.empty .title {
                    white-space: normal;
                    font-size: 16px;
                    line-height: 24px;
                }

                .additional {
                    display: flex;
                    justify-content: center;
                    gap: 4px;
                    min-height: 16px;
                    padding: 0 16px;
                    color: var(--md-sys-color-outline);
                    font-size: 12px;
                    font-style: normal;
                    font-weight: 600;
                    line-height: 16px;
                    white-space: nowrap;
                }

                .button-container {
                    display: flex;
                    gap: 8px;
                    padding: 8px 24px;
                }

                .button-container button {
                    flex: 1 0 0;
                    min-width: 50px;
                    height: 48px;
                    padding: 14px 24px;
                    border: none;
                    border-radius: 100px;
                    background: rgba(255, 255, 255, 0.32);
                    -webkit-backdrop-filter: blur(20px);
                    backdrop-filter: blur(20px);
                    color: var(--md-sys-color-on-surface);
                    font-family: inherit;
                    font-size: 14px;
                    font-style: normal;
                    font-weight: 600;
                    line-height: 20px;
                    cursor: pointer;
                    transition: opacity 0.2s, transform 0.2s;
                }

                .button-container button:active {
                    transform: scale(0.97);
                }

                .dialog.spinning .button-container button,
                .dialog.empty .button-container button {
                    opacity: 0.5;
                    pointer-events: none;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }

                @keyframes tick {
                    from { transform: translateY(6px) scale(0.98); }
                    to { transform: none; }
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }
            </style>

            <div class="overlay">
                <div class="dialog spinning">
                    <div class="sheet-header">
                        <img src="${sheetHandle}" width="44" height="4" alt="">
                    </div>

                    <div class="image">
                        <div class="poster skeleton"></div>
                        <div class="info">
                            <div class="title"></div>
                            <div class="additional"></div>
                        </div>
                    </div>

                    <div class="button-container">
                        <button class="open-button">${i18n.t('surpriseOpen')}</button>
                        <button class="spin-button">${i18n.t('surpriseSpinAgain')}</button>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('surprise-dialog', SurpriseDialog);
