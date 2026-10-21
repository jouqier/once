const crypto = require('crypto');

// Максимальный возраст initData (сек). Mini App получает свежий initData при каждом открытии.
const MAX_AUTH_AGE = 24 * 60 * 60;

/**
 * Проверяет подпись Telegram WebApp initData.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * @param {string} initData - строка Telegram.WebApp.initData
 * @param {string} botToken - токен бота
 * @returns {object|null} проверенный объект user или null, если подпись неверна
 */
function validateInitData(initData, botToken) {
    if (!initData || typeof initData !== 'string' || !botToken) {
        return null;
    }

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
        return null;
    }
    params.delete('hash');

    const dataCheckString = [...params.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const expected = Buffer.from(expectedHash, 'hex');
    const received = Buffer.from(hash, 'hex');
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
        return null;
    }

    const authDate = Number(params.get('auth_date'));
    if (!authDate || Date.now() / 1000 - authDate > MAX_AUTH_AGE) {
        return null;
    }

    try {
        const user = JSON.parse(params.get('user'));
        return user && user.id ? user : null;
    } catch {
        return null;
    }
}

/**
 * Выставляет CORS-заголовки, если origin разрешён.
 * ALLOWED_ORIGINS - список через запятую, например:
 * https://jouqier.github.io,https://localhost:3000
 *
 * @returns {boolean} разрешён ли origin
 */
function applyCors(req, res) {
    const allowed = (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);
    const origin = req.headers.origin;

    if (origin && allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return true;
    }
    return false;
}

module.exports = { validateInitData, applyCors };
