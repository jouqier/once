# Movie Tracker Bot

Telegram бот для Mini App с поддержкой inline шаринга с превью.

## Возможности

- ✅ Обработка команды `/start` с параметрами
- ✅ Inline mode для шаринга с превью
- ✅ Красивые карточки с постером и описанием
- ✅ Inline кнопка для открытия Mini App
- ✅ Автоматическое получение данных из TMDB

## Установка

### 1. Установите зависимости

```bash
cd bot
npm install
```

### 2. Настройте переменные окружения

Скопируйте `.env.example` в `.env`:

```bash
cp .env.example .env
```

Заполните `.env`:

```env
BOT_TOKEN=7760619955:AAGx92Yd0NrHVBLue9I27dZ4bdqJv6lyH1s
TMDB_API_KEY=8e2566462de35ecf36a54f4a04235ca8
WEB_APP_URL=https://your-app.pages.dev
BOT_USERNAME=onceappbot
APP_SHORT_NAME=app
```

### 3. Включите Inline Mode

1. Откройте [@BotFather](https://t.me/BotFather)
2. Отправьте `/mybots`
3. Выберите вашего бота
4. Выберите "Bot Settings" → "Inline Mode"
5. Выберите "Turn on"
6. Отправьте placeholder: "Поиск фильмов..."

### 4. Запустите бота

**Для разработки:**
```bash
npm run dev
```

**Для production:**
```bash
npm start
```

## Использование

### Команда /start

Обычный запуск:
```
/start
```

С параметром (открывает конкретный фильм):
```
/start movie_550
```

### Inline Mode

В любом чате наберите:
```
@onceappbot share_movie_550
```

Бот покажет карточку с превью, которую можно отправить в чат.

## Структура проекта

```
bot/
├── index.js          # Основной файл бота
├── package.json      # Зависимости
├── .env.example      # Пример конфигурации
├── .env              # Ваша конфигурация (не коммитить!)
└── README.md         # Эта документация
```

## Деплой

### Heroku

1. Создайте приложение на Heroku
2. Добавьте переменные окружения в Settings → Config Vars
3. Подключите GitHub репозиторий
4. Деплойте

### Railway

1. Создайте новый проект на Railway
2. Подключите GitHub репозиторий
3. Добавьте переменные окружения
4. Railway автоматически задеплоит

### VPS (Ubuntu)

```bash
# Установите Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Клонируйте репозиторий
git clone <your-repo>
cd bot

# Установите зависимости
npm install

# Настройте .env
nano .env

# Установите PM2
sudo npm install -g pm2

# Запустите бота
pm2 start index.js --name movie-bot

# Автозапуск при перезагрузке
pm2 startup
pm2 save
```

## Логи

Просмотр логов:
```bash
pm2 logs movie-bot
```

Остановка:
```bash
pm2 stop movie-bot
```

Перезапуск:
```bash
pm2 restart movie-bot
```

## Troubleshooting

### Бот не отвечает на inline запросы

**Проблема:** При вводе `@onceappbot share_movie_550` ничего не происходит.

**Решение:**
1. Проверьте, что Inline Mode включен в BotFather
2. Убедитесь, что бот запущен (проверьте логи)
3. Проверьте, что TMDB API ключ работает

### Ошибка "Invalid bot token"

**Проблема:** Бот не запускается с ошибкой токена.

**Решение:**
1. Проверьте `BOT_TOKEN` в `.env`
2. Получите новый токен у @BotFather если нужно
3. Убедитесь, что нет лишних пробелов в токене

### Не загружаются постеры

**Проблема:** Карточки отправляются без изображений.

**Решение:**
1. Проверьте, что TMDB API ключ работает
2. Убедитесь, что у фильма есть постер в TMDB
3. Проверьте интернет-соединение бота

### Кнопка не открывает Mini App

**Проблема:** При нажатии на кнопку ничего не происходит.

**Решение:**
1. Проверьте `WEB_APP_URL` в `.env`
2. Убедитесь, что Web App настроен в BotFather
3. Проверьте `APP_SHORT_NAME` - должен совпадать с BotFather

## API Endpoints

Бот использует следующие TMDB API endpoints:

- `GET /3/movie/{id}` - данные о фильме
- `GET /3/tv/{id}` - данные о сериале
- `GET /3/configuration` - конфигурация (для проверки подключения)

## Лимиты

- **TMDB API:** 40 запросов в 10 секунд
- **Telegram Bot API:** 30 сообщений в секунду
- **Inline queries:** 50 результатов максимум

## Безопасность

- ❌ Не коммитьте `.env` файл
- ✅ Используйте переменные окружения
- ✅ Регулярно обновляйте зависимости
- ✅ Используйте HTTPS для webhook (в production)

## Лицензия

MIT
