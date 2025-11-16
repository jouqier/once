import { supabaseProfileService } from './supabase-profile-service.js';
import { userDataStore } from './user-data-store.js';
import { userMoviesService } from './user-movies.js';
import TMDBService from './tmdb.js';

class DataSyncService {
    constructor() {
        this._syncInProgress = false;
        this._syncTimeout = null;
    }
    
    /**
     * Синхронизировать все публичные данные
     */
    async syncAllPublicData() {
        if (this._syncInProgress) return;
        if (!supabaseProfileService.isEnabled()) return;
        
        this._syncInProgress = true;
        
        try {
            await Promise.all([
                this.syncMovies(),
                this.syncTVShows(),
                this.syncReviews(),
                this.syncProgress()
            ]);
        } catch (error) {
            console.error('Ошибка синхронизации всех данных:', error);
        } finally {
            this._syncInProgress = false;
        }
    }
    
    /**
     * Синхронизировать списки фильмов
     */
    async syncMovies() {
        if (!supabaseProfileService.isEnabled()) return;
        
        try {
            const wantList = userDataStore.getMovies('want');
            const watchedList = userDataStore.getMovies('watched');
            
            await Promise.all([
                supabaseProfileService.syncMyMovies('want', wantList),
                supabaseProfileService.syncMyMovies('watched', watchedList)
            ]);
        } catch (error) {
            console.error('Ошибка синхронизации фильмов:', error);
        }
    }
    
    /**
     * Синхронизировать списки сериалов
     */
    async syncTVShows() {
        if (!supabaseProfileService.isEnabled()) return;
        
        try {
            const wantList = userDataStore.getTVShows('want');
            const watchingList = userDataStore.getTVShows('watching');
            const watchedList = userDataStore.getTVShows('watched');
            
            await Promise.all([
                supabaseProfileService.syncMyTVShows('want', wantList),
                supabaseProfileService.syncMyTVShows('watching', watchingList),
                supabaseProfileService.syncMyTVShows('watched', watchedList)
            ]);
        } catch (error) {
            console.error('Ошибка синхронизации сериалов:', error);
        }
    }
    
    /**
     * Синхронизировать отзывы
     */
    async syncReviews() {
        if (!supabaseProfileService.isEnabled()) return;
        
        try {
            // Синхронизируем отзывы на фильмы
            const movieReviews = userDataStore._adapter.getAllMovieReviews();
            const moviePromises = Object.entries(movieReviews).map(([movieId, review]) => {
                return supabaseProfileService.syncMyMovieReview(
                    parseInt(movieId),
                    review
                );
            });
            
            // Синхронизируем отзывы на сезоны
            const seasonReviews = userDataStore._adapter.getAllSeasonReviews();
            const seasonPromises = Object.entries(seasonReviews).map(([key, review]) => {
                const [tvId, seasonNumber] = key.split('_');
                return supabaseProfileService.syncMySeasonReview(
                    parseInt(tvId),
                    parseInt(seasonNumber),
                    review
                );
            });
            
            await Promise.all([...moviePromises, ...seasonPromises]);
        } catch (error) {
            console.error('Ошибка синхронизации отзывов:', error);
        }
    }
    
    /**
     * Синхронизировать статистику прогресса
     */
    async syncProgress() {
        if (!supabaseProfileService.isEnabled()) return;
        
        try {
            // Получаем все сериалы с прогрессом
            const allEpisodes = userDataStore._adapter._getAllEpisodesData();
            const tvIds = Object.keys(allEpisodes).map(id => parseInt(id));
            
            if (tvIds.length === 0) return;
            
            // Используем метод из userMoviesService для правильного подсчета прогресса
            const progressPromises = tvIds.map(async (tvId) => {
                try {
                    const progress = await userMoviesService.getShowProgress(tvId);
                    if (progress && progress.watchedEpisodes > 0) {
                        return supabaseProfileService.syncMyTVProgress(
                            tvId,
                            progress.watchedEpisodes,
                            progress.totalEpisodes
                        );
                    }
                } catch (error) {
                    console.warn(`Не удалось синхронизировать прогресс сериала ${tvId}:`, error);
                }
            });
            
            await Promise.all(progressPromises);
        } catch (error) {
            console.error('Ошибка синхронизации прогресса:', error);
        }
    }
    
    /**
     * Дебаунсированная синхронизация (не чаще раза в секунду)
     */
    syncWithDebounce() {
        if (this._syncTimeout) {
            clearTimeout(this._syncTimeout);
        }
        
        this._syncTimeout = setTimeout(async () => {
            try {
                await this.syncAllPublicData();
            } catch (error) {
                console.warn('Ошибка дебаунсированной синхронизации:', error);
            }
        }, 1000);
    }
    
    /**
     * Проверить статус синхронизации
     */
    async isSynced() {
        // Простая проверка - если Supabase включен, считаем что синхронизация возможна
        return supabaseProfileService.isEnabled();
    }
}

export const dataSyncService = new DataSyncService();

