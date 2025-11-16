import { userMoviesService } from '../services/user-movies.js';
import { haptic } from '../config/telegram.js';
import { TG } from '../config/telegram.js';
import { i18n } from '../services/i18n.js';
import { supabaseProfileService } from '../services/supabase-profile-service.js';
import { navigationManager } from '../config/navigation.js';
import '../components/review-view-dialog.js';

export class MovieReview extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._movie = null;
        this._reviews = [];
        this._review = null;
        this._user = null;
        this._followingReviews = []; // Отзывы подписок
        this._allReviews = []; // Объединенный список для отображения
        this._followingReviewsLoaded = false;
        this._initUser();

        document.addEventListener('season-review-submitted', (e) => {
            if (this._movie && e.detail.tvId === this._movie.id) {
                const review = e.detail.review;
                
                this._reviews = [
                    ...this._reviews.filter(r => r.seasonNumber !== review.seasonNumber),
                    review
                ];
                
                this.style.display = 'flex';
                this.render();
            }
        });

        document.addEventListener('review-submitted', (e) => {
            if (this._movie && e.detail.movieId === this._movie.id) {
                this._review = e.detail.review;
                this._mergeReviews();
            }
        });
        
        // Обновление отзывов при изменении подписок
        document.addEventListener('user-follows-changed', () => {
            if (this._movie) {
                if (this._movie.media_type === 'tv') {
                    this._loadFollowingSeasonReviews();
                } else {
                    this._loadFollowingMovieReviews();
                }
            }
        });

        document.addEventListener('review-removed', (e) => {
            if (this._movie && e.detail.movieId === this._movie.id) {
                this._review = null;
                // Объединяем отзывы заново (чтобы показать отзывы подписок, даже если свой отзыв удален)
                this._mergeReviews();
            }
        });
    }

    async _initUser() {
        if (TG.initDataUnsafe.user) {
            this._user = {
                firstName: TG.initDataUnsafe.user.first_name,
                lastName: TG.initDataUnsafe.user.last_name,
                photo: TG.initDataUnsafe.user.photo_url
            };
            this.render();
        }
    }

    set movie(value) {
        this._movie = value;
        if (value) {
            if (value.media_type === 'tv') {
                this._loadAllSeasonReviews();
                this._loadFollowingSeasonReviews();
            } else {
                // Для фильмов загружаем свой отзыв и отзывы подписок
                this._review = userMoviesService.getReview('movie', value.id);
                this._loadFollowingMovieReviews();
            }
        }
        this.render();
    }

    _loadAllSeasonReviews() {
        console.log('_loadAllSeasonReviews called:', {
            hasMovie: !!this._movie,
            hasSeasons: !!this._movie?.seasons,
            seasonsCount: this._movie?.seasons?.length
        });
        
        if (!this._movie || !this._movie.seasons) return;
        
        this._reviews = this._movie.seasons
            .filter(season => season.season_number > 0)
            .map(season => {
                const review = userMoviesService.getSeasonReview(this._movie.id, season.season_number);
                console.log('Loading review for season:', {
                    seasonNumber: season.season_number,
                    hasReview: !!review
                });
                if (review) {
                    return {
                        ...review,
                        seasonNumber: season.season_number,
                        isMyReview: true
                    };
                }
                return null;
            })
            .filter(Boolean);

        console.log('Reviews loaded:', {
            reviewsCount: this._reviews.length,
            display: this._reviews.length > 0 ? 'flex' : 'none'
        });

        this._mergeReviews();
    }
    
    /**
     * Загрузить отзывы подписок на фильм
     */
    async _loadFollowingMovieReviews() {
        if (!supabaseProfileService.isEnabled() || !this._movie) return;
        
        try {
            const reviews = await supabaseProfileService.getFollowingReviewsForMovie(this._movie.id);
            
            this._followingReviews = reviews.map(review => ({
                ...review,
                // Нормализуем поле текста отзыва: из Supabase приходит 'review', локально используется 'text'
                text: review.review || review.text || '',
                isMyReview: false,
                user: review.users || {
                    user_id: review.user_id,
                    username: null,
                    first_name: null,
                    last_name: null,
                    avatar_url: null
                }
            }));
            
            this._mergeReviews();
        } catch (error) {
            console.error('Ошибка загрузки отзывов подписок на фильм:', error);
        }
    }
    
    /**
     * Загрузить отзывы подписок на сезоны
     */
    async _loadFollowingSeasonReviews() {
        if (!supabaseProfileService.isEnabled() || !this._movie) return;
        
        try {
            const followingReviews = await supabaseProfileService.getFollowingReviewsForAllSeasons(this._movie.id);
            
            // Преобразуем в формат для отображения
            this._followingReviews = [];
            Object.entries(followingReviews).forEach(([seasonNumber, reviews]) => {
                reviews.forEach(review => {
                    this._followingReviews.push({
                        ...review,
                        // Нормализуем поле текста отзыва: из Supabase приходит 'review', локально используется 'text'
                        text: review.review || review.text || '',
                        seasonNumber: parseInt(seasonNumber),
                        isMyReview: false,
                        user: review.users || {
                            user_id: review.user_id,
                            username: null,
                            first_name: null,
                            last_name: null,
                            avatar_url: null
                        }
                    });
                });
            });
            
            this._mergeReviews();
        } catch (error) {
            console.error('Ошибка загрузки отзывов подписок на сезоны:', error);
        }
    }
    
    /**
     * Объединить мои отзывы и отзывы подписок
     */
    _mergeReviews() {
        if (this._movie.media_type === 'tv') {
            // Для сериалов группируем по сезонам
            const reviewsBySeason = {};
            
            // Добавляем мои отзывы
            this._reviews.forEach(review => {
                const seasonNum = review.seasonNumber;
                if (!reviewsBySeason[seasonNum]) {
                    reviewsBySeason[seasonNum] = [];
                }
                reviewsBySeason[seasonNum].push(review);
            });
            
            // Добавляем отзывы подписок
            this._followingReviews.forEach(review => {
                const seasonNum = review.seasonNumber;
                if (!reviewsBySeason[seasonNum]) {
                    reviewsBySeason[seasonNum] = [];
                }
                reviewsBySeason[seasonNum].push(review);
            });
            
            // Сортируем: сначала мой отзыв, потом отзывы подписок
            Object.keys(reviewsBySeason).forEach(seasonNum => {
                reviewsBySeason[seasonNum].sort((a, b) => {
                    if (a.isMyReview && !b.isMyReview) return -1;
                    if (!a.isMyReview && b.isMyReview) return 1;
                    return 0;
                });
            });
            
            // Преобразуем обратно в плоский массив для рендеринга
            this._allReviews = [];
            Object.entries(reviewsBySeason).forEach(([seasonNum, reviews]) => {
                this._allReviews.push(...reviews);
            });
        } else {
            // Для фильмов просто объединяем
            this._allReviews = [];
            if (this._review) {
                this._allReviews.push({
                    ...this._review,
                    isMyReview: true
                });
            }
            this._allReviews.push(...this._followingReviews);
        }
        
        // Обновляем отображение
        this.style.display = this._allReviews.length > 0 ? 'flex' : 'none';
        this.render();
    }

    set review(value) {
        this._review = value;
        this.render();
    }

    _getRatingEmoji(rating) {
        const emojis = {
            'X': '❌',
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
        return emojis[rating] || '❌';
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
        if (!this._movie) return;

        const userPhoto = this._user?.photo || '';
        const userName = [this._user?.firstName, this._user?.lastName]
            .filter(Boolean)
            .join(' ') || i18n.t('user');

        if (this._movie.media_type === 'tv' && this._allReviews?.length > 0) {
            this.shadowRoot.innerHTML = `
                <style>
                    :host {
                        display: flex;
                        padding: 8px 0px;
                        flex-direction: column;
                        align-items: flex-start;
                        align-self: stretch;
                        border-radius: 36px;
                        background: var(--md-sys-color-surface);
                        overflow: hidden;
                    }

                    .title {
                        text-align: center;
                        font-size: 22px;
                        font-style: normal;
                        font-weight: 600;
                        line-height: 28px;
                        color: var(--md-sys-color-on-surface);
                    }
                    
                    .title-info {
                        display: flex;
                        padding: 16px 24px;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        gap: 8px;
                        align-self: stretch;
                    }

                    .reviews-scroll {
                        display: flex;
                        overflow-x: auto;
                        overflow-y: hidden;
                        gap: 12px;
                        padding: 0 16px 16px 16px;
                        scrollbar-width: none;
                        -ms-overflow-style: none;
                        touch-action: pan-x;
                        width: 100%;
                        min-width: 0;
                        max-width: 100%;
                        -webkit-overflow-scrolling: touch;
                        align-items: stretch;
                    }

                    .reviews-scroll::-webkit-scrollbar {
                        display: none;
                    }

                    .reviews-scroll.single-review {
                        overflow-x: visible;
                        padding: 0 16px 16px 16px;
                    }

                    .review-container {
                        display: flex;
                        padding: 16px;
                        flex-direction: column;
                        gap: 8px;
                        width: 288px;
                        min-width: 288px;
                        height: 140px;
                        flex-shrink: 0;
                        background: var(--md-sys-color-surface-container);
                        border-radius: 32px;
                        box-sizing: border-box;
                    }

                    .reviews-scroll.single-review .review-container {
                        width: calc(100% - 32px);
                        min-width: auto;
                        flex-shrink: 1;
                        flex-grow: 1;
                    }
                    
                    .review-container.my-review {
                        border: 2px solid var(--md-sys-color-primary);
                    }

                    .review-container.clickable {
                        cursor: pointer;
                        transition: opacity 0.2s ease;
                    }

                    .review-container.clickable:active {
                        opacity: 0.7;
                    }

                    .review-header {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }

                    .avatar {
                        width: 40px;
                        height: 40px;
                        border-radius: 999px;
                        overflow: hidden;
                        flex-shrink: 0;
                    }
                    
                    .username {
                        color: var(--md-sys-color-outline);
                        font-size: 14px;
                        font-style: normal;
                        font-weight: 600;
                        line-height: 20px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
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
                        font-size: 16px;
                    }

                    .user-info {
                        display: flex;
                        flex-direction: column;
                        flex: 1;
                        min-width: 0;
                    }

                    .username {
                        color: var(--md-sys-color-outline);
                        font-size: 14px;
                        font-style: normal;
                        font-weight: 600;
                        line-height: 20px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .rating-stars {
                        font-size: 14px;
                        letter-spacing: -2px;
                    }

                    .review-text {
                        color: var(--md-sys-color-on-surface);
                        font-size: 14px;
                        font-style: normal;
                        font-weight: 600;
                        line-height: 20px;
                        margin: 0;
                        padding: 0;
                        display: -webkit-box;
                        -webkit-line-clamp: 3;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        flex: 1;
                    }


                    .bottom-container {
                        display: flex;
                        overflow-x: auto;
                        gap: 12px;
                        padding: 8px 16px 16px 16px;
                        scrollbar-width: none;
                        -ms-overflow-style: none;
                        touch-action: pan-x;
                    }

                    .bottom-container::-webkit-scrollbar {
                        display: none;
                    }
            
                    .bottom-wrapper {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        flex-shrink: 0;
                        position: relative;
                    }

                    .bottom-wrapper.clickable {
                        cursor: pointer;
                    }

                    .bottom-wrapper.clickable-profile {
                        cursor: pointer;
                    }

                    .bottom-avatar-wrapper {
                        width: 72px;
                        height: 72px;
                        border-radius: 999px;
                        overflow: hidden;
                        background: var(--md-sys-color-surface-container-highest);
                    }

                    .bottom-avatar {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }

                    .bottom-avatar-placeholder {
                        width: 100%;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: var(--md-sys-color-surface-container-highest);
                        color: var(--md-sys-color-on-surface);
                        font-size: 24px;
                        font-weight: 600;
                    }

                    .rating-badge {
                        position: absolute;
                        bottom: -8px;
                        background: var(--md-sys-color-primary-container);
                        color: var(--md-sys-color-on-primary-container);
                        border-radius: 999px;
                        padding: 2px 6px;
                        font-size: 11px;
                        font-weight: 600;
                        line-height: 16px;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    }
                </style>
                
                <div class="title-info">
                    <div class="title">${i18n.t('reviews')}</div>
                </div>

                <div class="reviews-scroll ${this._allReviews.length === 1 ? 'single-review' : ''}">
                    ${this._allReviews.map((review, index) => {
                        const isMyReview = review.isMyReview;
                        const reviewUser = review.user || {};
                        const reviewUserName = isMyReview 
                            ? userName 
                            : (reviewUser.first_name || reviewUser.username || i18n.t('user'));
                        const reviewUserPhoto = isMyReview 
                            ? userPhoto 
                            : (reviewUser.avatar_url || null);
                        const reviewUserInitial = reviewUserName.charAt(0).toUpperCase();
                        
                        const userId = isMyReview ? null : reviewUser.user_id;
                        const canNavigateToProfile = !isMyReview && userId;
                        
                        return `
                        <div class="review-container ${isMyReview ? 'my-review clickable' : 'clickable'}" 
                             data-is-my-review="${isMyReview}" 
                             data-review-index="${index}"
                             ${review.seasonNumber ? `data-season="${review.seasonNumber}"` : ''}>
                            <div class="review-header">
                                <div class="avatar">
                                    ${reviewUserPhoto 
                                        ? `<img src="${reviewUserPhoto}" alt="${reviewUserName}">`
                                        : `<div class="avatar-placeholder">${reviewUserInitial}</div>`
                                    }
                                </div>
                                <div class="user-info">
                                    <div class="username">${reviewUserName}${review.seasonNumber ? ` • ${i18n.t('season')} ${review.seasonNumber}` : ''}</div>
                                    <div class="rating-stars">${this._getRatingStars(review.rating)}</div>
                                </div>
                            </div>
                            ${review.review || review.text ? `<p class="review-text">${review.review || review.text}</p>` : ''}
                        </div>
                    `;
                    }).join('')}
                </div>
            `;
        } else if (this._allReviews?.length > 0) {
            this.shadowRoot.innerHTML = `
                <style>
                    :host {
                        display: flex;
                        padding: 8px 0px;
                        flex-direction: column;
                        align-items: flex-start;
                        align-self: stretch;
                        border-radius: 36px;
                        background: var(--md-sys-color-surface);
                        overflow: hidden;
                    }

                    .title {
                        text-align: center;
                        font-size: 22px;
                        font-style: normal;
                        font-weight: 600;
                        line-height: 28px;
                        color: var(--md-sys-color-on-surface);
                    }
                    
                    .title-info {
                        display: flex;
                        padding: 16px 24px;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        gap: 8px;
                        align-self: stretch;
                    }

                    .reviews-scroll {
                        display: flex;
                        overflow-x: auto;
                        overflow-y: hidden;
                        gap: 12px;
                        padding: 0 16px 16px 16px;
                        scrollbar-width: none;
                        -ms-overflow-style: none;
                        touch-action: pan-x;
                        width: 100%;
                        min-width: 0;
                        max-width: 100%;
                        -webkit-overflow-scrolling: touch;
                        align-items: stretch;
                    }

                    .reviews-scroll::-webkit-scrollbar {
                        display: none;
                    }

                    .reviews-scroll.single-review {
                        overflow-x: visible;
                        padding: 0 16px 16px 16px;
                    }

                    .review-container {
                        display: flex;
                        padding: 16px;
                        flex-direction: column;
                        gap: 8px;
                        width: 288px;
                        min-width: 288px;
                        height: 140px;
                        flex-shrink: 0;
                        background: var(--md-sys-color-surface-container);
                        border-radius: 32px;
                        box-sizing: border-box;
                    }

                    .reviews-scroll.single-review .review-container {
                        width: calc(100% - 32px);
                        min-width: auto;
                        flex-shrink: 1;
                        flex-grow: 1;
                    }
                    
                    .review-container.my-review {
                        border: 2px solid var(--md-sys-color-primary);
                    }

                    .review-container.clickable {
                        cursor: pointer;
                        transition: opacity 0.2s ease;
                    }

                    .review-container.clickable:active {
                        opacity: 0.7;
                    }

                    .review-header {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }

                    .avatar {
                        width: 40px;
                        height: 40px;
                        border-radius: 999px;
                        overflow: hidden;
                        flex-shrink: 0;
                    }
                    
                    .username {
                        color: var(--md-sys-color-outline);
                        font-size: 14px;
                        font-style: normal;
                        font-weight: 600;
                        line-height: 20px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
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
                        font-size: 16px;
                    }

                    .user-info {
                        display: flex;
                        flex-direction: column;
                        flex: 1;
                        min-width: 0;
                    }

                    .username {
                        color: var(--md-sys-color-outline);
                        font-size: 14px;
                        font-style: normal;
                        font-weight: 600;
                        line-height: 20px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .rating-stars {
                        font-size: 14px;
                        letter-spacing: -2px;
                    }

                    .review-text {
                        color: var(--md-sys-color-on-surface);
                        font-size: 14px;
                        font-style: normal;
                        font-weight: 600;
                        line-height: 20px;
                        margin: 0;
                        padding: 0;
                        display: -webkit-box;
                        -webkit-line-clamp: 3;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        flex: 1;
                    }


                    .bottom-container {
                        display: flex;
                        overflow-x: auto;
                        gap: 12px;
                        padding: 8px 16px 16px 16px;
                        scrollbar-width: none;
                        -ms-overflow-style: none;
                        touch-action: pan-x;
                    }

                    .bottom-container::-webkit-scrollbar {
                        display: none;
                    }
            
                    .bottom-wrapper {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        flex-shrink: 0;
                        position: relative;
                    }

                    .bottom-wrapper.clickable {
                        cursor: pointer;
                    }

                    .bottom-wrapper.clickable-profile {
                        cursor: pointer;
                    }

                    .bottom-avatar-wrapper {
                        width: 72px;
                        height: 72px;
                        border-radius: 999px;
                        overflow: hidden;
                        background: var(--md-sys-color-surface-container-highest);
                    }

                    .bottom-avatar {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }

                    .bottom-avatar-placeholder {
                        width: 100%;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: var(--md-sys-color-surface-container-highest);
                        color: var(--md-sys-color-on-surface);
                        font-size: 24px;
                        font-weight: 600;
                    }

                    .rating-badge {
                        position: absolute;
                        bottom: -8px;
                        background: var(--md-sys-color-primary-container);
                        color: var(--md-sys-color-on-primary-container);
                        border-radius: 999px;
                        padding: 2px 6px;
                        font-size: 11px;
                        font-weight: 600;
                        line-height: 16px;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    }
                </style>
                
                <div class="title-info">
                    <div class="title">${i18n.t('reviews')}</div>
                </div>

                <div class="reviews-scroll ${this._allReviews.length === 1 ? 'single-review' : ''}">
                    ${this._allReviews.map((review, index) => {
                        const isMyReview = review.isMyReview;
                        const reviewUser = review.user || {};
                        const reviewUserName = isMyReview 
                            ? userName 
                            : (reviewUser.first_name || reviewUser.username || i18n.t('user'));
                        const reviewUserPhoto = isMyReview 
                            ? userPhoto 
                            : (reviewUser.avatar_url || null);
                        const reviewUserInitial = reviewUserName.charAt(0).toUpperCase();
                        const userId = isMyReview ? null : reviewUser.user_id;
                        const canNavigateToProfile = !isMyReview && userId;
                        
                        return `
                        <div class="review-container ${isMyReview ? 'my-review clickable' : 'clickable'}" 
                             data-is-my-review="${isMyReview}" 
                             data-review-index="${index}">
                            <div class="review-header">
                                <div class="avatar">
                                    ${reviewUserPhoto 
                                        ? `<img src="${reviewUserPhoto}" alt="${reviewUserName}">`
                                        : `<div class="avatar-placeholder">${reviewUserInitial}</div>`
                                    }
                                </div>
                                <div class="user-info">
                                    <div class="username">${reviewUserName}</div>
                                    <div class="rating-stars">${this._getRatingStars(review.rating)}</div>
                                </div>
                            </div>
                            ${review.review || review.text ? `<p class="review-text">${review.review || review.text}</p>` : ''}
                        </div>
                    `;
                    }).join('')}
                </div>

                ${this._allReviews.length > 0 ? `
                <div class="bottom-container">
                    ${this._allReviews.map(review => {
                        const isMyReview = review.isMyReview;
                        const reviewUser = review.user || {};
                        const reviewUserName = isMyReview 
                            ? userName 
                            : (reviewUser.first_name || reviewUser.username || i18n.t('user'));
                        const reviewUserPhoto = isMyReview 
                            ? userPhoto 
                            : (reviewUser.avatar_url || null);
                        const reviewUserInitial = reviewUserName.charAt(0).toUpperCase();
                        
                        const userId = isMyReview ? null : reviewUser.user_id;
                        const canNavigateToProfile = !isMyReview && userId;
                        
                        return `
                        <div class="bottom-wrapper ${isMyReview ? 'clickable' : (canNavigateToProfile ? 'clickable-profile' : '')}" 
                             ${isMyReview ? 'data-is-my-review="true"' : ''}
                             ${canNavigateToProfile ? `data-user-id="${userId}"` : ''}>
                            <div class="bottom-avatar-wrapper">
                                ${reviewUserPhoto 
                                    ? `<img class="bottom-avatar" src="${reviewUserPhoto}" alt="${reviewUserName}">`
                                    : `<div class="bottom-avatar-placeholder">${reviewUserInitial}</div>`
                                }
                            </div>
                            <div class="rating-badge">
                                <span>★</span>
                                <span>${review.rating}</span>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
                ` : ''}
            `;
        } else {
            this.shadowRoot.innerHTML = '';
        }

        this._setupEventListeners();
    }

    _setupEventListeners() {
        // Обработчик клика на bottom-wrapper для открытия диалога редактирования (только для моего отзыва)
        this.shadowRoot.querySelectorAll('.bottom-wrapper.clickable').forEach(wrapper => {
            wrapper.addEventListener('click', () => {
                haptic.light();
                this._openReviewDialog();
            });
        });

        // Обработчик клика на bottom-wrapper для перехода к профилю пользователя (для чужих отзывов)
        this.shadowRoot.querySelectorAll('.bottom-wrapper.clickable-profile').forEach(wrapper => {
            wrapper.addEventListener('click', (e) => {
                e.stopPropagation(); // Останавливаем всплытие
                const userId = wrapper.dataset.userId;
                if (userId) {
                    haptic.light();
                    navigationManager.navigateToUserProfile(userId);
                }
            });
        });

        // Обработчик клика на review-container
        this.shadowRoot.querySelectorAll('.review-container.clickable').forEach(container => {
            container.addEventListener('click', (e) => {
                const isMyReview = container.dataset.isMyReview === 'true';
                const reviewIndex = parseInt(container.dataset.reviewIndex);
                const review = this._allReviews[reviewIndex];
                const seasonNumber = container.dataset.season;

                haptic.light();

                if (isMyReview) {
                    // Открываем диалог редактирования для своего отзыва
                    this._openReviewDialog(seasonNumber);
                } else {
                    // Открываем диалог просмотра для отзыва другого пользователя
                    this._openReviewViewDialog(review);
                }
            });
        });
    }

    _openReviewViewDialog(review) {
        const viewDialog = document.createElement('review-view-dialog');
        viewDialog.review = review;
        viewDialog.movie = this._movie;
        document.body.appendChild(viewDialog);
    }

    _openReviewDialog(seasonNumber = null) {
        if (this._movie.media_type === 'tv' && seasonNumber) {
            const reviewDialog = document.createElement('review-dialog');
            const seasonInfo = {
                ...this._movie.seasons[seasonNumber - 1],
                name: this._movie.name,
                media_type: 'tv_season'
            };
            reviewDialog.setAttribute('season-number', seasonNumber);
            reviewDialog.setAttribute('tv-id', this._movie.id);
            reviewDialog.movie = seasonInfo;
            const seasonReview = this._reviews.find(r => r.seasonNumber === parseInt(seasonNumber));
            if (seasonReview) {
                reviewDialog.review = seasonReview;
            }
            reviewDialog.isEdit = true;
            document.body.appendChild(reviewDialog);
            
            reviewDialog.addEventListener('review-submitted', () => {
                this._loadAllSeasonReviews();
            });
        } else {
            const reviewDialog = document.createElement('review-dialog');
            reviewDialog.movie = this._movie;
            if (this._review) {
                reviewDialog.review = this._review;
            }
            reviewDialog.isEdit = true;
            document.body.appendChild(reviewDialog);
            
            reviewDialog.addEventListener('review-submitted', (event) => {
                this._review = event.detail.review;
                this.render();
            });
        }
    }
}

customElements.define('movie-review', MovieReview);