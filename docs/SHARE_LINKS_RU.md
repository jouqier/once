# Прямые ссылки - Краткая инструкция

## Что реализовано

✅ **Deep linking** - открытие приложения по прямой ссылке на фильм/сериал  
✅ **Кнопка "Поделиться"** в правом верхнем углу постера (32x32px)  
✅ **Шаринг в Telegram** - отправка ссылки в чат  
✅ **Копирование ссылки** в буфер обмена  
✅ **Автоматическая навигация** при открытии по ссылке  

## Как это работает

### Для пользователей

1. **Поделиться фильмом:**
   - Откройте страницу фильма/сериала
   - Нажмите кнопку с иконкой "share" в правом верхнем углу постера
   - Выберите "Поделиться в Telegram" или "Скопировать ссылку"

2. **Открыть по ссылке:**
   - Получите ссылку от друга (например: `https://app.com/?id=550&type=movie`)
   - Откройте ссылку
   - Приложение автоматически откроет страницу этого фильма

### Формат ссылок

**Telegram (основной):**
```
Фильмы:  https://t.me/your_bot?start=movie_550
Сериалы: https://t.me/your_bot?start=tv_1396
```
Открывают чат с ботом и автоматически запускают Mini App с нужным контентом.

**Веб-версия (fallback):**
```
Фильмы:  https://your-app.com/?id=550&type=movie
Сериалы: https://your-app.com/?id=1396&type=tv
```

## Архитектура

### Новые файлы

**`src/services/share-link.js`** - сервис для работы со ссылками
```javascript
// Основные методы:
shareLinkService.generateShareLink(mediaId, mediaType)      // Автовыбор формата
shareLinkService.generateTelegramLink(mediaId, mediaType)   // Telegram ссылка (t.me/bot?start=...)
shareLinkService.generateWebLink(mediaId, mediaType)        // Веб-ссылка
shareLinkService.copyToClipboard(mediaId, mediaType)
shareLinkService.shareToTelegram(mediaId, mediaType, title)
```

### Изменённые файлы

**`src/main.js`**
- Добавлена проверка URL параметров при загрузке
- Поддержка `start` параметра для Telegram (из ссылок и `start_param`)
- Поддержка `id` и `type` параметров для веб-версии
- Автоматическое открытие деталей при deep link

**`src/components/card-poster.js`**
- Добавлена кнопка "Поделиться" в постер
- Позиция: правый верхний угол, отступы 16px
- Размер: 32x32px, иконка 20x20px
- Метод `_handleShareClick()` для обработки клика

**`src/services/i18n.js`**
- Добавлены переводы: `share`, `shareToTelegram`, `copyLink`

## Настройка

Добавьте в `.env`:
```env
VITE_BOT_USERNAME=your_bot_username
```

## Тестирование

### Локально (веб-ссылки)
```bash
npm run dev

# Откройте в браузере:
http://localhost:5173/?id=550&type=movie      # Fight Club
http://localhost:5173/?id=1396&type=tv        # Breaking Bad
```

### В Telegram (Mini App ссылки)
1. Настройте `VITE_BOT_USERNAME` в `.env`
2. Соберите: `npm run build`
3. Разверните на хостинге
4. Откройте Mini App в Telegram
5. Поделитесь фильмом - получите ссылку:
   ```
   https://t.me/your_bot?start=movie_550
   ```
6. Откройте ссылку в Telegram - откроется чат с ботом и автоматически запустится Mini App

## Интеграция с текущей архитектурой

### NavigationManager
Уже поддерживал URL параметры через `history.pushState`, поэтому интеграция была простой:
```javascript
navigateToDetails(mediaId, mediaType, sourceTab)
```

### URL параметры
Уже использовались для навигации:
- `?id=123&type=movie` - детали фильма
- `?id=456&type=tv` - детали сериала

### Telegram Web App API
Используется для шаринга:
- `TG.openTelegramLink()` - основной метод
- `TG.switchInlineQuery()` - альтернатива
- Fallback на `navigator.clipboard` если API недоступен

## Примеры использования

### Генерация ссылки
```javascript
import { shareLinkService } from './services/share-link.js';

const movieLink = shareLinkService.generateShareLink(550, 'movie');
console.log(movieLink); // https://app.com/?id=550&type=movie
```

### Проверка deep link
```javascript
if (shareLinkService.isDeepLink()) {
    const { mediaId, mediaType } = shareLinkService.parseUrlParams();
    console.log(`Opening ${mediaType} with ID ${mediaId}`);
}
```

### Шаринг
```javascript
// В Telegram
shareLinkService.shareToTelegram(550, 'movie', 'Fight Club');

// Копирование
await shareLinkService.copyToClipboard(550, 'movie');
```

## Что дальше?

Возможные улучшения:
- Аналитика переходов по ссылкам
- Deep linking для жанров и персон
- Open Graph meta tags для красивых превью
- QR-коды для ссылок
- Короткие ссылки (URL shortener)
