# Настройка шаринга с превью (Inline Mode)

## Что это?

Шаринг с превью позволяет отправлять красивые карточки с постером фильма, описанием и inline кнопкой для открытия Mini App.

**Пример:**
```
┌─────────────────────────────┐
│  [Постер фильма]            │
│                             │
│  Fight Club                 │
│  ⭐ 8.4/10                  │
│                             │
│  An insomniac office...     │
│                             │
│  [▶️ Открыть в приложении]  │
└─────────────────────────────┘
```

## Требования

Для работы шаринга с превью нужно:

1. ✅ Настроенный Web App (уже есть)
2. ✅ Включенный Inline Mode для бота
3. ✅ Код бота для обработки inline запросов

## Шаг 1: Включите Inline Mode в BotFather

1. Откройте [@BotFather](https://t.me/BotFather)
2. Отправьте `/mybots`
3. Выберите вашего бота `@onceappbot`
4. Выберите "Bot Settings"
5. Выберите "Inline Mode"
6. Выберите "Turn on"
7. Отправьте placeholder текст (например: "Поиск фильмов...")

## Шаг 2: Настройте код бота

Бот должен обрабатывать inline запросы и возвращать карточки с превью.

### Пример на Node.js (Telegraf)

```javascript
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN);
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const WEB_APP_URL = process.env.WEB_APP_URL;

// Обработка inline запросов
bot.on('inline_query', async (ctx) => {
    const query = ctx.inlineQuery.query;
    
    // Проверяем формат: share_movie_550 или share_tv_1396
    if (query.startsWith('share_')) {
        const parts = query.split('_');
        if (parts.length === 3) {
            const [, mediaType, mediaId] = parts;
            
            try {
                // Получаем данные о фильме/сериале из TMDB
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
                
                const data = response.data;
                const title = data.title || data.name;
                const overview = data.overview || 'Описание отсутствует';
                const rating = data.vote_average ? `⭐ ${data.vote_average.toFixed(1)}/10` : '';
                const posterUrl = data.poster_path 
                    ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
                    : '';
                
                // Генерируем Direct Link
                const directLink = `https://t.me/onceappbot/app?startapp=${mediaType}_${mediaId}`;
                
                // Формируем результат
                const result = {
                    type: 'article',
                    id: `${mediaType}_${mediaId}`,
                    title: title,
                    description: `${rating}\n${overview.substring(0, 100)}...`,
                    thumb_url: posterUrl,
                    input_message_content: {
                        message_text: `🎬 ${title}\n${rating}\n\n${overview.substring(0, 200)}...`,
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
                    cache_time: 300
                });
            } catch (error) {
                console.error('Error fetching movie data:', error);
                await ctx.answerInlineQuery([]);
            }
        }
    } else {
        // Пустой запрос или обычный поиск
        await ctx.answerInlineQuery([]);
    }
});

bot.launch();
```

### Пример на Python (python-telegram-bot)

```python
from telegram import Update, InlineQueryResultArticle, InputTextMessageContent, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, InlineQueryHandler, ContextTypes
import os
import requests

TMDB_API_KEY = os.getenv('TMDB_API_KEY')
WEB_APP_URL = os.getenv('WEB_APP_URL')
BOT_USERNAME = os.getenv('BOT_USERNAME')

