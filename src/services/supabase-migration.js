import TMDBService from './tmdb.js';
import { userDataStore } from './user-data-store.js';
import { supabaseProfileService } from './supabase-profile-service.js';

class SupabaseMigration {
    constructor() {
        this._userDataStore = userDataStore;
    }
    
    /**
     * Мигрировать все данные пользователя в Supabase
     */
    async migrateAllData() {
        const userId = this._userDataStore._userId;
        
        if (userId === 'guest') {
            console.warn('Гостевой режим: миграция невозможна');
            return false;
        }
        
        if (!supabaseProfileService.isEnabled()) {
            console.warn('Supabase не настроен: миграция невозможна');
            return false;
        }
        
        try {
            console.log('🔄 Начало миграции данных в Supabase...');
            
            // 1. Создать/обновить профиль
            await this._migrateProfile(userId);
            
            // 2. Мигрировать списки фильмов
            await this._migrateMovies(userId);
            
            // 3. Мигрировать списки сериалов
            await this._migrateTVShows(userId);
            
            // 4. Мигрировать отзывы
            await this._migrateReviews(userId);
            
            // 5. Мигрировать статистику прогресса
            await this._migrateProgress(userId);
            
            console.log('✅ Миграция данных завершена');
            return true;
        } catch (error) {
            console.error('❌ Ошибка миграции:', error);
            return false;
        }
    }
    
    /**
     * Мигрировать профиль пользователя
     */
    async _migrateProfile(userId) {
        try {
            const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
            if (!user) {
                console.warn('Не удалось получить данные пользователя Telegram');
                return;
            }
            
            const profileData = {
                user_id: userId,
                username: user.username || null,
                first_name: user.first_name || null,
                last_name: user.last_name || null,
                avatar_url: user.photo_url || null,
                is_public: true // По умолчанию публичный профиль
            };
            
            await supabaseProfileService.updateMyProfile(profileData);
            console.log('✅ Профиль мигрирован');
        } catch (error) {
            console.error('Ошибка миграции профиля:', error);
        }
    }
    
    /**
     * Мигрировать списки фильмов
     */
    async _migrateMovies(userId) {
        try {
            const wantList = this._userDataStore.getMovies('want');
            const watchedList = this._userDataStore.getMovies('watched');
            
            await Promise.all([
                supabaseProfileService.syncMyMovies('want', wantList),
                supabaseProfileService.syncMyMovies('watched', watchedList)
            ]);
            
            console.log(`✅ Фильмы мигрированы: want=${wantList.length}, watched=${watchedList.length}`);
        } catch (error) {
            console.error('Ошибка миграции фильмов:', error);
        }
    }
    
    /**
     * Мигрировать списки сериалов
     */
    async _migrateTVShows(userId) {
        try {
            const wantList = this._userDataStore.getTVShows('want');
            const watchingList = this._userDataStore.getTVShows('watching');
            const watchedList = this._userDataStore.getTVShows('watched');
            
            await Promise.all([
                supabaseProfileService.syncMyTVShows('want', wantList),
                supabaseProfileService.syncMyTVShows('watching', watchingList),
                supabaseProfileService.syncMyTVShows('watched', watchedList)
            ]);
            
            console.log(`✅ Сериалы мигрированы: want=${wantList.length}, watching=${watchingList.length}, watched=${watchedList.length}`);
        } catch (error) {
            console.error('Ошибка миграции сериалов:', error);
        }
    }
    
    /**
     * Мигрировать отзывы
     */
    async _migrateReviews(userId) {
        try {
            // Мигрировать отзывы на фильмы
            const movieReviews = this._userDataStore._adapter.getAllMovieReviews();
            let movieCount = 0;
            
            for (const [movieId, review] of Object.entries(movieReviews)) {
                if (review && review.rating) {
                    await supabaseProfileService.syncMyMovieReview(
                        parseInt(movieId),
                        review
                    );
                    movieCount++;
                }
            }
            
            // Мигрировать отзывы на сезоны
            const seasonReviews = this._userDataStore._adapter.getAllSeasonReviews();
            let seasonCount = 0;
            
            for (const [key, review] of Object.entries(seasonReviews)) {
                if (review && review.rating) {
                    const [tvId, seasonNumber] = key.split('_');
                    await supabaseProfileService.syncMySeasonReview(
                        parseInt(tvId),
                        parseInt(seasonNumber),
                        review
                    );
                    seasonCount++;
                }
            }
            
            console.log(`✅ Отзывы мигрированы: фильмы=${movieCount}, сезоны=${seasonCount}`);
        } catch (error) {
            console.error('Ошибка миграции отзывов:', error);
        }
    }
    
    /**
     * Мигрировать статистику прогресса
     */
    async _migrateProgress(userId) {
        try {
            // Получить все сериалы с прогрессом
            const allEpisodes = this._userDataStore._adapter._getAllEpisodesData();
            let progressCount = 0;
            
            for (const [tvId, tvData] of Object.entries(allEpisodes)) {
                // Подсчитать количество просмотренных эпизодов
                let watchedCount = 0;
                Object.values(tvData).forEach(episodes => {
                    if (Array.isArray(episodes)) {
                        // Если это диапазон [1, 30], берем второй элемент
                        if (episodes.length === 2 && typeof episodes[0] === 'number' && typeof episodes[1] === 'number') {
                            watchedCount += episodes[1];
                        } else {
                            // Иначе считаем длину массива
                            watchedCount += episodes.length;
                        }
                    }
                });
                
                if (watchedCount > 0) {
                    // Получить общее количество эпизодов из TMDB
                    try {
                        const details = await TMDBService.getTVDetails(parseInt(tvId));
                        if (details && details.seasons) {
                            const totalEpisodes = details.seasons.reduce((total, season) => {
                                if (season.season_number === 0) return total;
                                return total + season.episode_count;
                            }, 0);
                            
                            await supabaseProfileService.syncMyTVProgress(
                                parseInt(tvId),
                                watchedCount,
                                totalEpisodes
                            );
                            progressCount++;
                        }
                    } catch (error) {
                        console.warn(`Не удалось получить детали сериала ${tvId}:`, error);
                    }
                }
            }
            
            console.log(`✅ Прогресс мигрирован: сериалов=${progressCount}`);
        } catch (error) {
            console.error('Ошибка миграции прогресса:', error);
        }
    }
}

export const supabaseMigration = new SupabaseMigration();

