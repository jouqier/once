import { BOT_CONFIG } from '../config/bot.js';

export class UploadService {
    /**
     * Загружает картинку сторис через сервер бота.
     * Сервер отправляет её пользователю в чат с ботом и возвращает ссылку
     * на картинку (без токена бота).
     *
     * @param {string} dataUrl - JPEG в виде data URL
     * @param {object} metadata - { title, year, rating, comment }
     * @returns {Promise<string>} публичная ссылка на картинку
     */
    static async uploadImage(dataUrl, metadata = {}) {
        const initData = window.Telegram?.WebApp?.initData;
        if (!initData) {
            throw new Error('Telegram initData not available');
        }

        if (!BOT_CONFIG.STORY_API_URL) {
            throw new Error('Story API URL not configured');
        }

        let caption = '';
        if (metadata.title && metadata.year && metadata.rating) {
            caption = `🎬 ${metadata.title}\n📅 ${metadata.year}\n⭐️ ${metadata.rating}/10`;
            if (metadata.comment) {
                caption += `\n\n💭 ${metadata.comment}`;
            }
        }

        const response = await fetch(`${BOT_CONFIG.STORY_API_URL}/api/story-upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData, image: dataUrl, caption })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.url) {
            throw new Error(data.error || `Upload failed (${response.status})`);
        }

        return data.url;
    }
}
