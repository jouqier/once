const { createBot } = require('../bot');

// Создаем экземпляр бота (создаем один раз при инициализации модуля)
let bot;

try {
    bot = createBot();
} catch (error) {
    console.error('❌ Ошибка инициализации бота:', error.message);
    // Бот будет создан при первом запросе, если переменные окружения появятся позже
}

// Serverless функция для Vercel
module.exports = async (req, res) => {
    // Разрешаем только POST запросы
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Проверяем наличие переменных окружения
    if (!process.env.BOT_TOKEN) {
        console.error('❌ BOT_TOKEN не установлен');
        return res.status(500).json({ 
            error: 'Bot token not configured',
            message: 'Please set BOT_TOKEN in Vercel environment variables'
        });
    }

    // Пересоздаем бота, если он не был создан или если переменные изменились
    if (!bot) {
        try {
            bot = createBot();
        } catch (error) {
            console.error('❌ Ошибка создания бота:', error.message);
            return res.status(500).json({ 
                error: 'Failed to initialize bot',
                message: error.message
            });
        }
    }

    try {
        // Парсим тело запроса, если оно еще не распарсено
        let update = req.body;
        if (typeof req.body === 'string') {
            update = JSON.parse(req.body);
        }

        // Обрабатываем обновление через webhook
        await bot.handleUpdate(update);
        
        // Отвечаем сразу, чтобы Telegram не повторял запрос
        res.status(200).json({ ok: true });
    } catch (error) {
        console.error('❌ Ошибка обработки webhook:', error);
        console.error('Error stack:', error.stack);
        console.error('Request body:', JSON.stringify(req.body, null, 2));
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message
        });
    }
};

