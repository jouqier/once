# Настройка Direct Link за 5 минут

## Что такое Direct Link?

Direct Link - это специальный формат ссылок Telegram, который **автоматически открывает Mini App** без необходимости открывать чат с ботом.

**Формат:** `https://t.me/bot_username/app_short_name?startapp=параметры`

## Пошаговая инструкция

### Шаг 1: Создайте Web App в BotFather

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/newapp`
3. Выберите вашего бота из списка
4. Заполните информацию:
   - **Название:** Movie Tracker (или любое другое)
   - **Описание:** Track your movies and TV shows
   - **Фото:** Загрузите квадратное изображение (минимум 640x640px)
   - **GIF:** Отправьте `/empty` чтобы пропустить
   - **URL:** `https://your-deployed-app.com` (ваш реальный URL)
   - **Короткое имя:** `app` (только латиница, без пробелов)

5. BotFather создаст приложение и покажет ссылку вида:
   ```
   https://t.me/your_bot/app
   ```

### Шаг 2: Настройте .env

Добавьте в файл `.env`:

```env
VITE_BOT_USERNAME=your_bot_username
VITE_APP_SHORT_NAME=app
```

**Важно:** 
- `VITE_BOT_USERNAME` - имя бота БЕЗ символа `@`
- `VITE_APP_SHORT_NAME` - короткое имя из шага 1 (то, что вы указали в BotFather)

### Шаг 3: Пересоберите приложение

```bash
npm run build
```

### Шаг 4: Проверьте

1. Откройте ваш Mini App в Telegram
2. Откройте любой фильм
3. Нажмите кнопку "Поделиться" (в правом верхнем углу постера)
4. Выберите "Скопировать ссылку"
5. Проверьте формат ссылки - должно быть:
   ```
   https://t.me/your_bot/app?startapp=movie_550
   ```

6. Откройте эту ссылку в Telegram - Mini App должен открыться автоматически!

## Частые проблемы

### Ссылка открывает чат с ботом

**Причина:** Web App не создан в BotFather или неправильное короткое имя.

**Решение:**
1. Проверьте, что вы выполнили `/newapp` в BotFather
2. Убедитесь, что `VITE_APP_SHORT_NAME` совпадает с коротким именем из BotFather
3. Проверьте формат ссылки - должно быть `/app?startapp=`, а не `?start=`

### Ссылка не работает

**Причина:** Неправильный URL в BotFather или приложение не развернуто.

**Решение:**
1. Убедитесь, что приложение доступно по URL, указанному в BotFather
2. Проверьте, что URL использует HTTPS (не HTTP)
3. Откройте URL в браузере - приложение должно загрузиться

### Генерируются старые ссылки

**Причина:** Не пересобрали приложение после изменения `.env`.

**Решение:**
```bash
npm run build
```

## Проверка настройки

### В консоли браузера

Откройте консоль (F12) и выполните:

```javascript
console.log(import.meta.env.VITE_BOT_USERNAME);
console.log(import.meta.env.VITE_APP_SHORT_NAME);
```

Должны вывестись ваши значения.

### Тест генерации ссылки

```javascript
import { shareLinkService } from './services/share-link.js';

const link = shareLinkService.generateTelegramLink(550, 'movie');
console.log(link);
// Должно быть: https://t.me/your_bot/app?startapp=movie_550
```

## Альтернатива: Если не хотите создавать Web App

Если вы не хотите создавать Web App в BotFather, можно использовать обычные веб-ссылки:

1. Не указывайте `VITE_BOT_USERNAME` в `.env`
2. Приложение будет генерировать ссылки вида:
   ```
   https://your-app.com/?id=550&type=movie
   ```
3. Эти ссылки будут открываться в браузере, а не в Telegram

## Дополнительная информация

- [Полная документация](./SHARE_LINKS_RU.md)
- [Пример кода бота](./BOT_EXAMPLE.md) (не требуется для Direct Link!)
- [Troubleshooting](./SHARE_SETUP.md#troubleshooting)

## Важно

**Direct Link работает автоматически!** Вам НЕ нужно:
- Писать код для бота
- Обрабатывать команду `/start`
- Настраивать webhook

Просто создайте Web App в BotFather, укажите переменные в `.env`, и всё заработает!
