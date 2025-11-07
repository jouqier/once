export const BOT_CONFIG = {
    BOT_TOKEN: import.meta.env.VITE_BOT_TOKEN,
    BOT_USERNAME: import.meta.env.VITE_BOT_USERNAME,
    APP_SHORT_NAME: import.meta.env.VITE_APP_SHORT_NAME || 'app',
    SYNC_INTERVAL: 2000,
    RETRY_ATTEMPTS: 3
}; 