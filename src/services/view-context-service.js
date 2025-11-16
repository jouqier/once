import { supabaseProfileService } from './supabase-profile-service.js';
import { userMoviesService } from './user-movies.js';

class ViewContextService {
    constructor() {
        this._viewingUserId = null;
        this._isViewingOtherProfile = false;
        this._sourceTab = null;
        this._currentUserId = null;
    }
    
    init(currentUserId) {
        this._currentUserId = currentUserId;
        supabaseProfileService.init(currentUserId);
    }
    
    setViewingContext(userId, sourceTab) {
        this._viewingUserId = userId;
        this._isViewingOtherProfile = userId !== null && 
            userId !== this._currentUserId;
        this._sourceTab = sourceTab;
    }
    
    clearViewingContext() {
        this._viewingUserId = null;
        this._isViewingOtherProfile = false;
        this._sourceTab = null;
    }
    
    isViewingOtherProfile() {
        return this._isViewingOtherProfile;
    }
    
    getViewingUserId() {
        return this._viewingUserId;
    }
    
    // ========== ДЛЯ БЕЙДЖЕЙ НА ПОСТЕРАХ (в профиле) ==========
    
    /**
     * Получить рейтинг для бейджа на постере в профиле
     * Показывает рейтинг владельца профиля, если просматриваем чужой профиль
     */
    async getRatingForBadge(movieId) {
        if (this._isViewingOtherProfile) {
            // Показываем рейтинг владельца профиля
            const review = await supabaseProfileService.getUserMovieReview(
                this._viewingUserId, 
                movieId
            );
            return review?.rating || null;
        } else {
            // Показываем свой рейтинг
            const review = userMoviesService.getReview('movie', movieId);
            return review?.rating || null;
        }
    }
    
    /**
     * Получить прогресс для бейджа на постере в профиле
     * Показывает прогресс владельца профиля, если просматриваем чужой профиль
     */
    async getProgressForBadge(tvId) {
        if (this._isViewingOtherProfile) {
            // Показываем прогресс владельца профиля (только количество)
            return await supabaseProfileService.getUserTVProgress(
                this._viewingUserId, 
                tvId
            );
        } else {
            // Показываем свой прогресс
            return await userMoviesService.getShowProgress(tvId);
        }
    }
    
    // ========== ДЛЯ ДЕТАЛЬНОГО ПРОСМОТРА (всегда свои данные) ==========
    
    /**
     * Получить рейтинг для детальной карточки (всегда свой!)
     */
    getRatingForDetails(movieId) {
        // ВСЕГДА возвращаем свой рейтинг, даже если смотрим чужой профиль
        const review = userMoviesService.getReview('movie', movieId);
        return review?.rating || null;
    }
    
    /**
     * Получить отзыв для детальной карточки (всегда свой!)
     */
    getReviewForDetails(type, id, seasonNumber = null) {
        // ВСЕГДА возвращаем свой отзыв
        return userMoviesService.getReview(type, id, seasonNumber);
    }
    
    /**
     * Получить прогресс для детального просмотра (всегда свой!)
     */
    async getProgressForDetails(tvId) {
        // ВСЕГДА возвращаем свой прогресс
        return await userMoviesService.getShowProgress(tvId);
    }
}

export const viewContextService = new ViewContextService();

