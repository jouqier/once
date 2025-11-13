<!-- 0a1559bf-1b0f-453f-a3ad-2a715b25f2c9 295e5f48-26b0-4e9d-87d1-317976bbe1d3 -->
# Реализация Telegram CloudStorage

## Цель

Мигрировать хранение данных пользователя с localStorage на Telegram CloudStorage для синхронизации между устройствами с сохранением всей существующей функциональности.

## Текущее состояние

- Структура данных версии 1.4 уже готова для CloudStorage (разбитая структура ключей)
- `StorageAdapter` работает синхронно с localStorage
- `UserDataStore` использует синхронные методы StorageAdapter
- `UserMoviesService` - обертка над UserDataStore для удобного API
- Компоненты кнопок (`movie-card-buttons.js`, `show-card-buttons.js`) используют синхронные методы
- События `movie-list-changed` обновляют UI (бейджи, кнопки, списки серий)
- Данные хранятся в разбитом формате с автоматическим группированием

## Требования

1. Автоматический fallback на localStorage при недоступности CloudStorage
2. Автоматическое определение окружения (Telegram vs браузер) - использовать localStorage вне Telegram
3. Автоматическая миграция данных при первом запуске
4. Сохранение всей логики работы с кнопками, модальными окнами, списками серий, бейджами рейтинга и прогресса

## План реализации

### 1. Создать CloudStorageAdapter

**Файл:** `src/services/cloud-storage-adapter.js`

- Обертка над Telegram CloudStorage API с промисами
- Методы: `getItem(key)`, `setItem(key, value)`, `removeItem(key)`, `getKeys()`
- Статический метод `isAvailable()` для проверки доступности CloudStorage
- Обработка ошибок и проверка размера значения (лимит 4096 символов)
- Автоматическое определение доступности через проверку `window.Telegram?.WebApp?.CloudStorage`

### 2. Рефакторинг StorageAdapter

**Файл:** `src/services/storage-adapter.js`

- Добавить параметр конструктора: `storageType: 'localStorage' | 'cloudStorage' | 'auto'` (по умолчанию 'auto')
- При `'auto'` автоматически определять доступность CloudStorage и выбирать хранилище
- Сделать все приватные методы асинхронными (`async _getItem()`, `async _setItem()`, `async _removeItem()`)
- Публичные методы остаются синхронными для обратной совместимости (используют внутренний кеш)
- Реализовать внутренний кеш для быстрого доступа
- Fallback на localStorage при ошибках CloudStorage
- Сохранить все существующие публичные методы и их сигнатуры

### 3. Обновление UserDataStore с кешированием

**Файл:** `src/services/user-data-store.js`

- Добавить внутренний кеш данных для синхронного доступа
- Сделать `_initStore()` асинхронным с загрузкой данных в кеш при инициализации
- Обновить методы для работы с асинхронным StorageAdapter через кеш
- Реализовать фоновую синхронизацию: изменения сохраняются асинхронно, но кеш обновляется синхронно
- Добавить проверку доступности CloudStorage при инициализации
- Реализовать автоматическую миграцию данных из localStorage в CloudStorage при первом запуске
- Сохранить синхронные методы для обратной совместимости (используют кеш)
- Методы `getMovies()`, `getTVShows()`, `getReview()` остаются синхронными
- Методы `addMovie()`, `removeMovie()`, `saveReview()` обновляют кеш синхронно и сохраняют асинхронно

### 4. Реализация миграции данных

**Файл:** `src/services/cloud-storage-migration.js` (новый)

- Функция `async migrateToCloudStorage(userId)` для миграции всех ключей
- Проверка наличия данных в CloudStorage перед миграцией (избежать дублирования)
- Проверка флага `user_{userId}_migrated` в CloudStorage
- Миграция всех ключей с префиксом `user_{userId}_` из localStorage в CloudStorage
- Валидация данных после миграции (сравнение количества ключей)
- Сохранение флага миграции в CloudStorage для предотвращения повторной миграции
- Опциональное удаление данных из localStorage после успешной миграции (с задержкой для безопасности)

### 5. Обновление UserMoviesService

**Файл:** `src/services/user-movies.js`

- Методы остаются синхронными (используют синхронные методы UserDataStore с кешем)
- Сохранить все существующие методы без изменений сигнатур
- Не требуется изменений, так как UserDataStore сохраняет синхронный API

