import { TG } from '../config/telegram.js';
import { BOT_CONFIG } from '../config/bot.js';

/**
 * Сервис для работы с прямыми ссылками на фильмы и сериалы
 */
class ShareLinkService {
    /**
     * Генерирует прямую ссылку на медиа контент для веб-браузера
     * @param {string|number} mediaId - ID фильма или сериала
     * @param {string} mediaType - Тип медиа ('movie' или 'tv')
     * @returns {string} Полная URL ссылка
     */
    generateWebLink(mediaId, mediaType) {
        const baseUrl = window.location.origin + window.location.pathname;
        const url = new URL(baseUrl);
        url.searchParams.set('id', mediaId);
        url.searchParams.set('type', mediaType);
        return url.toString();
    }

    /**
     * Генерирует прямую ссылку на медиа контент для Telegram Mini App
     * @param {string|number} mediaId - ID фильма или сериала
     * @param {string} mediaType - Тип медиа ('movie' или 'tv')
     * @returns {string} Telegram Mini App ссылка
     */
    generateTelegramLink(mediaId, mediaType) {
        const botUsername = BOT_CONFIG.BOT_USERNAME;
        
        if (!botUsername) {
            console.warn('BOT_USERNAME not configured, falling back to web link');
            return this.generateWebLink(mediaId, mediaType);
        }

        // Используем Direct Link формат - открывает Mini App напрямую
        // Требует настройки Web App в BotFather
        // Формат: https://t.me/bot_username/app_short_name?startapp=movie_123
        const startParam = `${mediaType}_${mediaId}`;
        
        // Если у бота есть короткое имя приложения, используем его
        // По умолчанию используем 'app' (нужно настроить в BotFather)
        const appShortName = BOT_CONFIG.APP_SHORT_NAME || 'app';
        
        return `https://t.me/${botUsername}/${appShortName}?startapp=${startParam}`;
    }

    /**
     * Генерирует прямую ссылку на медиа контент (автоматически выбирает формат)
     * @param {string|number} mediaId - ID фильма или сериала
     * @param {string} mediaType - Тип медиа ('movie' или 'tv')
     * @returns {string} Полная URL ссылка
     */
    generateShareLink(mediaId, mediaType) {
        // Если запущено в Telegram, используем Telegram ссылку
        if (TG && BOT_CONFIG.BOT_USERNAME) {
            return this.generateTelegramLink(mediaId, mediaType);
        }
        // Иначе используем веб-ссылку
        return this.generateWebLink(mediaId, mediaType);
    }

    /**
     * Копирует ссылку в буфер обмена
     * @param {string|number} mediaId - ID фильма или сериала
     * @param {string} mediaType - Тип медиа ('movie' или 'tv')
     * @returns {Promise<boolean>} true если успешно скопировано
     */
    async copyToClipboard(mediaId, mediaType) {
        const link = this.generateShareLink(mediaId, mediaType);
        
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(link);
                return true;
            } else {
                // Fallback для старых браузеров
                const textArea = document.createElement('textarea');
                textArea.value = link;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                const success = document.execCommand('copy');
                document.body.removeChild(textArea);
                return success;
            }
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            return false;
        }
    }

    /**
     * Открывает диалог шаринга в Telegram
     * @param {string|number} mediaId - ID фильма или сериала
     * @param {string} mediaType - Тип медиа ('movie' или 'tv')
     * @param {string} title - Название фильма/сериала
     */
    shareToTelegram(mediaId, mediaType, title) {
        const link = this.generateTelegramLink(mediaId, mediaType);
        
        try {
            // Используем Telegram Web App API для шаринга
            if (TG?.openTelegramLink) {
                // Для Mini App используем специальный формат
                const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(title)}`;
                TG.openTelegramLink(shareUrl);
            } else if (TG?.switchInlineQuery) {
                // Альтернативный метод через inline query
                const text = `${title}\n${link}`;
                TG.switchInlineQuery(text);
            } else {
                // Fallback - копируем в буфер обмена
                this.copyToClipboard(mediaId, mediaType);
            }
        } catch (error) {
            console.error('Error sharing to Telegram:', error);
            // Fallback - копируем в буфер обмена
            this.copyToClipboard(mediaId, mediaType);
        }
    }

    /**
     * Парсит URL параметры для получения информации о медиа
     * @returns {Object|null} Объект с mediaId и mediaType или null
     */
    parseUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const mediaId = urlParams.get('id');
        const mediaType = urlParams.get('type');
        
        if (mediaId && mediaType && (mediaType === 'movie' || mediaType === 'tv')) {
            return {
                mediaId: parseInt(mediaId),
                mediaType
            };
        }
        
        return null;
    }

    /**
     * Проверяет, является ли текущий URL прямой ссылкой на медиа
     * @returns {boolean}
     */
    isDeepLink() {
        return this.parseUrlParams() !== null;
    }
}

export const shareLinkService = new ShareLinkService();