async def inline_query(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.inline_query.query
    
    # Проверяем формат: share_movie_550 или share_tv_1396
    if query.startswith('share_'):
        parts = query.split('_')
        if len(parts) == 3:
            _, media_type, media_id = parts
            
            try:
                # Получаем данные из TMDB
                endpoint = 'movie' if media_type == 'movie' else 'tv'
                response = requests.get(
                    f'https://api.themoviedb.org/3/{endpoint}/{media_id}',
                    params={
                        'api_key': TMDB_API_KEY,
                        'language': 'ru-RU'
                    }
                )
                data = response.json()
                
                title = data.get('title') or data.get('name')
                overview = data.get('overview', 'Описание отсутствует')
                rating = f"⭐ {data['vote_average']:.1f}/10" if data.get('vote_average') else ''
                poster_url = f"https://image.tmdb.org/t/p/w500{data['poster_path']}" if data.get('poster_path') else ''
                
                # Direct Link
                direct_link = f"https://t.me/{BOT_USERNAME}/app?startapp={media_type}_{media_id}"
                
                # Inline кнопка
                keyboard = InlineKeyboardMarkup([[
                    InlineKeyboardButton("▶️ Открыть в приложении", url=direct_link)
                ]])
                
                # Результат
                result = InlineQueryResultArticle(
                    id=f"{media_type}_{media_id}",
                    title=title,
                    description=f"{rating}\n{overview[:100]}...",
                    thumb_url=poster_url,
                    input_message_content=InputTextMessageContent(
                        message_text=f"🎬 {title}\n{rating}\n\n{overview[:200]}..."
                    ),
                    reply_markup=keyboard
                )
                
                await update.inline_query.answer([result], cache_time=300)
            except Exception as e:
                print(f"Error: {e}")
                await update.inline_query.answer([])
    else:
        await update.inline_query.answer([])

def main():
    application = Application.builder().token(os.getenv('BOT_TOKEN')).build()
    application.add_handler(InlineQueryHandler(inline_query))
    application.run_polling()

if __name__ == '__main__':
    main()
```

## Шаг 3: Проверьте работу

1. Соберите и разверните приложение
2. Откройте любой фильм в Mini App
3. Нажмите "Поделиться"
4. Выберите "Поделиться с превью"
5. Telegram откроет диалог выбора чата
6. Выберите чат и отправьте
7. В чате появится красивая карточка с постером и кнопкой

## Альтернатива: Без кода бота

Если вы не хотите писать код для бота, можно использовать простой шаринг:

1. Используйте опцию "Поделиться в Telegram" вместо "Поделиться с превью"
2. Это отправит простую текстовую ссылку без превью
3. Но ссылка всё равно будет работать и открывать Mini App

## Troubleshooting

### Inline Mode не работает

**Проблема:** При нажатии "Поделиться с превью" ничего не происходит.

**Решение:**
1. Проверьте, что Inline Mode включен в BotFather
2. Убедитесь, что бот запущен и обрабатывает inline запросы
3. Проверьте логи бота на наличие ошибок

### Не показывается превью

**Проблема:** Карточка отправляется, но без постера.

**Решение:**
1. Проверьте, что `thumb_url` указан правильно
2. URL постера должен быть доступен по HTTPS
3. Размер изображения должен быть не более 5MB

### Кнопка не работает

**Проблема:** Кнопка "Открыть в приложении" не открывает Mini App.

**Решение:**
1. Проверьте формат Direct Link в коде бота
2. Убедитесь, что используется правильное короткое имя приложения
3. Проверьте, что Web App настроен в BotFather

## Дополнительные возможности

### Добавление рейтинга пользователя

Если пользователь оценил фильм, можно добавить это в карточку:

```javascript
const userRating = getUserRating(mediaId); // Ваша функция
const ratingText = userRating 
    ? `⭐ ${rating} | 👤 Моя оценка: ${userRating}/10`
    : `⭐ ${rating}`;
```

### Добавление жанров

```javascript
const genres = data.genres.map(g => g.name).join(', ');
const description = `${rating}\n${genres}\n\n${overview}`;
```

### Кастомизация кнопки

```javascript
reply_markup: {
    inline_keyboard: [[
        { text: '▶️ Смотреть', url: directLink },
        { text: '📝 Оставить отзыв', url: directLink }
    ]]
}
```

## Требования к боту

Для работы inline mode боту нужны:

1. **TMDB API ключ** - для получения данных о фильмах
2. **Доступ к интернету** - для запросов к TMDB API
3. **Постоянная работа** - бот должен быть запущен 24/7

Можно развернуть бота на:
- Heroku (бесплатно с ограничениями)
- Railway
- Render
- VPS сервере
- Vercel (для serverless функций)