### 6. Сохранение логики компонентов

**Файлы:**

- `src/components/movie-card-buttons.js`
- `src/components/show-card-buttons.js`
- `src/components/show-card-seasons.js`
- `src/pages/movies/movies-page.js`
- `src/pages/tvshows/shows-page.js`
- `src/pages/profile/profile-page.js`

- Компоненты остаются без изменений (используют синхронные методы UserMoviesService)
- События `movie-list-changed` продолжают работать как раньше
- Бейджи рейтинга и прогресса обновляются через события без изменений
- Кнопки, модальные окна, списки серий работают как прежде

### 7. Обновление инициализации

**Файл:** `src/services/user-data-store.js`

- Добавить метод `async init()` для асинхронной инициализации
- Вызывать `await userDataStore.init()` в `main.js` перед использованием
- Обработать случаи, когда CloudStorage недоступен (fallback на localStorage)
- Сохранить синхронный конструктор для обратной совместимости

**Файл:** `src/main.js`

- Добавить `await userDataStore.init()` в начале инициализации приложения
- Обработать ошибки инициализации

### 8. Обработка edge cases

- Проверка доступности CloudStorage перед использованием
- Fallback на localStorage для гостевого режима или вне Telegram
- Обработка ошибок при превышении лимитов CloudStorage
- Логирование для отладки
- Обработка конфликтов при синхронизации (приоритет последнему изменению)

## Технические детали

### Структура CloudStorageAdapter

```javascript
class CloudStorageAdapter {
    static isAvailable() // boolean - проверка доступности
    async getItem(key) // Promise<string | null>
    async setItem(key, value) // Promise<boolean>
    async removeItem(key) // Promise<boolean>
    async getKeys() // Promise<string[]>
}
```

### Обновление StorageAdapter

- Конструктор: `constructor(userId, storageType = 'auto')`
- При `storageType: 'auto'` автоматически выбирает CloudStorage если доступен, иначе localStorage
- Приватные методы становятся асинхронными: `async _getItem(key)`, `async _setItem(key, value)`, etc.
- Публичные методы остаются синхронными и используют внутренний кеш
- Внутренний кеш обновляется при инициализации и при изменениях

### Стратегия кеширования в UserDataStore

- При инициализации загружать все данные в память (кеш)
- Синхронные методы (`getMovies()`, `getTVShows()`, `getReview()`, etc.) работают с кешем
- Методы изменений (`addMovie()`, `removeMovie()`, `saveReview()`, etc.) обновляют кеш синхронно и сохраняют асинхронно в фоне
- Фоновая синхронизация при изменениях не блокирует UI

### Миграция данных

- Проверка флага `user_{userId}_migrated` в CloudStorage
- Если флаг отсутствует и есть данные в localStorage - выполнить миграцию
- Миграция всех ключей с префиксом `user_{userId}_`
- Валидация: сравнение количества ключей до и после миграции
- Сохранение флага миграции после успешного завершения
- Удаление данных из localStorage только после успешной валидации миграции

## Риски и ограничения

- CloudStorage доступен только в Telegram клиентах (решается fallback на localStorage)
- Лимит 4096 символов на значение (уже учтено в структуре данных версии 1.4)
- Лимит 1024 ключа на пользователя (текущее использование ~9-24 ключей, безопасно)
- Асинхронность требует аккуратной обработки, но кеширование решает проблему для UI

## Тестирование

- Тестирование в Telegram клиенте с CloudStorage
- Тестирование fallback на localStorage вне Telegram
- Тестирование миграции данных из localStorage в CloudStorage
- Проверка синхронизации между устройствами
- Проверка сохранения логики кнопок, модальных окон, списков серий, бейджей рейтинга и прогресса
- Проверка событий `movie-list-changed` и обновления UI

### To-dos

- [ ] Создать CloudStorageAdapter с промисами для работы с Telegram CloudStorage API
- [ ] Рефакторить StorageAdapter для поддержки асинхронных операций и выбора типа хранилища
- [ ] Обновить UserDataStore для работы с асинхронным StorageAdapter
- [ ] Реализовать миграцию данных из localStorage в CloudStorage
- [ ] Обновить все места использования userDataStore для поддержки асинхронных операций
- [ ] Добавить обработку ошибок и fallback на localStorage при недоступности CloudStorage