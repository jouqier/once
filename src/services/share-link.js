import { TG } from '../config/telegram.js';

/**
 * Сервис для работы с прямыми ссылками на фильмы и сериалы
 */
class ShareLinkService {
    /**
     * Генерирует прямую ссылку на медиа контент
     * @param {string|number} mediaId - ID фильма или сериала
     * @param {string} mediaType - Тип медиа ('movie' или 'tv')
     * @returns {string} Полная URL ссылка
     */
    generateShareLink(mediaId, mediaType) {
        const baseUrl = window.location.origin + window.location.pathname;
        const url = new URL(baseUrl);
        url.searchParams.set('id', mediaId);
        url.searchParams.set('type', mediaType);
        return url.toString();
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
        const link = this.generateShareLink(mediaId, mediaType);
        const text = `${title}\n${link}`;
        
        try {
            // Используем Telegram Web App API для шаринга
            if (TG?.openTelegramLink) {
                const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(title)}`;
                TG.openTelegramLink(shareUrl);
            } else if (TG?.switchInlineQuery) {
                // Альтернативный метод через inline query
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
