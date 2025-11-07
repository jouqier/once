# Пример настройки бота для прямых ссылок

## Проблема

Когда пользователь открывает ссылку `https://t.me/your_bot?start=movie_123`, Telegram открывает чат с ботом, но не запускает Mini App автоматически.

## Решение

Бот должен обрабатывать команду `/start` и автоматически предлагать открыть Mini App.

## Пример кода (Node.js + Telegraf)

```javascript
const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Обработка команды /start с параметром
bot.start(async (ctx) => {
    const startParam = ctx.startPayload; // Получаем параметр после start=
    
    if (startParam) {
        // Если есть параметр (например, movie_123)
        const [type, id] = startParam.split('_');
        
        if (type && id) {
            // Отправляем сообщение с кнопкой для открытия Mini App
            await ctx.reply(
                `🎬 Открыть ${type === 'movie' ? 'фильм' : 'сериал'}?`,
                Markup.inlineKeyboard([
                    Markup.button.webApp(
                        '▶️ Открыть',
                        `${process.env.WEB_APP_URL}?id=${id}&type=${type}`
                    )
                ])
            );
            return;
        }
    }
    
    // Обычное приветствие без параметра
    await ctx.reply(
        'Привет! Я помогу тебе найти фильмы и сериалы.',
        Markup.inlineKeyboard([
            Markup.button.webApp('🎬 Открыть приложение', process.env.WEB_APP_URL)
        ])
    );
});

bot.launch();
```

## Пример кода (Python + python-telegram-bot)

```python
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes
import os

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # Получаем параметр из команды /start
    args = context.args
    
    if args and len(args) > 0:
        start_param = args[0]  # Например, movie_123
        parts = start_param.split('_')
        
        if len(parts) == 2:
            media_type, media_id = parts
            
            # Создаем кнопку для открытия Mini App с параметрами
            keyboard = [
                [InlineKeyboardButton(
                    "▶️ Открыть",
                    web_app=WebAppInfo(url=f"{os.getenv('WEB_APP_URL')}?id={media_id}&type={media_type}")
                )]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            content_type = "фильм" if media_type == "movie" else "сериал"
            await update.message.reply_text(
                f"🎬 Открыть {content_type}?",
                reply_markup=reply_markup
            )
            return
    
    # Обычное приветствие
    keyboard = [
        [InlineKeyboardButton(
            "🎬 Открыть приложение",
            web_app=WebAppInfo(url=os.getenv('WEB_APP_URL'))
        )]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "Привет! Я помогу тебе найти фильмы и сериалы.",
        reply_markup=reply_markup
    )

def main():
    application = Application.builder().token(os.getenv('BOT_TOKEN')).build()
    application.add_handler(CommandHandler("start", start))
    application.run_polling()

if __name__ == '__main__':
    main()
```

## Альтернатива: Автоматическое открытие

Если вы хотите, чтобы Mini App открывался автоматически без кнопки, используйте Menu Button:

```javascript
// При старте бота настройте Menu Button
bot.telegram.setChatMenuButton({
    menu_button: {
        type: 'web_app',
        text: '🎬 Открыть',
        web_app: {
            url: process.env.WEB_APP_URL
        }
    }
});
```

Но это не позволит передать параметры напрямую. Поэтому лучше использовать первый вариант с кнопкой.

## Настройка в BotFather

1. Откройте [@BotFather](https://t.me/BotFather)
2. Отправьте `/myapps`
3. Выберите вашего бота
4. Выберите "Edit Web App URL"
5. Укажите URL вашего приложения (например, `https://your-app.com`)

## Тестирование

1. Запустите бота
2. Откройте ссылку: `https://t.me/your_bot?start=movie_550`
3. Бот должен отправить сообщение с кнопкой "Открыть"
4. При нажатии на кнопку откроется Mini App с деталями фильма

## Важные моменты

### Параметр start_param в initDataUnsafe

Когда пользователь открывает Mini App через кнопку бота, параметр `start` НЕ передается в URL приложения. Вместо этого он доступен в `window.Telegram.WebApp.initDataUnsafe.start_param`.

Поэтому в коде приложения мы проверяем оба источника:

```javascript
const startParam = urlParams.get('start') || TG?.initDataUnsafe?.start_param;
```

### Ограничения длины параметра

Параметр `start` в Telegram ограничен 64 символами. Формат `movie_123` или `tv_456` укладывается в это ограничение.

### Безопасность

Всегда валидируйте параметры на стороне приложения:

```javascript
if (startParam) {
    const parts = startParam.split('_');
    if (parts.length === 2) {
        const [type, id] = parts;
        // Проверяем, что type валидный
        if (type === 'movie' || type === 'tv') {
            // Проверяем, что id - это число
            if (!isNaN(id)) {
                // Безопасно использовать
                loadMedia(type, id);
            }
        }
    }
}
```

## Дополнительные возможности

### Аналитика

Отслеживайте, какие ссылки открываются:

```javascript
bot.start(async (ctx) => {
    const startParam = ctx.startPayload;
    
    if (startParam) {
        // Логируем в аналитику
        console.log(`User ${ctx.from.id} opened link with param: ${startParam}`);
        
        // Можно сохранить в базу данных
        await saveAnalytics({
            userId: ctx.from.id,
            param: startParam,
            timestamp: new Date()
        });
    }
    
    // ... остальной код
});
```

### Персонализация

Показывайте разные сообщения в зависимости от типа контента:

```javascript
if (type === 'movie') {
    await ctx.reply(
        '🎬 Хотите посмотреть этот фильм?',
        // ... кнопка
    );
} else if (type === 'tv') {
    await ctx.reply(
        '📺 Хотите посмотреть этот сериал?',
        // ... кнопка
    );
}
```

### Предпросмотр

Можно загрузить информацию о фильме из TMDB и показать превью:

```javascript
const movieInfo = await fetchMovieInfo(id);

await ctx.replyPhoto(movieInfo.poster_url, {
    caption: `🎬 ${movieInfo.title}\n⭐ ${movieInfo.rating}/10\n\n${movieInfo.overview}`,
    reply_markup: Markup.inlineKeyboard([
        Markup.button.webApp('▶️ Открыть', `${WEB_APP_URL}?id=${id}&type=${type}`)
    ])
});
```
