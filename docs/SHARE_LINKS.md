# Прямые ссылки на фильмы и сериалы

## Описание

Реализован функционал прямых ссылок (deep linking) для фильмов и сериалов. Пользователи могут делиться ссылками на конкретный контент, и при открытии ссылки приложение автоматически откроет страницу с деталями этого фильма или сериала.

## Возможности

### 1. Генерация прямых ссылок
Каждый фильм и сериал имеет уникальную ссылку вида:
```
https://your-app.com/?id=123&type=movie
https://your-app.com/?id=456&type=tv
```

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
- `generateShareLink(mediaId, mediaType)` - генерирует URL
- `copyToClipboard(mediaId, mediaType)` - копирует ссылку в буфер
- `shareToTelegram(mediaId, mediaType, title)` - открывает диалог шаринга
- `parseUrlParams()` - парсит параметры из URL
- `isDeepLink()` - проверяет, является ли URL прямой ссылкой

#### `src/main.js`
Обработка deep linking при загрузке приложения:
```javascript
const urlParams = new URLSearchParams(window.location.search);
const mediaId = urlParams.get('id');
const mediaType = urlParams.get('type');

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

## Тестирование

### Локальное тестирование
```bash
# Запустите dev сервер
npm run dev

# Откройте в браузере с параметрами
http://localhost:5173/?id=550&type=movie
http://localhost:5173/?id=1396&type=tv
```

### Production тестирование
```
https://your-app.com/?id=550&type=movie
https://your-app.com/?id=1396&type=tv
```

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
