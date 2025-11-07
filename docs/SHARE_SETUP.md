# Настройка прямых ссылок для Telegram Mini App

## Быстрый старт

### 1. Настройте переменную окружения

В файле `.env` добавьте имя вашего бота:

```env
VITE_BOT_USERNAME=your_bot_username
```

**Где взять имя бота:**
- Откройте чат с [@BotFather](https://t.me/BotFather)
- Найдите вашего бота в списке
- Имя бота - это username без `@` (например, если бот `@MyMovieBot`, то `VITE_BOT_USERNAME=MyMovieBot`)

### 2. Соберите и разверните

```bash
npm run build
```

Разверните собранное приложение на вашем хостинге.

### 3. Проверьте работу

1. Откройте ваш Mini App в Telegram
2. Откройте любой фильм или сериал
3. Нажмите кнопку "Поделиться" (в правом верхнем углу постера)
4. Выберите "Поделиться в Telegram"
5. Отправьте ссылку себе или другу
6. Откройте ссылку - приложение должно открыться с деталями фильма

## Как это работает

### Формат ссылок

Приложение генерирует ссылки в формате Telegram Mini App:

```
https://t.me/your_bot_username/app?startapp=movie_550
https://t.me/your_bot_username/app?startapp=tv_1396
```

Где:
- `your_bot_username` - имя вашего бота из `.env`
- `startapp` - параметр запуска Mini App
- `movie_550` или `tv_1396` - тип контента и ID

### Обработка при открытии

Когда пользователь открывает такую ссылку:

1. Telegram запускает ваш Mini App
2. Приложение получает параметр `startapp` из URL или `TG.initDataUnsafe.start_param`
3. Парсит параметр: `movie_550` → `{ type: 'movie', id: 550 }`
4. Автоматически открывает страницу с деталями фильма

## Fallback для веб-версии

Если `VITE_BOT_USERNAME` не настроен, приложение будет генерировать обычные веб-ссылки:

```
https://your-app.com/?id=550&type=movie
```

Эти ссылки работают в браузере, но не открывают Mini App в Telegram.

## Проверка настройки

### В коде

```javascript
import { shareLinkService } from './services/share-link.js';

// Проверьте, какой тип ссылок генерируется
const link = shareLinkService.generateShareLink(550, 'movie');
console.log(link);

// Если настроено правильно, увидите:
// https://t.me/your_bot/app?startapp=movie_550

// Если не настроено:
// https://your-app.com/?id=550&type=movie
```

### В браузере

1. Откройте консоль разработчика (F12)
2. Выполните:
   ```javascript
   console.log(import.meta.env.VITE_BOT_USERNAME)
   ```
3. Должно вывести имя вашего бота

## Troubleshooting

### Ссылки не открывают Mini App

**Проблема:** Ссылка открывается в браузере, а не в Telegram.

**Решение:**
1. Проверьте, что `VITE_BOT_USERNAME` настроен в `.env`
2. Пересоберите приложение: `npm run build`
3. Убедитесь, что имя бота указано без `@`

### Приложение не открывает нужный фильм

**Проблема:** Mini App открывается, но показывает главную страницу.

**Решение:**
1. Проверьте консоль на ошибки
2. Убедитесь, что формат `startapp` правильный: `movie_123` или `tv_456`
3. Проверьте, что ID фильма существует в TMDB

### Ссылки генерируются в старом формате

**Проблема:** Генерируются ссылки `?id=123&type=movie` вместо `startapp=movie_123`.

**Решение:**
1. Проверьте `.env` файл
2. Убедитесь, что переменная называется именно `VITE_BOT_USERNAME`
3. Перезапустите dev сервер или пересоберите приложение

## Дополнительно

### Тестирование локально

Для локального тестирования можно использовать веб-ссылки:

```bash
npm run dev

# Откройте в браузере:
http://localhost:5173/?id=550&type=movie
```

### Аналитика

Для отслеживания переходов по ссылкам можно добавить дополнительные параметры:

```javascript
// В будущем можно расширить:
const link = shareLinkService.generateShareLink(550, 'movie');
// Добавить utm метки или другие параметры
```

### Кастомизация

Если нужен другой формат ссылок, отредактируйте `src/services/share-link.js`:

```javascript
generateTelegramLink(mediaId, mediaType) {
    // Ваш кастомный формат
    return `https://t.me/${botUsername}/app?startapp=custom_${mediaType}_${mediaId}`;
}
```

Не забудьте обновить парсинг в `src/main.js`.
