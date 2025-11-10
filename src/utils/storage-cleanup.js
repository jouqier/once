/**
 * Утилиты для очистки и оптимизации LocalStorage
 */

export class StorageCleanup {
    /**
     * Получить размер данных пользователя в KB
     */
    static getStorageSize(userId) {
        try {
            const data = localStorage.getItem(`user_data_${userId}`);
            if (!data) return 0;
            return (data.length / 1024).toFixed(2);
        } catch (error) {
            console.error('Error getting storage size:', error);
            return 0;
        }
    }

    /**
     * Получить детальную статистику по хранилищу
     */
    static getStorageStats(userId) {
        try {
            const data = localStorage.getItem(`user_data_${userId}`);
            if (!data) return null;

            const parsed = JSON.parse(data);
            const totalSize = (data.length / 1024).toFixed(2);

            return {
                totalSize: `${totalSize} KB`,
                version: parsed.version,
                movies: {
                    want: parsed.movies?.want?.length || 0,
                    watched: parsed.movies?.watched?.length || 0,
                    reviews: Object.keys(parsed.movies?.reviews || {}).length
                },
                tvShows: {
                    want: parsed.tvShows?.want?.length || 0,
                    watching: parsed.tvShows?.watching?.length || 0,
                    watched: parsed.tvShows?.watched?.length || 0,
                    episodes: Object.keys(parsed.tvShows?.episodes || {}).length,
                    seasonReviews: Object.keys(parsed.tvShows?.seasonReviews || {}).length,
                    reviews: Object.keys(parsed.tvShows?.reviews || {}).length
                },
                recentSearches: this._getRecentSearchesCount(userId)
            };
        } catch (error) {
            console.error('Error getting storage stats:', error);
            return null;
        }
    }

    /**
     * Удалить activity (больше не используется)
     */
    static cleanupActivity(userId) {
        try {
            const data = localStorage.getItem(`user_data_${userId}`);
            if (!data) return false;

            const parsed = JSON.parse(data);
            if (parsed.activity) {
                delete parsed.activity;
                localStorage.setItem(`user_data_${userId}`, JSON.stringify(parsed));
                console.log('Удалено поле activity (больше не используется)');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error cleaning up activity:', error);
            return false;
        }
    }

    /**
     * Очистить недавние поиски (оставить только последние N)
     * Теперь работает с sessionStorage
     */
    static cleanupRecentSearches(userId, keepLast = 10) {
        try {
            const key = `recent_searches_${userId}`;
            const data = sessionStorage.getItem(key);
            if (!data) return false;

            const recent = JSON.parse(data);
            if (Array.isArray(recent) && recent.length > keepLast) {
                const removed = recent.length - keepLast;
                const trimmed = recent.slice(0, keepLast);
                sessionStorage.setItem(key, JSON.stringify(trimmed));
                console.log(`Удалено ${removed} старых поисков из sessionStorage`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error cleaning up recent searches:', error);
            return false;
        }
    }

    /**
     * Получить количество недавних поисков из sessionStorage
     */
    static _getRecentSearchesCount(userId) {
        try {
            const key = `recent_searches_${userId}`;
            const data = sessionStorage.getItem(key);
            if (data) {
                const recent = JSON.parse(data);
                return Array.isArray(recent) ? recent.length : 0;
            }
        } catch (error) {
            // Игнорируем ошибки
        }
        return 0;
    }

    /**
     * Удалить отзывы на несуществующие фильмы/сериалы
     */
    static cleanupOrphanedReviews(userId) {
        try {
            const data = localStorage.getItem(`user_data_${userId}`);
            if (!data) return false;

            const parsed = JSON.parse(data);
            let cleaned = false;

            // Собираем все ID фильмов
            const movieIds = new Set([
                ...(parsed.movies?.want || []),
                ...(parsed.movies?.watched || [])
            ]);

            // Удаляем отзывы на фильмы, которых нет в списках
            if (parsed.movies?.reviews) {
                Object.keys(parsed.movies.reviews).forEach(id => {
                    if (!movieIds.has(parseInt(id))) {
                        delete parsed.movies.reviews[id];
                        cleaned = true;
                    }
                });
            }

            // Собираем все ID сериалов
            const tvIds = new Set([
                ...(parsed.tvShows?.want || []),
                ...(parsed.tvShows?.watching || []),
                ...(parsed.tvShows?.watched || [])
            ]);

            // Удаляем tvShows.reviews если он существует (больше не используется)
            if (parsed.tvShows?.reviews) {
                delete parsed.tvShows.reviews;
                cleaned = true;
            }

            // Удаляем отзывы на сезоны сериалов, которых нет в списках
            if (parsed.tvShows?.seasonReviews) {
                Object.keys(parsed.tvShows.seasonReviews).forEach(key => {
                    const tvId = parseInt(key.split('_')[0]);
                    if (!tvIds.has(tvId)) {
                        delete parsed.tvShows.seasonReviews[key];
                        cleaned = true;
                    }
                });
            }

            // Удаляем эпизоды сериалов, которых нет в списках
            if (parsed.tvShows?.episodes) {
                Object.keys(parsed.tvShows.episodes).forEach(key => {
                    const tvId = parseInt(key.split('_')[0]);
                    if (!tvIds.has(tvId)) {
                        delete parsed.tvShows.episodes[key];
                        cleaned = true;
                    }
                });
            }

            if (cleaned) {
                localStorage.setItem(`user_data_${userId}`, JSON.stringify(parsed));
                console.log('Удалены отзывы и данные для несуществующих фильмов/сериалов');
            }

            return cleaned;
        } catch (error) {
            console.error('Error cleaning up orphaned reviews:', error);
            return false;
        }
    }

    /**
     * Полная очистка и оптимизация
     */
    static fullCleanup(userId) {
        console.log('Начинается полная очистка хранилища...');
        
        const before = this.getStorageSize(userId);
        console.log(`Размер до очистки: ${before} KB`);

        this.cleanupActivity(userId, 50);
        this.cleanupRecentSearches(userId, 10);
        this.cleanupOrphanedReviews(userId);

        const after = this.getStorageSize(userId);
        console.log(`Размер после очистки: ${after} KB`);
        console.log(`Освобождено: ${(before - after).toFixed(2)} KB`);

        return {
            before: `${before} KB`,
            after: `${after} KB`,
            freed: `${(before - after).toFixed(2)} KB`
        };
    }

    /**
     * Экспорт данных пользователя (для бэкапа)
     */
    static exportData(userId) {
        try {
            const data = localStorage.getItem(`user_data_${userId}`);
            if (!data) return null;

            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `movielist_backup_${userId}_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('Error exporting data:', error);
            return false;
        }
    }

    /**
     * Импорт данных пользователя (из бэкапа)
     */
    static async importData(userId, file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            // Валидация данных
            if (!data.version || !data.userId) {
                throw new Error('Некорректный формат данных');
            }

            localStorage.setItem(`user_data_${userId}`, text);
            console.log('Данные успешно импортированы');
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }
}

// Экспортируем для использования в консоли
if (typeof window !== 'undefined') {
    window.StorageCleanup = StorageCleanup;
}
