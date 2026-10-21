// file_id от Telegram: base64url-подобная строка
const FILE_ID_PATTERN = /^[A-Za-z0-9_-]{10,200}$/;

/**
 * GET /api/story-image?id=<file_id>
 *
 * Отдаёт картинку, загруженную через /api/story-upload.
 * Токен бота остаётся на сервере, наружу уходит только file_id.
 */
module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const BOT_TOKEN = process.env.BOT_TOKEN;
    if (!BOT_TOKEN) {
        console.error('❌ BOT_TOKEN не установлен');
        return res.status(500).json({ error: 'Server not configured' });
    }

    const fileId = req.query.id;
    if (typeof fileId !== 'string' || !FILE_ID_PATTERN.test(fileId)) {
        return res.status(400).json({ error: 'Invalid id' });
    }

    try {
        const fileInfo = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`
        ).then(r => r.json());

        if (!fileInfo.ok) {
            return res.status(404).json({ error: 'Not found' });
        }

        const fileResponse = await fetch(
            `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileInfo.result.file_path}`
        );
        if (!fileResponse.ok) {
            return res.status(502).json({ error: 'Failed to fetch file' });
        }

        const buffer = Buffer.from(await fileResponse.arrayBuffer());

        res.setHeader('Content-Type', 'image/jpeg');
        // file_id неизменяем, поэтому картинку можно кешировать надолго
        res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
        return res.status(200).send(buffer);
    } catch (error) {
        console.error('❌ Ошибка получения картинки:', error.message);
        return res.status(500).json({ error: 'Failed to fetch image' });
    }
};
