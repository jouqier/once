require('dotenv').config();
const { createBot } = require('./bot');
const axios = require('axios');

// Конфигурация
const BOT_TOKEN = process.env.BOT_TOKEN;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const WEB_APP_URL = process.env.WEB_APP_URL;
const BOT_USERNAME = process.env.BOT_USERNAME;
const APP_SHORT_NAME = process.env.APP_SHORT_NAME || 'app';

if (!BOT_TOKEN || !TMDB_API_KEY || !WEB_APP_URL) {
    console.error('❌ Ошибка: Не указаны обязательные переменные окружения');
    console.error('Проверьте файл .env');
    process.exit(1);
}

const bot = createBot();

// Запуск бота
const startBot = async () => {
    try {
        // Проверяем подключение к TMDB
        const testResponse = await axios.get(
            'https://tmdb-proxy-xi.vercel.app/3/configuration',
            { params: { api_key: TMDB_API_KEY } }
        );
        console.log('✅ TMDB API подключен');
        
        // Запускаем бота
        await bot.launch();
        console.log('✅ Бот запущен успешно!');
        console.log(`📱 Bot username: @${BOT_USERNAME}`);
        console.log(`🌐 Web App URL: ${WEB_APP_URL}`);
        console.log(`🔗 App short name: ${APP_SHORT_NAME}`);
        console.log('\n💡 Для остановки нажмите Ctrl+C');
    } catch (error) {
        console.error('❌ Ошибка запуска бота:', error.message);
        process.exit(1);
    }
};

// Graceful stop
process.once('SIGINT', () => {
    console.log('\n⏹️  Остановка бота...');
    bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
    console.log('\n⏹️  Остановка бота...');
    bot.stop('SIGTERM');
});

// Запускаем
startBot();
