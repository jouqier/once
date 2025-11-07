# Примеры использования бота

## Базовые примеры

### 1. Команда /start без параметров

**Пользователь отправляет:**
```
/start
```

**Бот отвечает:**
```
👋 Привет! Я бот для отслеживания фильмов и сериалов.

🎬 Открой приложение, чтобы начать!

[Кнопка: 🎬 Открыть приложение]
```

### 2. Команда /start с параметром фильма

**Пользователь открывает ссылку:**
```
https://t.me/onceappbot?start=movie_550
```

**Бот отвечает:**
```
[Постер Fight Club]

🎬 Fight Club
⭐ 8.4/10

An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.

[Кнопка: ▶️ Открыть в приложении]
```

### 3. Inline query для шаринга

**Пользователь в любом чате набирает:**
```
@onceappbot share_movie_550
```

**Бот показывает карточку:**
```
┌─────────────────────────────┐
│  [Постер Fight Club]        │
│                             │
│  Fight Club                 │
│  ⭐ 8.4/10 • 1999          │
│                             │
│  An insomniac office...     │
└─────────────────────────────┘
```

**После отправки в чат:**
```
🎬 Fight Club (1999)
⭐ 8.4/10

An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.

[Кнопка: ▶️ Открыть в приложении]
```

## Продвинутые примеры

### Кастомизация сообщения для фильма

```javascript
// В index.js, функция bot.start()

const message = `
🎬 ${title}
⭐ ${rating}
📅 ${year}
⏱️ ${runtime} мин
🎭 ${genres.join(', ')}

${overview}
`;
```

### Добавление дополнительных кнопок

```javascript
const keyboard = Markup.inlineKeyboard([
    [Markup.button.webApp('▶️ Открыть', `${WEB_APP_URL}?id=${mediaId}&type=${mediaType}`)],
    [Markup.button.url('🎬 TMDB', `https://www.themoviedb.org/movie/${mediaId}`)],
    [Markup.button.url('🍿 IMDb', `https://www.imdb.com/title/${imdbId}`)]
]);
```

### Inline query с поиском

```javascript
bot.on('inline_query', async (ctx) => {
    const query = ctx.inlineQuery.query;
    
    // Если запрос начинается с share_ - показываем конкретный фильм
    if (query.startsWith('share_')) {
        // ... существующий код
    }
    // Иначе - поиск по названию
    else if (query.length > 2) {
        const searchResults = await searchMovies(query);
        const results = searchResults.map(movie => ({
            type: 'article',
            id: `movie_${movie.id}`,
            title: movie.title,
            description: `⭐ ${movie.vote_average}/10`,
            thumb_url: `https://image.tmdb.org/t/p/w200${movie.poster_path}`,
            input_message_content: {
                message_text: `🎬 ${movie.title}\n⭐ ${movie.vote_average}/10`
            },
            reply_markup: {
                inline_keyboard: [[
                    { text: '▶️ Открыть', url: generateDirectLink('movie', movie.id) }
                ]]
            }
        }));
        
        await ctx.answerInlineQuery(results);
    }
});
```

### Обработка callback кнопок

```javascript
// Добавляем callback кнопку
const keyboard = Markup.inlineKeyboard([
    [Markup.button.webApp('▶️ Открыть', directLink)],
    [Markup.button.callback('⭐ Оценить', `rate_${mediaType}_${mediaId}`)]
]);

// Обрабатываем callback
bot.action(/rate_(.+)_(.+)/, async (ctx) => {
    const [, mediaType, mediaId] = ctx.match;
    
    await ctx.answerCbQuery('Открой приложение для оценки!');
    
    // Можно открыть приложение с формой оценки
    await ctx.editMessageReplyMarkup({
        inline_keyboard: [[
            { 
                text: '⭐ Оценить в приложении', 
                url: `${WEB_APP_URL}?id=${mediaId}&type=${mediaType}&action=rate`
            }
        ]]
    });
});
```

## Интеграция с базой данных

### Сохранение статистики шаринга

```javascript
const db = require('./database'); // Ваша БД

