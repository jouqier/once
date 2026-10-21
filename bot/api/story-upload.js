const { validateInitData, applyCors } = require('../lib/telegram-auth');

// Лимит тела запроса Vercel - 4.5 МБ, base64 раздувает данные на ~33%
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_CAPTION_LENGTH = 1024; // лимит Telegram для подписи к фото

/**
 * POST /api/story-upload
 * Body (JSON): { initData, image: "data:image/jpeg;base64,...", caption? }
 *
 * Отправляет картинку пользователю в чат с ботом и возвращает
 * ссылку на неё через /api/story-image (без токена бота в URL).
 */
module.exports = async (req, res) => {
    const corsAllowed = applyCors(req, res);

    if (req.method === 'OPTIONS') {
        return res.status(corsAllowed ? 204 : 403).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!corsAllowed) {
        return res.status(403).json({ error: 'Origin not allowed' });
    }

    const BOT_TOKEN = process.env.BOT_TOKEN;
    if (!BOT_TOKEN) {
        console.error('❌ BOT_TOKEN не установлен');
        return res.status(500).json({ error: 'Server not configured' });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch {
            return res.status(400).json({ error: 'Invalid JSON' });
        }
    }
    const { initData, image, caption } = body || {};

    // chat_id берём только из проверенного initData, а не из запроса
    const user = validateInitData(initData, BOT_TOKEN);
    if (!user) {
        return res.status(401).json({ error: 'Invalid initData' });
    }

    const match = typeof image === 'string' && image.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
        return res.status(400).json({ error: 'Image must be a JPEG data URL' });
    }
    const imageBuffer = Buffer.from(match[1], 'base64');
    if (imageBuffer.length === 0 || imageBuffer.length > MAX_IMAGE_BYTES) {
        return res.status(413).json({ error: 'Image too large' });
    }

    try {
        const formData = new FormData();
        formData.append('chat_id', String(user.id));
        formData.append('photo', new Blob([imageBuffer], { type: 'image/jpeg' }), 'story.jpg');
        if (typeof caption === 'string' && caption.trim()) {
            formData.append('caption', caption.slice(0, MAX_CAPTION_LENGTH));
        }

        const tgResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData
        });
        const tgData = await tgResponse.json();

        if (!tgData.ok) {
            console.error('❌ sendPhoto failed:', tgData.description);
            return res.status(502).json({ error: 'Telegram upload failed' });
        }

        // Самая большая версия фото
        const photos = tgData.result.photo;
        const fileId = photos[photos.length - 1].file_id;

        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const url = `https://${host}/api/story-image?id=${encodeURIComponent(fileId)}`;

        return res.status(200).json({ url });
    } catch (error) {
        console.error('❌ Ошибка загрузки сторис:', error.message);
        return res.status(500).json({ error: 'Upload failed' });
    }
};
