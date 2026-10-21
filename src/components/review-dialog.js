import { TG, haptic } from '../config/telegram.js';
import { userMoviesService } from '../services/user-movies.js';
import { scrollLock } from '../utils/scroll.js';
import { i18n } from '../services/i18n.js';
import '@material/web/switch/switch.js';
import { navigationManager } from '../config/navigation.js';
import { StoryGenerator } from '../services/story-generator.js';

export class ReviewDialog extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._movie = null;
        this._rating = '10';
        this._review = '';
        this._isEdit = false;
        this._shareEnabled = true;
        this._storyGenerator = new StoryGenerator();
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

    set movie(value) {
        console.log('Setting movie in review dialog:', value);
        this._movie = value;
        this.render();
    }

    set isEdit(value) {
        this._isEdit = value;
        if (value && this._movie) {
            if (this._movie.media_type === 'tv_season') {
                const seasonNumber = this.getAttribute('season-number');
                const tvId = this.getAttribute('tv-id');
                const review = userMoviesService.getReview('tv_season', tvId, seasonNumber);
                if (review) {
                    this._rating = review.rating;
                    this._review = review.text;
                    this._shareEnabled = review.shared;
                }
            }
        }
        this.render();
    }

    set review(value) {
        if (value) {
            this._rating = value.rating;
            this._review = value.text || '';
            this._shareEnabled = value.shared;
        }
    }

    _getRatingEmoji(rating) {
        const emojis = {
            '10': '🤯',
            '9': '🤩',
            '8': '😍',
            '7': '😊',
            '6': '🙂',
            '5': '😐',
            '4': '😕',
            '3': '😣',
            '2': '😫',
            '1': '🤮'
        };
        return emojis[rating] || '🤯';
    }

    render() {
        if (!this._movie) return;

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
                    border-radius: 40px;
                    margin: 8px;
                    z-index: 1001;
                    animation: slideUp 0.3s ease-out;

                    display: flex;
                    flex: 1 0 0;
                    padding: 16px 0px;
                    flex-direction: column;
                    align-items: flex-start;
                    align-self: stretch;                    
                }

                .movie-info {
                    display: flex;
                    padding: 8px 24px;
                    align-items: center;
                    gap: 16px;
                    align-self: stretch;
                }

                .movie-poster {
                    width: 48px;
                    height: 72px;
                    border-radius: 4px;
                }

                .movie-details {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 4px;
                    flex: 1 0 0;
                }

                .movie-title {
                    align-self: stretch;
                    color: var(--md-sys-color-on-surface);
                    font-size: 16px;
                    font-style: normal;
                    font-weight: 600;
                    line-height: 24px;
                    letter-spacing: 0.15px;
                }

                .movie-subtitle {
                    color: var(--md-sys-color-outline);
                    font-size: 12px;
                    font-style: normal;
                    font-weight: 600;
                    line-height: 16px;
                }

                .rating-container {
                    position: relative;
                    display: flex;
                    padding: 8px 0px;
                    align-items: flex-start;
                    align-self: stretch;
                }

                .current-emoji {
                    position: absolute;
                    left: 24px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 48px;
                    z-index: 2;
                    transition: all 0.2s;
                }

                .emoji-background {
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 96px;
                    background: linear-gradient(
                        to right,
                        var(--md-sys-color-surface-container-high) 60%,
                        transparent 100%
                    );
                    z-index: 1;
                }

                .rating-scroll {
                    display: flex;
                    gap: 8px;
                    overflow-x: auto;
                    padding: 0px 24px 0px 96px;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                    position: relative;
                    touch-action: pan-x;
                    scrollable-container: true;
                }

                .rating-scroll::-webkit-scrollbar {
                    display: none;
                }

                .rating-item {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 48px;
                    height: 48px;
                    border-radius: 100px;
                    background: var(--md-sys-color-surface-container-highest);
                    color: var(--md-sys-color-on-surface);
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    flex-shrink: 0;
                }

                .rating-item.active {
                    background: var(--md-sys-color-primary-container);
                    color: var(--md-sys-color-on-primary-container);
                }

                textarea {
                    border: none;
                    background: var(--md-sys-color-surface-container-high);
                    color: var(--md-sys-color-on-surface);
                    font-family: sans-serif;
                    font-size: 14px;
                    font-style: normal;
                    font-weight: 600;
                    line-height: 20px;
                    resize: none;
                    display: flex;
                    min-height: 96px;
                    padding: 8px 24px;
                    align-items: flex-start;
                    gap: 8px;
                    align-self: stretch;
                    outline: none;
                }

                textarea::placeholder {
                    color: var(--md-sys-color-on-surface-variant);
                }

                .share-container {
                    display: flex;
                    padding: 8px 24px;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    gap: 8px;
                    align-self: stretch;
                }

                .share-option {
                    justify-content: space-between;
                    background: var(--md-sys-color-surface-container-highest);
                    border-radius: 16px;
                    color: var(--md-sys-color-on-surface);
                    font-size: 14px;
                    font-style: normal;
                    font-weight: 600;
                    line-height: 20px;
                    display: flex;
                    min-height: 52px;
                    padding: 0px 10px 0px 16px;
                    align-items: center;
                    gap: 20px;
                    align-self: stretch;              
                }

                md-filled-tonal-button {
                    width: 100%;
                    --md-filled-tonal-button-container-shape: 100px;
                    --md-filled-tonal-button-container-color: var(--md-sys-color-primary-container);
                    --md-filled-tonal-button-label-text-color: var(--md-sys-color-on-primary-container);
                    height: 48px;
                }

                md-switch {
                    --md-switch-selected-handle-color: var(--md-sys-color-primary);
                    --md-switch-selected-track-color: var(--md-sys-color-primary-container);
                    --md-switch-unselected-handle-color: var(--md-sys-color-outline);
                    --md-switch-unselected-track-color: var(--md-sys-color-surface-container-highest);
                    --md-switch-handle-height: 24px;
                    --md-switch-handle-width: 24px;
                    --md-switch-track-height: 32px;
                    --md-switch-track-width: 52px;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }

                .divider {
                    height: 1px;
                    background: var(--md-sys-color-outline-variant);
                    margin: 8px 24px;

                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    align-self: stretch;                    
                }                    

                .loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    z-index: 1002;
                    display: none;
                    justify-content: center;
                    align-items: center;
                    animation: fadeIn 0.2s ease-out;
                }

                .loading-overlay.visible {
                    display: flex;
                }

                .loading-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                }

                .loading-spinner {
                    width: 48px;
                    height: 48px;
                    border: 4px solid var(--md-sys-color-surface);
                    border-top: 4px solid var(--md-sys-color-primary);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                .loading-text {
                    color: var(--md-sys-color-surface);
                    font-size: 16px;
                    font-weight: 600;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .movie-subtitle {
                    color: var(--md-sys-color-outline);
                    font-size: 12px;
                    font-style: normal;
                    font-weight: 600;
                    line-height: 16px;
                }
            </style>

            <div class="overlay">
                <div class="dialog">
                    <div class="movie-info">
                        <img class="movie-poster" 
                             src="https://image.tmdb.org/t/p/w185${this._movie.poster_path}" 
                             alt="${this._movie.title}">
                        <div class="movie-details">
                            ${this._movie.media_type === 'tv_season' 
                                ? `
                                    <div class="movie-title">${this._movie.name}</div>
                                    <div class="movie-subtitle">${i18n.t('season')} ${this.getAttribute('season-number')}, ${new Date(this._movie.air_date).getFullYear()}</div>
                                ` 
                                : `
                                    <div class="movie-title">${this._movie.title}</div>
                                    <div class="movie-subtitle">${new Date(this._movie.release_date).getFullYear()}</div>
                                `
                            }
                        </div>
                    </div>

                    <div class="divider"></div>

                    <textarea 
                        placeholder="${i18n.t('writeReview')}"
                        maxlength="500"
                    >${this._review}</textarea>

                    <div class="rating-container">
                        <div class="emoji-background"></div>
                        <div class="current-emoji">
                            ${this._getRatingEmoji(this._rating)}
                        </div>
                        <div class="rating-scroll">
                            ${['10', '9', '8', '7', '6', '5', '4', '3', '2', '1'].map(rating => `
                                <div class="rating-item ${this._rating === rating ? 'active' : ''}" 
                                     data-rating="${rating}">
                                    ${rating}
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="divider"></div>

                    <div class="share-container">
                        <div class="share-option">
                            <span>${i18n.t('shareReview')}</span>
                            <md-switch ${this._shareEnabled ? 'selected' : ''}></md-switch>
                        </div>
                        <md-filled-tonal-button>${i18n.t('submit')}</md-filled-tonal-button>
                    </div>
                </div>
            </div>

            <div class="loading-overlay">
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">${i18n.t('generatingStory')}</div>
                    </div>
            </div>
        `;
    }

    _setupEventListeners() {
        this.shadowRoot.querySelector('.overlay').addEventListener('click', (e) => {
            if (e.target.classList.contains('overlay')) {
                haptic.light();
                this.remove();
            }
        });

        // Обработка выбора рейтинга
        this.shadowRoot.querySelectorAll('.rating-item').forEach(item => {
            item.addEventListener('click', () => {
                haptic.light();
                this._rating = item.dataset.rating;
                
                // Обновляем только необходимые элементы
                this._updateRating();
            });
        });

        // Обрабтка ввода отзыва
        const textarea = this.shadowRoot.querySelector('textarea');
        textarea.addEventListener('input', (e) => {
            this._review = e.target.value;
        });

        // Обрабтка отправки
        const submitButton = this.shadowRoot.querySelector('md-filled-tonal-button');
        submitButton.addEventListener('click', () => {
            haptic.medium();
            this._handleSubmit();
        });

        // Обработка переключения свитчера
        const shareSwitch = this.shadowRoot.querySelector('md-switch');
        shareSwitch.selected = this._shareEnabled;
        
        shareSwitch.addEventListener('change', (e) => {
            haptic.light();
            this._shareEnabled = e.target.selected;
        });

        // Блокировка ертикального скролла при горизонтальном скролле оценок
        const ratingScroll = this.shadowRoot.querySelector('.rating-scroll');
        let startX, startY;

        ratingScroll.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });

        ratingScroll.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;

            const deltaX = Math.abs(e.touches[0].clientX - startX);
            const deltaY = Math.abs(e.touches[0].clientY - startY);

            // Если движение больше по горизонтали, чем по вертикали
            if (deltaX > deltaY) {
                e.stopPropagation();
            } else {
                // Иначе позволяем странице скроллиться
                ratingScroll.style.overflowX = 'hidden';
            }
        });

        ratingScroll.addEventListener('touchend', () => {
            startX = null;
            startY = null;
            ratingScroll.style.overflowX = 'auto';
        });
    }

    _updateRating() {
        // Обновляем эмодзи
        const emojiElement = this.shadowRoot.querySelector('.current-emoji');
        emojiElement.textContent = this._getRatingEmoji(this._rating);

        // Обновляем активную кнопку рейтинга
        this.shadowRoot.querySelectorAll('.rating-item').forEach(item => {
            if (item.dataset.rating === this._rating) {
                item.classList.add('active');
                item.style.background = 'var(--md-sys-color-primary)';
                item.style.color = 'var(--md-sys-color-on-primary)';
            } else {
                item.classList.remove('active');
                item.style.background = 'var(--md-sys-color-surface-container-highest)';
                item.style.color = 'var(--md-sys-color-on-surface)';
            }
        });
    }

    _showLoading() {
        const loader = this.shadowRoot.querySelector('.loading-overlay');
        loader.style.zIndex = '9999';
        loader.classList.add('visible');
        
        // Блокируем взаимодействие с диалогом
        const dialog = this.shadowRoot.querySelector('.dialog');
        dialog.style.pointerEvents = 'none';
        dialog.style.opacity = '0.5';
    }

    _hideLoading() {
        const loader = this.shadowRoot.querySelector('.loading-overlay');
        loader.classList.remove('visible');
        // Разблокируем взаимодействие с диалогом
        const dialog = this.shadowRoot.querySelector('.dialog');
        dialog.style.pointerEvents = 'auto';
        dialog.style.opacity = '1';
    }

    _showError(message) {
        // Проверяем доступность TG перед использованием
        if (TG?.showAlert) {
            TG.showAlert(message);
        } else {
            // Fallback если TG недоступен
            alert(message);
        }
    }

    async _handleSubmit() {
        if (!this._rating) return;

        try {
            this._showLoading();

            // Сохраняем отзыв в зависимости от типа контента
            let review;
            if (this._movie.media_type === 'tv_season') {
                const seasonNumber = this.getAttribute('season-number');
                const tvId = this.getAttribute('tv-id');
                review = {
                    rating: this._rating,
                    text: this._review,
                    createdAt: Date.now(),
                    shared: this._shareEnabled,
                    season_number: seasonNumber,
                    media_type: 'tv_season'
                };
                userMoviesService.saveReview('tv_season', tvId, review, seasonNumber);
            } else {
                review = {
                    rating: this._rating,
                    text: this._review,
                    createdAt: Date.now(),
                    shared: this._shareEnabled,
                    media_type: this._movie?.media_type || 'movie'
                };
                userMoviesService.saveReview(this._movie.media_type, this._movie.id, review);
            }

            // Генерируем событие для обновления card-review
            if (this._movie.media_type === 'tv_season') {
                document.dispatchEvent(new CustomEvent('season-review-submitted', {
                    bubbles: true,
                    composed: true,
                    detail: {
                        tvId: this.getAttribute('tv-id'),
                        seasonNumber: this.getAttribute('season-number'),
                        review
                    }
                }));
            } else {
                document.dispatchEvent(new CustomEvent('review-submitted', {
                    bubbles: true,
                    composed: true,
                    detail: {
                        movieId: this._movie.id,
                        review
                    }
                }));
            }

            // Если включен шаринг, генерируем и отправляем историю
            if (this._shareEnabled) {
                try {
                    this._showLoading();
                    
                    const loadingText = this.shadowRoot.querySelector('.loading-text');
                    loadingText.textContent = i18n.t('generatingStory');

                    const storyImage = await this._storyGenerator.generateReviewStory(
                        this._movie,
                        review
                    );

                    console.log('✅ Story image generated:', storyImage);

                    if (!storyImage || !storyImage.startsWith('https://')) {
                        console.error('❌ Invalid image URL:', storyImage);
                        throw new Error('Invalid image URL');
                    }

                    loadingText.textContent = i18n.t('sharingStory');

                    if (TG?.shareToStory) {
                        const shareParams = {
                            media_type: "photo"
                        };
                        
                        // Добавляем текст отзыва в поле подписи к истории
                        if (review.text && review.text.trim()) {
                            shareParams.text = review.text;
                        }
                        
                        console.log('📤 Sharing to story with params:', shareParams);
                        await TG.shareToStory(storyImage, shareParams);
                    } else {
                        console.warn('⚠️ shareToStory не доступен');
                    }
                } catch (error) {
                    console.error('💥 Error sharing story:', error);
                    this._showError(i18n.t('failedToShareStory'));
                }
            }

            // Закрываем диалог только после всех операций
            this.remove();

        } catch (error) {
            console.error('Error:', error);
            this._showError(i18n.t('somethingWentWrong'));
        } finally {
            this._hideLoading();
        }
    }
}

customElements.define('review-dialog', ReviewDialog); 