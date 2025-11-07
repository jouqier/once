# Прямые ссылки на фильмы и сериалы

## Описание

Реализован функционал прямых ссылок (deep linking) для фильмов и сериалов. Пользователи могут делиться ссылками на конкретный контент, и при открытии ссылки приложение автоматически откроет страницу с деталями этого фильма или сериала.

## Возможности

### 1. Генерация прямых ссылок

Приложение генерирует два типа ссылок:

**Telegram Mini App ссылки** (основной формат):
```
https://t.me/your_bot_username/app?startapp=movie_123
https://t.me/your_bot_username/app?startapp=tv_456
```
Эти ссылки открывают приложение напрямую внутри Telegram.

**Веб-ссылки** (fallback):
```
https://your-app.com/?id=123&type=movie
https://your-app.com/?id=456&type=tv
```
Используются если бот не настроен или для веб-версии.

### 2. Deep Linking
При открытии приложения по прямой ссылке:
- Автоматически пропускаются приветственные сторис
- Сразу открывается страница с деталями фильма/сериала
- Сохраняется корректная навигация (можно вернуться назад)

### 3. Кнопка "Поделиться"
На странице каждого фильма и сериала добавлена кнопка с иконкой "share" в правом верхнем углу постера (32x32px с иконкой 20x20px), которая открывает меню с опциями:
- **Поделиться в Telegram** - открывает диалог шаринга в Telegram
- **Скопировать ссылку** - копирует ссылку в буфер обмена

## Технические детали

### Файлы

#### `src/services/share-link.js`
Сервис для работы с прямыми ссылками:
- `generateShareLink(mediaId, mediaType)` - генерирует URL (автоматически выбирает формат)
- `generateTelegramLink(mediaId, mediaType)` - генерирует Telegram Mini App ссылку
- `generateWebLink(mediaId, mediaType)` - генерирует веб-ссылку
- `copyToClipboard(mediaId, mediaType)` - копирует ссылку в буфер
- `shareToTelegram(mediaId, mediaType, title)` - открывает диалог шаринга
- `parseUrlParams()` - парсит параметры из URL
- `isDeepLink()` - проверяет, является ли URL прямой ссылкой

#### `src/main.js`
Обработка deep linking при загрузке приложения:
```javascript
// Проверяем URL параметры
const urlParams = new URLSearchParams(window.location.search);
let mediaId = urlParams.get('id');
let mediaType = urlParams.get('type');

// Проверяем startapp параметр для Telegram Mini App
const startApp = urlParams.get('startapp') || TG?.initDataUnsafe?.start_param;
if (startApp && !mediaId) {
    const parts = startApp.split('_');
    if (parts.length === 2) {
        mediaType = parts[0]; // 'movie' или 'tv'
        mediaId = parts[1];   // ID
    }
}

if (mediaId && mediaType) {
    navigationManager.navigateToDetails(mediaId, mediaType);
}
```

#### `src/components/card-poster.js`
Добавлена кнопка "Поделиться" в постер фильма/сериала:
- Позиционирование: правый верхний угол с отступами 16px
- Размер: 32x32px
- Иконка: SVG 20x20px (upload icon)
- Стиль: полупрозрачный фон с blur эффектом
- Метод `_handleShareClick()` для обработки клика

### URL параметры

**Для Telegram Mini App:**
- `startapp` - параметр в формате `{type}_{id}` (например: `movie_123`, `tv_456`)

**Для веб-версии:**
- `id` - ID фильма или сериала в TMDB
- `type` - тип контента (`movie` или `tv`)

### Интеграция с Telegram

Используется Telegram Web App API:
- `TG.openTelegramLink()` - для открытия диалога шаринга
- `TG.switchInlineQuery()` - альтернативный метод через inline query
- Fallback на копирование в буфер обмена, если API недоступен

## Использование

### Для пользователей

1. Откройте страницу фильма или сериала
2. Нажмите на кнопку "Поделиться" в правом верхнем углу постера (иконка со стрелкой вверх)
3. Выберите:
   - "Поделиться в Telegram" - чтобы отправить ссылку в чат
   - "Скопировать ссылку" - чтобы скопировать ссылку в буфер обмена

### Для разработчиков

```javascript
import { shareLinkService } from './services/share-link.js';

// Генерация ссылки
const link = shareLinkService.generateShareLink(123, 'movie');

// Копирование в буфер
await shareLinkService.copyToClipboard(123, 'movie');

// Шаринг в Telegram
shareLinkService.shareToTelegram(123, 'movie', 'Название фильма');

// Проверка deep link
if (shareLinkService.isDeepLink()) {
    const params = shareLinkService.parseUrlParams();
    console.log(params); // { mediaId: 123, mediaType: 'movie' }
}
```

## Переводы

Добавлены новые ключи в `src/services/i18n.js`:
- `share` - "Поделиться" / "Share"
- `shareToTelegram` - "Поделиться в Telegram" / "Share to Telegram"
- `copyLink` - "Скопировать ссылку" / "Copy link"

## Настройка

### Переменные окружения

В файле `.env` укажите имя вашего бота:
```env
VITE_BOT_USERNAME=your_bot_username
```

Без этой переменной будут генерироваться только веб-ссылки.

## Тестирование

### Локальное тестирование (веб-ссылки)
```bash
# Запустите dev сервер
npm run dev

# Откройте в браузере с параметрами
http://localhost:5173/?id=550&type=movie
http://localhost:5173/?id=1396&type=tv
```

### Тестирование в Telegram
1. Настройте `VITE_BOT_USERNAME` в `.env`
2. Соберите приложение: `npm run build`
3. Разверните на хостинге
4. Откройте Mini App в Telegram
5. Поделитесь фильмом - получите ссылку вида:
   ```
   https://t.me/your_bot/app?startapp=movie_550
   ```
6. Откройте эту ссылку в Telegram - приложение откроется с деталями фильма

## Ограничения

1. Ссылки работают только для фильмов и сериалов (не для жанров, персон и т.д.)
2. Требуется активное подключение к интернету для загрузки данных
3. Telegram Web App API может быть недоступен в некоторых браузерах (используется fallback)

## Будущие улучшения

- [ ] Добавить аналитику кликов по ссылкам
- [ ] Поддержка deep linking для жанров и персон
- [ ] Предпросмотр ссылок (Open Graph meta tags)
- [ ] QR-коды для ссылок
- [ ] История просмотренных по ссылкам фильмов
