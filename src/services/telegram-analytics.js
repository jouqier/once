/**
 * Telegram Mini Apps Analytics SDK
 * Официальный SDK для аналитики Telegram Mini Apps
 * https://github.com/Telegram-Mini-Apps/analytics
 */

class TelegramAnalyticsService {
    constructor() {
        this.initialized = false;
        this.token = null;
        this.appName = null;
    }

    /**
     * Инициализация Telegram Analytics SDK
     * @param {string} token - Токен аутентификации SDK, полученный через @DataChief_bot
     * @param {string} appName - Идентификатор аналитики, указанный в @DataChief_bot
     */
    async init(token, appName) {
        try {
            // Проверяем наличие SDK
            if (!window.telegramAnalytics) {
                console.warn('⚠️ Telegram Analytics SDK не загружен. Проверьте подключение скрипта в index.html');
                return false;
            }

            this.token = token;
            this.appName = appName;

            // Инициализируем SDK
            window.telegramAnalytics.init({
                token: token,
                appName: appName,
            });

            this.initialized = true;
            console.log('✅ Telegram Analytics SDK инициализирован');
            return true;
        } catch (error) {
            console.error('❌ Ошибка инициализации Telegram Analytics SDK:', error);
            return false;
        }
    }

    /**
     * Отслеживание события
     * @param {string} eventName - Название события
     * @param {object} params - Параметры события (опционально)
     */
    trackEvent(eventName, params = {}) {
        if (!this.initialized || !window.telegramAnalytics) {
            return;
        }

        try {
            window.telegramAnalytics.track(eventName, params);
        } catch (error) {
            console.error('❌ Ошибка отправки события в Telegram Analytics:', error);
        }
    }

    /**
     * Отслеживание просмотра страницы
     * @param {string} pageName - Название страницы
     */
    trackPageView(pageName) {
        this.trackEvent('page_view', { page: pageName });
    }

    /**
     * Отслеживание запуска приложения
     */
    trackAppStart() {
        this.trackEvent('app_start', {
            platform: 'telegram_mini_app',
            version: window.Telegram?.WebApp?.version || 'unknown'
        });
    }

    /**
     * Отслеживание просмотра контента
     */
    trackContentView(mediaId, mediaType, title) {
        this.trackEvent('content_view', {
            item_id: mediaId,
            item_name: title,
            content_type: mediaType
        });
    }

    /**
     * Отслеживание добавления в список
     */
    trackAddToList(listType, mediaId, mediaType) {
        this.trackEvent('add_to_list', {
            list_type: listType,
            item_id: mediaId,
            content_type: mediaType
        });
    }

    /**
     * Отслеживание поиска
     */
    trackSearch(searchTerm, resultsCount) {
        this.trackEvent('search', {
            search_term: searchTerm,
            results_count: resultsCount
        });
    }
}

// Создаем единственный экземпляр
export const telegramAnalytics = new TelegramAnalyticsService();