bot.on('inline_query', async (ctx) => {
    const userId = ctx.from.id;
    const query = ctx.inlineQuery.query;
    
    // Сохраняем статистику
    await db.saveInlineQuery({
        userId,
        query,
        timestamp: new Date()
    });
    
    // ... остальной код
});

// Выбор результата
bot.on('chosen_inline_result', async (ctx) => {
    const userId = ctx.from.id;
    const resultId = ctx.chosenInlineResult.result_id;
    
    // Сохраняем, что пользователь поделился
    await db.saveShare({
        userId,
        mediaId: resultId,
        timestamp: new Date()
    });
});
```

### Персонализация на основе истории

```javascript
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    
    // Получаем историю пользователя
    const userHistory = await db.getUserHistory(userId);
    
    if (userHistory.length > 0) {
        await ctx.reply(
            `👋 С возвращением!\n\n` +
            `📊 Вы посмотрели ${userHistory.length} фильмов`,
            Markup.inlineKeyboard([
                [Markup.button.webApp('🎬 Открыть приложение', WEB_APP_URL)]
            ])
        );
    } else {
        // Обычное приветствие для новых пользователей
    }
});
```

## Webhook для production

```javascript
const express = require('express');
const app = express();

// Webhook endpoint
app.use(bot.webhookCallback('/webhook'));

// Health check
app.get('/health', (req, res) => {
    res.send('OK');
});

// Запуск с webhook
const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (WEBHOOK_URL) {
    bot.telegram.setWebhook(`${WEBHOOK_URL}/webhook`);
    app.listen(PORT, () => {
        console.log(`✅ Webhook запущен на порту ${PORT}`);
    });
} else {
    // Polling для разработки
    bot.launch();
    console.log('✅ Бот запущен в режиме polling');
}
```

## Мониторинг и логирование

```javascript
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// Логируем все inline запросы
bot.on('inline_query', async (ctx) => {
    logger.info('Inline query', {
        userId: ctx.from.id,
        username: ctx.from.username,
        query: ctx.inlineQuery.query
    });
    
    // ... остальной код
});

// Логируем ошибки
bot.catch((err, ctx) => {
    logger.error('Bot error', {
        error: err.message,
        stack: err.stack,
        update: ctx.update
    });
});
```

## Тестирование

```javascript
// test/bot.test.js
const { Telegraf } = require('telegraf');
const { getMediaData } = require('../index');

describe('Bot functions', () => {
    test('getMediaData returns movie data', async () => {
        const data = await getMediaData('movie', 550);
        expect(data).toHaveProperty('title');
        expect(data.title).toBe('Fight Club');
    });
    
    test('generates correct direct link', () => {
        const link = generateDirectLink('movie', 550);
        expect(link).toBe('https://t.me/onceappbot/app?startapp=movie_550');
    });
});
```

## Полезные команды

### Получение информации о боте

```javascript
bot.command('info', async (ctx) => {
    const botInfo = await ctx.telegram.getMe();
    await ctx.reply(
        `🤖 Информация о боте:\n\n` +
        `Имя: ${botInfo.first_name}\n` +
        `Username: @${botInfo.username}\n` +
        `ID: ${botInfo.id}`
    );
});
```

### Статистика использования

```javascript
bot.command('stats', async (ctx) => {
    const stats = await db.getStats();
    await ctx.reply(
        `📊 Статистика:\n\n` +
        `👥 Пользователей: ${stats.users}\n` +
        `🎬 Фильмов поделились: ${stats.shares}\n` +
        `🔍 Inline запросов: ${stats.queries}`
    );
});
```

## Дополнительные ресурсы

- [Telegraf документация](https://telegraf.js.org/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [TMDB API](https://developers.themoviedb.org/3)
