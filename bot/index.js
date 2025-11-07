require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
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

const bot = new Telegraf(BOT_TOKEN);

// Функция для получения данных о фильме/сериале из TMDB
async function getMediaData(mediaType, mediaId) {
    try {
        const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
        const response = await axios.get(
            `https://api.themoviedb.org/3/${endpoint}/${mediaId}`,
            {
                params: {
                    api_key: TMDB_API_KEY,
                    language: 'ru-RU'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching media data:', error.message);
        return null;
    }
}

// Команда /start
bot.start(async (ctx) => {
    const startParam = ctx.startPayload;
    
    if (startParam) {
        // Если есть параметр (например, movie_550)
        const parts = startParam.split('_');
        if (parts.length === 2) {
            const [mediaType, mediaId] = parts;
            
            // Получаем данные о фильме/сериале
            const data = await getMediaData(mediaType, mediaId);
            
            if (data) {
                const title = data.title || data.name;
                const rating = data.vote_average ? `⭐ ${data.vote_average.toFixed(1)}/10` : '';
                const overview = data.overview || 'Описание отсутствует';
                const posterUrl = data.poster_path 
                    ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
                    : null;
                
                // Генерируем Direct Link
                const directLink = `https://t.me/${BOT_USERNAME}/${APP_SHORT_NAME}?startapp=${mediaType}_${mediaId}`;
                
                const message = `🎬 ${title}\n${rating}\n\n${overview.substring(0, 300)}${overview.length > 300 ? '...' : ''}`;
                
                const keyboard = Markup.inlineKeyboard([
                    [Markup.button.webApp('▶️ Открыть в приложении', `${WEB_APP_URL}?id=${mediaId}&type=${mediaType}`)]
                ]);
                
                // Отправляем с постером если есть
                if (posterUrl) {
                    await ctx.replyWithPhoto(posterUrl, {
                        caption: message,
                        reply_markup: keyboard.reply_markup
                    });
                } else {
                    await ctx.reply(message, keyboard);
                }
                return;
            }
        }
    }
    
    // Обычное приветствие
    await ctx.reply(
        '👋 Привет! Я бот для отслеживания фильмов и сериалов.\n\n' +
        '🎬 Открой приложение, чтобы начать!',
        Markup.inlineKeyboard([
            [Markup.button.webApp('🎬 Открыть приложение', WEB_APP_URL)]
        ])
    );
});

// Обработка inline запросов для шаринга с превью
bot.on('inline_query', async (ctx) => {
    const query = ctx.inlineQuery.query;
    
    // Проверяем формат: share_movie_550 или share_tv_1396
    if (query.startsWith('share_')) {
        const parts = query.split('_');
        if (parts.length === 3) {
            const [, mediaType, mediaId] = parts;
            
            // Получаем данные о фильме/сериале
            const data = await getMediaData(mediaType, mediaId);
            
            if (data) {
                const title = data.title || data.name;
                const overview = data.overview || 'Описание отсутствует';
                const rating = data.vote_average ? `⭐ ${data.vote_average.toFixed(1)}/10` : '';
                const year = data.release_date 
                    ? new Date(data.release_date).getFullYear()
                    : data.first_air_date 
                        ? new Date(data.first_air_date).getFullYear()
                        : '';
                const posterUrl = data.poster_path 
                    ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
                    : '';
                
                // Генерируем Direct Link
                const directLink = `https://t.me/${BOT_USERNAME}/${APP_SHORT_NAME}?startapp=${mediaType}_${mediaId}`;
                
                // Формируем текст сообщения
                const messageText = `🎬 ${title}${year ? ` (${year})` : ''}\n${rating}\n\n${overview.substring(0, 250)}${overview.length > 250 ? '...' : ''}`;
                
                // Формируем результат для inline query
                const result = {
                    type: 'article',
                    id: `${mediaType}_${mediaId}`,
                    title: title,
                    description: `${rating}${year ? ` • ${year}` : ''}\n${overview.substring(0, 100)}...`,
                    thumb_url: posterUrl || undefined,
                    input_message_content: {
                        message_text: messageText,
                        parse_mode: 'HTML'
                    },
                    reply_markup: {
                        inline_keyboard: [[
                            {
                                text: '▶️ Открыть в приложении',
                                url: directLink
                            }
                        ]]
                    }
                };
                
                await ctx.answerInlineQuery([result], {
                    cache_time: 300,
                    is_personal: true
                });
                return;
            }
        }
    }
    
    // Если запрос не подходит или данные не найдены
    await ctx.answerInlineQuery([], {
        cache_time: 1,
        switch_pm_text: '🎬 Открыть приложение',
        switch_pm_parameter: 'start'
    });
});

// Обработка ошибок
bot.catch((err, ctx) => {
    console.error('❌ Ошибка бота:', err);
    console.error('Context:', ctx.updateType);
});

// Запуск бота
const startBot = async () => {
    try {
        // Проверяем подключение к TMDB
        const testResponse = await axios.get(
            'https://api.themoviedb.org/3/configuration',
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
