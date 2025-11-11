/**
 * Google Analytics 4 для Telegram Mini App
 * Отслеживание пользователей и событий
 */

class AnalyticsService {
    constructor() {
        this.userId = null;
        this.gaInitialized = false;
        this.eventQueue = []; // Очередь событий до инициализации GA
    }

    /**
     * Инициализация Google Analytics
     */
    async init() {
        try {
            // Получаем ID пользователя из Telegram
            this.userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 'guest';
            
            // Получаем дополнительные данные пользователя
            const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
            const userData = {
                telegram_id: this.userId,
                first_name: user?.first_name,
                username: user?.username,
                language_code: user?.language_code || 'ru',
                is_premium: user?.is_premium || false
            };

            // Ждем, пока GA загрузится
            await this._waitForGA();

            // Настраиваем GA с пользовательскими параметрами
            if (window.gtag) {
                window.gtag('config', window.GA_MEASUREMENT_ID, {
                    'user_id': this.userId,
                    'user_properties': {
                        'telegram_user_id': this.userId,
                        'telegram_username': userData.username || 'unknown',
                        'language': userData.language_code,
                        'is_premium': userData.is_premium
                    }
                });

                this.gaInitialized = true;
                console.log('✅ Google Analytics инициализирован для пользователя:', this.userId);

                // Отправляем события из очереди
                this._flushEventQueue();
            }
        } catch (error) {
            console.error('Ошибка инициализации Analytics:', error);
        }
    }

    /**
     * Ожидание загрузки GA
     */
    _waitForGA() {
        return new Promise((resolve) => {
            if (window.gtag) {
                resolve();
                return;
            }

            let attempts = 0;
            const maxAttempts = 50; // 5 секунд максимум
            
            const checkGA = setInterval(() => {
                attempts++;
                if (window.gtag || attempts >= maxAttempts) {
                    clearInterval(checkGA);
                    resolve();
                }
            }, 100);
        });
    }

    /**
     * Отправка событий из очереди
     */
    _flushEventQueue() {
        if (this.eventQueue.length > 0) {
            console.log(`📤 Отправка ${this.eventQueue.length} событий из очереди`);
            this.eventQueue.forEach(event => {
                this._sendEvent(event.name, event.params);
            });
            this.eventQueue = [];
        }
    }

    /**
     * Отслеживание события
     */
    trackEvent(eventName, params = {}) {
        const event = {
            name: eventName,
            params: {
                ...params,
                telegram_user_id: this.userId,
                timestamp: Date.now()
            }
        };

        if (this.gaInitialized) {
            this._sendEvent(event.name, event.params);
        } else {
            // Добавляем в очередь, если GA еще не готов
            this.eventQueue.push(event);
        }
    }

    /**
     * Внутренний метод отправки события
     */
    _sendEvent(eventName, params) {
        if (window.gtag) {
            window.gtag('event', eventName, params);
            console.log('📊 GA Event:', eventName, params);
        }
    }

    // ===== СОБЫТИЯ ПРИЛОЖЕНИЯ =====

    /**
     * Открытие приложения
     */
    trackAppStart() {
        this.trackEvent('app_start', {
            platform: 'telegram_mini_app',
            version: window.Telegram?.WebApp?.version
        });
    }

    /**
     * Просмотр фильма/сериала
     */
    trackMediaView(mediaId, mediaType, title) {
        this.trackEvent('view_item', {
            item_id: mediaId,
            item_name: title,
            item_category: mediaType, // 'movie' или 'tv'
            content_type: mediaType
        });
    }

    /**
     * Добавление в список
     */
    trackAddToList(listType, mediaId, mediaType, title) {
        this.trackEvent('add_to_list', {
            list_type: listType, // 'want', 'watching', 'watched'
            item_id: mediaId,
            item_name: title,
            content_type: mediaType
        });
    }

    /**
     * Удаление из списка
     */
    trackRemoveFromList(listType, mediaId, mediaType) {
        this.trackEvent('remove_from_list', {
            list_type: listType,
            item_id: mediaId,
            content_type: mediaType
        });
    }

    /**
     * Написание отзыва
     */
    trackReviewSubmit(mediaId, mediaType, rating) {
        this.trackEvent('review_submit', {
            item_id: mediaId,
            content_type: mediaType,
            rating: rating,
            value: rating // для статистики
        });
    }

    /**
     * Поиск
     */
    trackSearch(searchTerm, resultsCount) {
        this.trackEvent('search', {
            search_term: searchTerm,
            results_count: resultsCount
        });
    }

    /**
     * Просмотр жанра
     */
    trackGenreView(genreId, genreName) {
        this.trackEvent('view_genre', {
            genre_id: genreId,
            genre_name: genreName
        });
    }

    /**
     * Просмотр актера/режиссера
     */
    trackPersonView(personId, personName) {
        this.trackEvent('view_person', {
            person_id: personId,
            person_name: personName
        });
    }

    /**
     * Отметка эпизода как просмотренного
     */
    trackEpisodeWatched(tvId, seasonNumber, episodeNumber) {
        this.trackEvent('episode_watched', {
            tv_id: tvId,
            season: seasonNumber,
            episode: episodeNumber
        });
    }

    /**
     * Переключение таба
     */
    trackTabChange(tabName) {
        this.trackEvent('tab_change', {
            tab_name: tabName
        });
    }

    /**
     * Поделиться контентом
     */
    trackShare(mediaId, mediaType, shareMethod) {
        this.trackEvent('share', {
            item_id: mediaId,
            content_type: mediaType,
            method: shareMethod // 'inline', 'direct_link'
        });
    }

    /**
     * Просмотр трейлера
     */
    trackTrailerView(mediaId, mediaType) {
        this.trackEvent('trailer_view', {
            item_id: mediaId,
            content_type: mediaType
        });
    }

    /**
     * Время, проведенное в приложении
     */
    trackSessionDuration() {
        const sessionStart = performance.now();
        
        window.addEventListener('beforeunload', () => {
            const sessionDuration = Math.round((performance.now() - sessionStart) / 1000);
            this.trackEvent('session_duration', {
                duration_seconds: sessionDuration
            });
        });
    }

    /**
     * Ошибки приложения
     */
    trackError(errorMessage, errorStack) {
        this.trackEvent('app_error', {
            error_message: errorMessage,
            error_stack: errorStack?.substring(0, 500) // Ограничиваем длину
        });
    }
}

// Создаем единственный экземпляр
export const analytics = new AnalyticsService();

// Автоматическое отслеживание ошибок
window.addEventListener('error', (event) => {
    analytics.trackError(event.message, event.error?.stack);
});

// Отслеживание необработанных промисов
window.addEventListener('unhandledrejection', (event) => {
    analytics.trackError(`Unhandled Promise: ${event.reason}`, event.reason?.stack);
});

