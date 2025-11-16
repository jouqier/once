import { createClient } from '@supabase/supabase-js';

class SupabaseProfileService {
    constructor() {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const enabled = import.meta.env.VITE_SUPABASE_ENABLED === 'true';
        
        if (!supabaseUrl || !supabaseKey || !enabled) {
            console.warn('Supabase не настроен. Социальные функции недоступны.');
            this._enabled = false;
            return;
        }
        
        this._supabase = createClient(supabaseUrl, supabaseKey);
        this._enabled = true;
        this._currentUserId = null;
    }
    
    init(telegramUserId) {
        this._currentUserId = telegramUserId;
    }
    
    isEnabled() {
        return this._enabled && !!this._currentUserId;
    }
    
    // ========== МЕТОДЫ ПРОФИЛЕЙ ==========
    
    /**
     * Получить профиль пользователя
     */
    async getUserProfile(userId) {
        if (!this.isEnabled()) return null;
        
        try {
            const { data, error } = await this._supabase
                .from('users')
                .select('*')
                .eq('user_id', userId)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    // Профиль не найден
                    return null;
                }
                throw error;
            }
            
            return data;
        } catch (error) {
            console.error('Ошибка получения профиля пользователя:', error);
            return null;
        }
    }
    
    /**
     * Обновить свой профиль
     */
    async updateMyProfile(profileData) {
        if (!this.isEnabled()) return false;
        
        try {
            const { error } = await this._supabase
                .from('users')
                .upsert({
                    user_id: this._currentUserId,
                    ...profileData,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Ошибка обновления профиля:', error);
            return false;
        }
    }
    
    /**
     * Поиск пользователей по username
     */
    async searchUsers(query) {
        if (!this.isEnabled()) return [];
        
        try {
            const { data, error } = await this._supabase
                .from('users')
                .select('user_id, username, first_name, last_name, avatar_url')
                .ilike('username', `%${query}%`)
                .limit(20);
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Ошибка поиска пользователей:', error);
            return [];
        }
    }
    
    // ========== МЕТОДЫ СПИСКОВ ФИЛЬМОВ ==========
    
    /**
     * Получить список фильмов пользователя
     */
    async getUserMovies(userId, listType) {
        if (!this.isEnabled()) return [];
        
        try {
            const { data, error } = await this._supabase
                .from('public_user_movies')
                .select('movie_id')
                .eq('user_id', userId)
                .eq('list_type', listType);
            
            if (error) throw error;
            return (data || []).map(row => row.movie_id);
        } catch (error) {
            console.error('Ошибка получения списка фильмов:', error);
            return [];
        }
    }
    
    /**
     * Синхронизировать свой список фильмов
     */
    async syncMyMovies(listType, movieIds) {
        if (!this.isEnabled()) return false;
        
        try {
            // Удаляем старые записи для этого типа списка
            const { error: deleteError } = await this._supabase
                .from('public_user_movies')
                .delete()
                .eq('user_id', this._currentUserId)
                .eq('list_type', listType);
            
            if (deleteError) throw deleteError;
            
            // Добавляем новые записи
            if (movieIds.length > 0) {
                const records = movieIds.map(movieId => ({
                    user_id: this._currentUserId,
                    movie_id: movieId,
                    list_type: listType
                }));
                
                const { error: insertError } = await this._supabase
                    .from('public_user_movies')
                    .insert(records);
                
                if (insertError) throw insertError;
            }
            
            return true;
        } catch (error) {
            console.error('Ошибка синхронизации списка фильмов:', error);
            return false;
        }
    }
    
    // ========== МЕТОДЫ СПИСКОВ СЕРИАЛОВ ==========
    
    /**
     * Получить список сериалов пользователя
     */
    async getUserTVShows(userId, listType) {
        if (!this.isEnabled()) return [];
        
        try {
            const { data, error } = await this._supabase
                .from('public_user_tv_shows')
                .select('tv_id')
                .eq('user_id', userId)
                .eq('list_type', listType);
            
            if (error) throw error;
            return (data || []).map(row => row.tv_id);
        } catch (error) {
            console.error('Ошибка получения списка сериалов:', error);
            return [];
        }
    }
    
    /**
     * Синхронизировать свой список сериалов
     */
    async syncMyTVShows(listType, tvIds) {
        if (!this.isEnabled()) return false;
        
        try {
            // Удаляем старые записи для этого типа списка
            const { error: deleteError } = await this._supabase
                .from('public_user_tv_shows')
                .delete()
                .eq('user_id', this._currentUserId)
                .eq('list_type', listType);
            
            if (deleteError) throw deleteError;
            
            // Добавляем новые записи
            if (tvIds.length > 0) {
                const records = tvIds.map(tvId => ({
                    user_id: this._currentUserId,
                    tv_id: tvId,
                    list_type: listType
                }));
                
                const { error: insertError } = await this._supabase
                    .from('public_user_tv_shows')
                    .insert(records);
                
                if (insertError) throw insertError;
            }
            
            return true;
        } catch (error) {
            console.error('Ошибка синхронизации списка сериалов:', error);
            return false;
        }
    }
    
    // ========== МЕТОДЫ ОТЗЫВОВ ==========
    
    /**
     * Получить отзыв пользователя на фильм
     */
    async getUserMovieReview(userId, movieId) {
        if (!this.isEnabled()) return null;
        
        try {
            const { data, error } = await this._supabase
                .from('public_movie_reviews')
                .select('*')
                .eq('user_id', userId)
                .eq('movie_id', movieId)
                .maybeSingle();
            
            if (error) {
                // Обрабатываем ошибку 406 (Not Acceptable) - возможно проблема с RLS или view
                if (error.code === 'PGRST116' || error.status === 406) {
                    console.warn('Отзыв не найден или недоступен:', error);
                    return null;
                }
                throw error;
            }
            
            return data;
        } catch (error) {
            console.error('Ошибка получения отзыва на фильм:', error);
            return null;
        }
    }
    
    /**
     * Получить отзыв пользователя на сезон
     */
    async getUserSeasonReview(userId, tvId, seasonNumber) {
        if (!this.isEnabled()) return null;
        
        try {
            const { data, error } = await this._supabase
                .from('public_season_reviews')
                .select('*')
                .eq('user_id', userId)
                .eq('tv_id', tvId)
                .eq('season_number', seasonNumber)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw error;
            }
            
            return data;
        } catch (error) {
            console.error('Ошибка получения отзыва на сезон:', error);
            return null;
        }
    }
    
    /**
     * Получить отзывы подписок на фильм (только тех, на кого подписан)
     */
    async getFollowingReviewsForMovie(movieId) {
        if (!this.isEnabled()) return [];
        
        try {
            // Получаем список подписок
            const following = await this.getFollowing(this._currentUserId);
            const followingIds = following.map(f => f.following_id);
            
            if (followingIds.length === 0) return [];
            
            // Сначала получаем отзывы
            const { data: reviews, error: reviewsError } = await this._supabase
                .from('public_movie_reviews')
                .select('*')
                .eq('movie_id', movieId)
                .in('user_id', followingIds);
            
            if (reviewsError) {
                // Обрабатываем ошибку 406 (Not Acceptable) - возможно проблема с RLS или view
                if (reviewsError.status === 406) {
                    console.warn('Отзывы недоступны (406):', reviewsError);
                    return [];
                }
                console.error('Ошибка получения отзывов:', reviewsError);
                throw reviewsError;
            }
            
            if (!reviews || reviews.length === 0) return [];
            
            // Затем получаем данные пользователей отдельным запросом
            const userIds = [...new Set(reviews.map(r => r.user_id))];
            const { data: users, error: usersError } = await this._supabase
                .from('users')
                .select('user_id, username, first_name, last_name, avatar_url')
                .in('user_id', userIds);
            
            if (usersError) {
                console.error('Ошибка получения данных пользователей:', usersError);
                // Продолжаем работу даже если не удалось получить данные пользователей
            }
            
            // Объединяем отзывы с данными пользователей
            const usersMap = new Map((users || []).map(u => [u.user_id, u]));
            
            return reviews.map(review => ({
                ...review,
                users: usersMap.get(review.user_id) || {
                    user_id: review.user_id,
                    username: null,
                    first_name: null,
                    last_name: null,
                    avatar_url: null
                }
            }));
        } catch (error) {
            console.error('Ошибка получения отзывов подписок на фильм:', error);
            return [];
        }
    }
    
    /**
     * Получить отзывы подписок на все сезоны сериала
     */
    async getFollowingReviewsForAllSeasons(tvId) {
        if (!this.isEnabled()) return {};
        
        try {
            // Получаем список подписок
            const following = await this.getFollowing(this._currentUserId);
            const followingIds = following.map(f => f.following_id);
            
            if (followingIds.length === 0) return {};
            
            // Сначала получаем отзывы
            const { data: reviews, error: reviewsError } = await this._supabase
                .from('public_season_reviews')
                .select('*')
                .eq('tv_id', tvId)
                .in('user_id', followingIds);
            
            if (reviewsError) {
                console.error('Ошибка получения отзывов на сезоны:', reviewsError);
                throw reviewsError;
            }
            
            if (!reviews || reviews.length === 0) return {};
            
            // Затем получаем данные пользователей отдельным запросом
            const userIds = [...new Set(reviews.map(r => r.user_id))];
            const { data: users, error: usersError } = await this._supabase
                .from('users')
                .select('user_id, username, first_name, last_name, avatar_url')
                .in('user_id', userIds);
            
            if (usersError) {
                console.error('Ошибка получения данных пользователей:', usersError);
                // Продолжаем работу даже если не удалось получить данные пользователей
            }
            
            // Объединяем отзывы с данными пользователей
            const usersMap = new Map((users || []).map(u => [u.user_id, u]));
            const reviewsWithUsers = reviews.map(review => ({
                ...review,
                users: usersMap.get(review.user_id) || {
                    user_id: review.user_id,
                    username: null,
                    first_name: null,
                    last_name: null,
                    avatar_url: null
                }
            }));
            
            // Группируем по сезонам
            const reviewsBySeason = {};
            reviewsWithUsers.forEach(review => {
                const seasonNum = review.season_number;
                if (!reviewsBySeason[seasonNum]) {
                    reviewsBySeason[seasonNum] = [];
                }
                reviewsBySeason[seasonNum].push(review);
            });
            
            return reviewsBySeason;
        } catch (error) {
            console.error('Ошибка получения отзывов подписок на сезоны:', error);
            return {};
        }
    }
    
    /**
     * Синхронизировать свой отзыв на фильм
     */
    async syncMyMovieReview(movieId, review) {
        if (!this.isEnabled()) return false;
        
        try {
            if (!review || !review.rating) {
                // Удаляем отзыв, если его нет или нет рейтинга
                const { error } = await this._supabase
                    .from('public_movie_reviews')
                    .delete()
                    .eq('user_id', this._currentUserId)
                    .eq('movie_id', movieId);
                
                if (error) {
                    // Обрабатываем ошибку 406 (Not Acceptable)
                    if (error.status === 406) {
                        console.warn('Не удалось удалить отзыв (406):', error);
                        return false;
                    }
                    throw error;
                }
                return true;
            }
            
            const { error } = await this._supabase
                .from('public_movie_reviews')
                .upsert({
                    user_id: this._currentUserId,
                    movie_id: movieId,
                    rating: review.rating,
                    review: review.text || review.review || null,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,movie_id'
                });
            
            if (error) {
                // Обрабатываем ошибку 406 (Not Acceptable)
                if (error.status === 406) {
                    console.warn('Не удалось сохранить отзыв (406):', error);
                    return false;
                }
                throw error;
            }
            return true;
        } catch (error) {
            console.error('Ошибка синхронизации отзыва на фильм:', error);
            return false;
        }
    }
    
    /**
     * Синхронизировать свой отзыв на сезон
     */
    async syncMySeasonReview(tvId, seasonNumber, review) {
        if (!this.isEnabled()) return false;
        
        try {
            if (!review || !review.rating) {
                // Удаляем отзыв, если его нет или нет рейтинга
                const { error } = await this._supabase
                    .from('public_season_reviews')
                    .delete()
                    .eq('user_id', this._currentUserId)
                    .eq('tv_id', tvId)
                    .eq('season_number', seasonNumber);
                
                if (error) throw error;
                return true;
            }
            
            const { error } = await this._supabase
                .from('public_season_reviews')
                .upsert({
                    user_id: this._currentUserId,
                    tv_id: tvId,
                    season_number: seasonNumber,
                    rating: review.rating,
                    review: review.text || review.review || null,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,tv_id,season_number'
                });
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Ошибка синхронизации отзыва на сезон:', error);
            return false;
        }
    }
    
    // ========== МЕТОДЫ ПРОГРЕССА ==========
    
    /**
     * Получить прогресс пользователя по сериалу
     */
    async getUserTVProgress(userId, tvId) {
        if (!this.isEnabled()) return null;
        
        try {
            const { data, error } = await this._supabase
                .from('public_tv_progress')
                .select('*')
                .eq('user_id', userId)
                .eq('tv_id', tvId)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    return null;
                }
                throw error;
            }
            
            return {
                watchedEpisodes: data.watched_episodes_count || 0,
                totalEpisodes: data.total_episodes || 0
            };
        } catch (error) {
            console.error('Ошибка получения прогресса сериала:', error);
            return null;
        }
    }
    
    /**
     * Синхронизировать свой прогресс по сериалу
     */
    async syncMyTVProgress(tvId, watchedCount, totalEpisodes) {
        if (!this.isEnabled()) return false;
        
        try {
            const { error } = await this._supabase
                .from('public_tv_progress')
                .upsert({
                    user_id: this._currentUserId,
                    tv_id: tvId,
                    watched_episodes_count: watchedCount,
                    total_episodes: totalEpisodes,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,tv_id'
                });
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Ошибка синхронизации прогресса сериала:', error);
            return false;
        }
    }
    
    // ========== МЕТОДЫ ПОДПИСОК ==========
    
    /**
     * Подписаться на пользователя
     */
    async followUser(targetUserId) {
        if (!this.isEnabled()) return false;
        if (targetUserId === this._currentUserId) return false;
        
        try {
            const { error } = await this._supabase
                .from('user_follows')
                .insert({
                    follower_id: this._currentUserId,
                    following_id: targetUserId
                });
            
            if (error) {
                // Если уже подписан, игнорируем ошибку
                if (error.code === '23505') {
                    return true;
                }
                // Обрабатываем ошибку 406 (Not Acceptable)
                if (error.status === 406) {
                    console.warn('Не удалось подписаться на пользователя (406):', error);
                    return false;
                }
                throw error;
            }
            
            // Отправляем событие об изменении подписок
            document.dispatchEvent(new CustomEvent('user-follows-changed', {
                detail: { action: 'follow', userId: targetUserId }
            }));
            
            return true;
        } catch (error) {
            console.error('Ошибка подписки на пользователя:', error);
            return false;
        }
    }
    
    /**
     * Отписаться от пользователя
     */
    async unfollowUser(targetUserId) {
        if (!this.isEnabled()) return false;
        
        try {
            const { error } = await this._supabase
                .from('user_follows')
                .delete()
                .eq('follower_id', this._currentUserId)
                .eq('following_id', targetUserId);
            
            if (error) {
                // Обрабатываем ошибку 406 (Not Acceptable)
                if (error.status === 406) {
                    console.warn('Не удалось отписаться от пользователя (406):', error);
                    return false;
                }
                throw error;
            }
            
            // Отправляем событие об изменении подписок
            document.dispatchEvent(new CustomEvent('user-follows-changed', {
                detail: { action: 'unfollow', userId: targetUserId }
            }));
            
            return true;
        } catch (error) {
            console.error('Ошибка отписки от пользователя:', error);
            return false;
        }
    }
    
    /**
     * Получить список подписчиков пользователя
     */
    async getFollowers(userId) {
        if (!this.isEnabled()) return [];
        
        try {
            const { data, error } = await this._supabase
                .from('user_follows')
                .select(`
                    follower_id,
                    users!user_follows_follower_id_fkey (
                        user_id, username, first_name, last_name, avatar_url
                    )
                `)
                .eq('following_id', userId);
            
            if (error) {
                // Обрабатываем ошибку 406 (Not Acceptable)
                if (error.status === 406) {
                    console.warn('Не удалось получить подписчиков (406):', error);
                    return [];
                }
                throw error;
            }
            return data || [];
        } catch (error) {
            console.error('Ошибка получения подписчиков:', error);
            return [];
        }
    }
    
    /**
     * Получить список подписок пользователя
     */
    async getFollowing(userId) {
        if (!this.isEnabled()) return [];
        
        try {
            const { data, error } = await this._supabase
                .from('user_follows')
                .select(`
                    following_id,
                    users!user_follows_following_id_fkey (
                        user_id, username, first_name, last_name, avatar_url
                    )
                `)
                .eq('follower_id', userId);
            
            if (error) {
                // Обрабатываем ошибку 406 (Not Acceptable)
                if (error.status === 406) {
                    console.warn('Не удалось получить подписки (406):', error);
                    return [];
                }
                throw error;
            }
            return data || [];
        } catch (error) {
            console.error('Ошибка получения подписок:', error);
            return [];
        }
    }
    
    /**
     * Проверить, подписан ли текущий пользователь на другого
     */
    async isFollowing(targetUserId) {
        if (!this.isEnabled()) return false;
        
        try {
            const { data, error } = await this._supabase
                .from('user_follows')
                .select('following_id')
                .eq('follower_id', this._currentUserId)
                .eq('following_id', targetUserId)
                .maybeSingle();
            
            if (error) {
                // Обрабатываем ошибку 406 (Not Acceptable) и отсутствие записи
                if (error.code === 'PGRST116' || error.status === 406) {
                    return false;
                }
                throw error;
            }
            
            return !!data;
        } catch (error) {
            console.error('Ошибка проверки подписки:', error);
            return false;
        }
    }
}

export const supabaseProfileService = new SupabaseProfileService();

