const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

// Функция для инициализации бота
// 
// Бот может работать в двух режимах:
// 1. Long Polling (для обычного сервера) - через index.js
// 2. Webhook (для Vercel/serverless) - через api/webhook.js
// 
// ВАЖНО: WEB_APP_URL должен указывать на URL вашего Mini App
// (например: https://username.github.io/repo/ или https://your-domain.com)
function createBot() {
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    // URL Mini App на GitHub Pages (НЕ Vercel URL!)
    const WEB_APP_URL = process.env.WEB_APP_URL;
    const BOT_USERNAME = process.env.BOT_USERNAME;
    const APP_SHORT_NAME = process.env.APP_SHORT_NAME || 'app';

    if (!BOT_TOKEN || !TMDB_API_KEY || !WEB_APP_URL) {
        throw new Error('Не указаны обязательные переменные окружения');
    }

    const bot = new Telegraf(BOT_TOKEN);

    // Константы для TMDB API
    const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://tmdb-proxy-xi.vercel.app/3';
    const TMDB_IMAGE_BASE_URL = process.env.TMDB_IMAGE_BASE_URL || 'https://tmdb-proxy-xi.vercel.app/t/p/w500';
    const TMDB_LANGUAGE = process.env.TMDB_LANGUAGE || 'ru-RU';

    // Функция для получения данных о фильме/сериале из TMDB
    async function getMediaData(mediaType, mediaId) {
        try {
            const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
            const url = `${TMDB_BASE_URL}/${endpoint}/${mediaId}`;
            console.log(`🌐 Fetching from TMDB: ${url}`);
            
            const response = await axios.get(url, {
                params: {
                    api_key: TMDB_API_KEY,
                    language: TMDB_LANGUAGE
                }
            });
            
            if (response.data) {
                console.log(`✅ TMDB response received for ${mediaType} ${mediaId}`);
            }
            return response.data;
        } catch (error) {
            console.error('❌ Error fetching media data:', error.message);
            if (error.response) {
                console.error(`   Status: ${error.response.status}`);
                console.error(`   URL: ${url}`);
                console.error(`   Media Type: ${mediaType}, ID: ${mediaId}`);
                if (error.response.status === 404) {
                    console.error(`   ⚠️ Media not found: ${mediaType} with ID ${mediaId}`);
                }
                console.error(`   Response data:`, JSON.stringify(error.response.data, null, 2));
            } else if (error.request) {
                console.error('   No response received from TMDB API');
            }
            return null;
        }
    }

    // Обработка inline queries (для шаринга с превью)
    bot.on('inline_query', async (ctx) => {
        const query = ctx.inlineQuery.query.trim();
        console.log('📥 Inline query received:', query);
        
        // Обрабатываем запросы вида: share_movie_123 или share_tv_456
        if (query.startsWith('share_')) {
            const parts = query.split('_');
            console.log('🔍 Parsed parts:', parts);
            
            if (parts.length === 3) {
                const [, mediaType, mediaIdStr] = parts;
                // Преобразуем ID в число для валидации
                const mediaId = parseInt(mediaIdStr, 10);
                
                if (isNaN(mediaId) || mediaId <= 0) {
                    console.error(`❌ Invalid media ID: ${mediaIdStr}`);
                    await ctx.answerInlineQuery([], { cache_time: 1, is_personal: false });
                    return;
                }
                
                console.log(`📊 Media type: ${mediaType}, ID: ${mediaId}`);
                
                // Получаем данные о фильме/сериале
                const data = await getMediaData(mediaType, mediaId);
                
                if (data) {
                    console.log(`✅ Media data received: ${data.title || data.name}`);
                    const title = data.title || data.name;
                    const rating = data.vote_average ? `⭐ ${data.vote_average.toFixed(1)}/10` : '';
                    const overview = data.overview || 'Описание отсутствует';
                    const posterUrl = data.poster_path 
                        ? `${TMDB_IMAGE_BASE_URL}${data.poster_path}`
                        : null;
                    
                    // Генерируем Telegram Mini App ссылку (открывает приложение напрямую)
                    const directLink = `https://t.me/${BOT_USERNAME}/${APP_SHORT_NAME}?startapp=${mediaType}_${mediaId}`;
                    
                    const message = `🎬 ${title}\n${rating}\n\n${overview.substring(0, 300)}${overview.length > 300 ? '...' : ''}`;
                    
                    // Для inline query результатов используем Telegram Mini App ссылку
                    // Это откроет приложение напрямую, а не внешний браузер
                    const keyboard = Markup.inlineKeyboard([
                        [Markup.button.url('▶️ Открыть в приложении', directLink)]
                    ]);
                    
                    // Возвращаем результат inline query
                    const results = [];
                    
                    if (posterUrl) {
                        // Результат с фото
                        results.push({
                            type: 'photo',
                            id: `share_${mediaType}_${mediaId}`,
                            photo_url: posterUrl,
                            thumb_url: posterUrl,
                            caption: message,
                            reply_markup: keyboard.reply_markup
                        });
                    } else {
                        // Результат без фото (текстовое сообщение)
                        // Для article типа можно использовать url напрямую
                        results.push({
                            type: 'article',
                            id: `share_${mediaType}_${mediaId}`,
                            title: title,
                            description: overview.substring(0, 100),
                            message_text: message,
                            url: directLink, // Telegram Mini App ссылка (открывает приложение)
                            reply_markup: keyboard.reply_markup
                        });
                    }
                    
                    await ctx.answerInlineQuery(results, {
                        cache_time: 300, // Кешируем на 5 минут
                        is_personal: false
                    });
                    console.log('✅ Inline query answered successfully');
                    return;
                } else {
                    console.error('❌ Failed to get media data from TMDB');
                }
            } else {
                console.error(`❌ Invalid query format. Expected 3 parts, got ${parts.length}`);
            }
        } else {
            console.log(`⚠️ Query doesn't start with 'share_': ${query}`);
        }
        
        // Если запрос не распознан, возвращаем пустой результат
        console.log('📭 Returning empty result');
        await ctx.answerInlineQuery([], {
            cache_time: 1,
            is_personal: false
        });
    });

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
                        ? `${TMDB_IMAGE_BASE_URL}${data.poster_path}`
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

    // Обработка ошибок
    bot.catch((err, ctx) => {
        console.error('❌ Ошибка бота:', err);
        console.error('Context:', ctx.updateType);
    });

    return bot;
}

module.exports = { createBot };

