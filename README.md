# 🎬 Movie Mini App

[![Deploy to GitHub Pages](https://github.com/username/repo-name/actions/workflows/deploy.yml/badge.svg)](https://github.com/username/repo-name/actions/workflows/deploy.yml)

Telegram Mini App для просмотра, поиска и управления фильмами и сериалами. Приложение интегрируется с API The Movie Database (TMDB) и предоставляет современный интерфейс на React и shadcn/ui.

> **⚡ Быстрый старт:** См. [QUICK_START.md](./QUICK_START.md) для деплоя за 5 минут  
> **📖 Миграция с Vercel:** См. [MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md)

## ✨ Основные возможности

- **📱 Нативная интеграция с Telegram** - Полная поддержка Telegram WebApp API с haptic feedback и кастомными кнопками
- **🔗 Прямые ссылки** - Делитесь фильмами и сериалами через Telegram Mini App ссылки
- **🎥 Обширная база контента** - Доступ к миллионам фильмов и сериалов через TMDB API
- **🔍 Мультипоиск** - Поиск по фильмам, сериалам и актерам в одном месте
- **📝 Персональные списки** - "Хочу посмотреть" и "Просмотрено" с отслеживанием прогресса
- **⭐ Рейтинги и отзывы** - Оценивайте просмотренный контент и оставляйте заметки
- **🎭 Информация о персонах** - Полные данные об актерах и режиссерах
- **📺 Отслеживание сериалов** - Прогресс по сезонам и эпизодам
- **🎨 shadcn/ui + Tailwind CSS** - Тёмная тема на семантических токенах (`src/app/styles/globals.css`)
- **🎯 Рекомендации** - Персонализированные предложения на основе просмотренного
- **📖 Stories** - Приветственные сторис при первом запуске

## 🛠 Технологический стек

### Frontend
- **React 19** - Интерфейс на функциональных компонентах и хуках
- **shadcn/ui (Radix UI, vaul)** - Компоненты в `src/app/components/ui`, все диалоги и меню на `Drawer`
- **Tailwind CSS 4** - Стили через утилиты и семантические токены
- **lucide-react** - Иконки
- **Vite 5.4.11** - Быстрая сборка и dev сервер

### API & Интеграция
- **Telegram WebApp API** - Интеграция с Telegram
- **TMDB API** - База данных фильмов и сериалов
- **LocalStorage** - Хранение пользовательских данных

### Деплой
- **GitHub Pages** - Хостинг и CI/CD через GitHub Actions

## 🚀 Быстрый старт

### Требования
- Node.js 16.x или выше
- npm или yarn

### Установка

```bash
# Клонируйте репозиторий
git clone <repository-url>
cd my-mini-app

# Установите зависимости
npm install
```

### Конфигурация

Создайте файл `.env` в корне проекта:

```env
VITE_TMDB_API_KEY=ваш_ключ_tmdb
VITE_STORY_API_URL=https://your-bot-project.vercel.app
VITE_BOT_USERNAME=имя_вашего_бота
```

> **Важно**: Получите API ключ TMDB на https://www.themoviedb.org/settings/api

### Запуск

```bash
# Режим разработки (http://localhost:3000)
npm run dev

# Сборка для production
npm run build

# Просмотр production сборки
npm run preview
```

## 📁 Структура проекта

```
my-mini-app/
├── src/
│   ├── app/                  # React-приложение
│   │   ├── main.jsx                 # Точка входа: bootstrap, затем createRoot
│   │   ├── bootstrap.js             # Telegram, аналитика, миграции, userDataStore.init()
│   │   ├── App.jsx                  # Корневой компонент: экран, TabBar, сторис
│   │   ├── Screen.jsx               # Выбор экрана по состоянию navigationManager
│   │   ├── screens/                 # Экраны: discover, search, profile, details, genre, person
│   │   ├── features/details/        # Части экрана деталей (постер, сезоны, отзыв, каст и т.д.)
│   │   ├── components/              # Общие компоненты (AppDrawer, MediaPoster, TabBar, StoryViewer и т.д.)
│   │   │   └── ui/                  # shadcn-компоненты (button, drawer, tabs, switch и т.д.)
│   │   ├── hooks/                   # Хуки-обёртки над сервисами и навигацией
│   │   ├── lib/                     # Утилиты (cn, выбор медиа)
│   │   └── styles/globals.css       # Tailwind, токены темы, шрифт Inter, базовые стили
│   │
│   ├── services/             # Бизнес-логика и API
│   │   ├── tmdb.js                  # Сервис работы с TMDB API
│   │   ├── user-data.js             # Хранилище пользовательских данных
│   │   ├── user-data-store.js       # Управление данными пользователя
│   │   ├── user-movies.js           # Управление фильмами пользователя
│   │   ├── story-generator.js       # Генератор сторис
│   │   ├── trailers-store.js        # Хранилище трейлеров
│   │   └── upload-service.js        # Сервис загрузки файлов
│   │
│   ├── config/               # Конфигурация
│   │   ├── api.js                   # Настройки TMDB API
│   │   ├── bot.js                   # Настройки Telegram бота
│   │   ├── navigation.js            # Менеджер навигации
│   │   └── telegram.js              # Интеграция с Telegram WebApp
│   │
│   ├── utils/                # Утилиты
│   │   ├── scroll.js                # Утилиты прокрутки
│   │   └── swipe.js                 # Утилиты свайпов
│   │
│   ├── index.html            # Главный HTML файл
│   └── manifest.json         # PWA манифест
│
├── public/                   # Публичные ресурсы
│   └── assets/
│       └── stories/          # Изображения для сторис
│
├── dist/                     # Собранное приложение (генерируется)
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions workflow для деплоя
├── components.json           # Настройки shadcn
├── package.json              # Зависимости и скрипты
├── vite.config.mjs           # Конфигурация Vite
├── DEPLOYMENT.md             # Инструкции по деплою
└── README.md                 # Этот файл
```

## 🏗 Архитектура

### Навигационная система

Приложение использует кастомный `NavigationManager` (`src/config/navigation.js`) для управления навигацией:

#### Ключевые возможности:

- **Стек навигации** - История всех переходов для корректной работы кнопки "Назад"
- **Стек модальных окон** - Отдельное управление всплывающими диалогами
- **Временные экраны** - Специальные экраны (жанры, персоны), которые не попадают в основную историю
- **История браузера** - Интеграция с `pushState`/`popstate` для работы кнопки "Назад" браузера
- **Интеграция с Telegram** - Управление BackButton в интерфейсе Telegram

#### Пример использования:

```javascript
import { navigationManager } from './config/navigation.js';

// Переход на экран деталей фильма
navigationManager.navigateToDetails(movieId, 'movie', 'movies');

// Переход на таб
navigationManager.navigateToTab('search');

// Возврат назад
navigationManager.goBack();

// Переход на экран персоны
navigationManager.navigateToPerson(personId);

// Переход на экран жанра
navigationManager.navigateToGenre(genreId, genreName, 'movies', 'movie');
```

### React-компоненты

Приложение написано на React 19 (JSX без TypeScript). Инициализация (Telegram, аналитика, миграции, `userDataStore.init()`) выполняется в `src/app/bootstrap.js` до `createRoot`. Источником правды для навигации остаётся `navigationManager`: хук `useNavigation()` подписывается на него, собственного роутера нет. Данные пользователя читаются через хуки `useUserList()` и `useFollowing()`, которые обновляются по событиям `movie-list-changed` и `following-list-changed`.

#### Основные компоненты:

**Навигация:**
- `<TabBar />` - Нижняя панель навигации с табами
- `<Screen />` - Выбирает экран по `state.type` (`tab`, `details`, `person`, `genre`)

**Экраны (`src/app/screens`):**
- `DiscoverScreen` - Фильмы и сериалы
- `SearchScreen` - Поиск
- `ProfileScreen` - Профиль пользователя
- `GenreScreen` - Список контента по жанру
- `PersonScreen` - Информация о персоне
- `DetailsScreen` - Детальная карточка фильма или сериала

**Общие компоненты (`src/app/components`):**
- `MediaPoster` - Постер с рейтингом и прогрессом эпизодов
- `AppDrawer` - Единственный способ показать диалог, всплывающее окно или контекстное меню
- `StoryViewer` - Просмотрщик сторис

#### Пример компонента:

```jsx
import { cn } from '@/lib/utils';

export function MyComponent({ title, className }) {
    return (
        <div className={cn('rounded-[12px] bg-card p-4 text-foreground', className)}>
            {title}
        </div>
    );
}
```

Стили пишутся утилитами Tailwind с семантическими токенами (`bg-background`, `text-muted-foreground`, `bg-brand`, `border-outline` и т.д.). Значения токенов лежат в `src/app/styles/globals.css`.

## ⚙️ Конфигурация

### API конфигурация (src/config/api.js)

```javascript
export const API_CONFIG = {
    API_KEY: process.env.VITE_TMDB_API_KEY || 'your_api_key',
    BASE_URL: 'https://tmdb-proxy-xi.vercel.app/3',
    IMAGE_BASE_URL: 'https://tmdb-proxy-xi.vercel.app/t/p/w500',
    LANGUAGE: 'en-US'
};
```

**Параметры:**
- `API_KEY` - Ключ доступа к TMDB API
- `BASE_URL` - URL прокси-сервера для TMDB API
- `IMAGE_BASE_URL` - URL для загрузки изображений
- `LANGUAGE` - Язык контента (можно изменить на 'ru-RU' для русских описаний)

> ⚠️ **Рекомендация по безопасности**: Храните API ключ в переменных окружения, а не в коде

### Telegram конфигурация (src/config/bot.js)

```javascript
export const BOT_CONFIG = {
    STORY_API_URL: import.meta.env.VITE_STORY_API_URL,
    BOT_USERNAME: process.env.VITE_BOT_USERNAME || 'YOUR_BOT_USERNAME',
    SYNC_INTERVAL: 2000,
    RETRY_ATTEMPTS: 3
};
```

**Параметры:**
- `STORY_API_URL` - URL сервера сторис (проект `bot/` на Vercel). Токен бота хранится только там, во фронтенд его класть нельзя
- `BOT_USERNAME` - Имя пользователя бота
- `SYNC_INTERVAL` - Интервал синхронизации (мс)
- `RETRY_ATTEMPTS` - Количество попыток при ошибке

### Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# TMDB API
VITE_TMDB_API_KEY=your_tmdb_api_key_here

# Telegram Bot
VITE_STORY_API_URL=https://your-bot-project.vercel.app
VITE_BOT_USERNAME=your_bot_username_here
```

> **Примечание**: Файл `.env` уже добавлен в `.gitignore` и не будет коммититься в репозиторий

### Vite конфигурация (vite.config.mjs)

```javascript
export default defineConfig({
    root: 'src',
    plugins: [react(), tailwindcss(), mkcert()],
    resolve: {
        alias: { '@': resolve(__dirname, 'src/app') }
    },
    build: {
        outDir: '../dist',
        sourcemap: true
    },
    server: {
        port: 3000,
        host: '0.0.0.0'
    }
});
```

## 🔌 Сервисы

### TMDBService (src/services/tmdb.js)

Сервис для работы с The Movie Database API.

#### Методы для фильмов:

```javascript
// Получить популярные фильмы
TMDBService.getPopularMovies(page = 1)

// Получить трендовые фильмы
TMDBService.getTrendingMovies()

// Получить предстоящие фильмы
TMDBService.getUpcomingMovies()

// Получить детали фильма
TMDBService.getMovieDetails(movieId)

// Получить актерский состав
TMDBService.getMovieCredits(movieId)

// Получить рекомендации
TMDBService.getMovieRecommendations(movieId)

// Получить полную информацию (детали + актеры + рекомендации)
TMDBService.getFullMovieInfo(id, 'movie')

// Получить предстоящие фильмы с трейлерами
TMDBService.getUpcomingMoviesWithTrailers()

// Получить видео для фильма
TMDBService.getVideos(id, 'movie')
```

#### Методы для сериалов:

```javascript
// Получить детали сериала
TMDBService.getTVDetails(id)

// Получить актерский состав
TMDBService.getTVCredits(tvId)

// Получить рекомендации
TMDBService.getTVRecommendations(tvId)

// Получить сезоны с эпизодами
TMDBService.getTVSeasons(tvId)

// Получить трендовые сериалы
TMDBService.getTrendingTV()

// Получить популярные сериалы
TMDBService.getPopularTV()

// Получить сериалы, выходящие сегодня
TMDBService.getAiringTodayTV()

// Получить высокорейтинговые сериалы
TMDBService.getTopRatedTV()

// Получить сериалы с трейлерами
TMDBService.getUpcomingTVWithTrailers()
TMDBService.getTrendingTVWithTrailers()
```

#### Поиск и фильтрация:

```javascript
// Мультипоиск по всем типам контента
TMDBService.searchMulti(query)

// Поиск фильмов
TMDBService.searchMovies(query)

// Фильмы по жанру
TMDBService.getMoviesByGenre(genreId, page)

// Сериалы по жанру
TMDBService.getTVShowsByGenre(genreId, page)
```

#### Персоны:

```javascript
// Информация о персоне
TMDBService.getPersonDetails(personId)

// Фильмография
TMDBService.getPersonCredits(personId)

// Фотографии
TMDBService.getPersonImages(personId)
```

#### Жанры:

```javascript
// Получить ID жанра по имени
const genreId = TMDBService.getGenreId('Action'); // 28

// Получить эмодзи жанра
const emoji = TMDBService.getGenreEmoji('Action'); // 💥

// Доступные жанры
TMDBService.GENRE_MAP = {
    'Action': 28,
    'Adventure': 12,
    'Animation': 16,
    'Comedy': 35,
    'Crime': 80,
    'Documentary': 99,
    'Drama': 18,
    'Family': 10751,
    'Fantasy': 14,
    'History': 36,
    'Horror': 27,
    'Music': 10402,
    'Mystery': 9648,
    'Romance': 10749,
    'Science Fiction': 878,
    'Thriller': 53,
    'War': 10752,
    'Western': 37
};
```

### UserDataStore (src/services/user-data.js)

Сервис для управления пользовательскими данными через LocalStorage.

#### Структура данных:

```javascript
{
    version: "1.0",
    userId: "telegram_user_id",
    movies: {
        [movieId]: {
            watched: boolean,
            want: boolean,
            rating: number,
            review: string,
            watchedAt: timestamp
        }
    },
    tvShows: {
        episodes: {
            [showId]: {
                [episodeKey]: {
                    watched: boolean,
                    watchedAt: timestamp
                }
            }
        },
        reviews: {
            [showId]: {
                want: boolean,
                rating: number,
                review: string
            }
        },
        seasonReviews: {
            [seasonKey]: {
                rating: number,
                review: string
            }
        }
    },
    activity: [
        {
            id: number,
            title: string,
            type: 'movie' | 'tv',
            action: string,
            date: timestamp,
            poster_path: string
        }
    ],
    search: {
        recent: []
    }
}
```

#### Основные методы:

```javascript
// Активность
userDataStore.getActivities()
userDataStore.addActivity(activity)
userDataStore.clearActivities()
userDataStore.removeActivitiesByContent(contentId, contentType)

// Списки
userDataStore.removeFromWantList(contentId, contentType)
userDataStore.removeFromWatchedList(contentId, contentType)
```

## 📱 Интеграция с Telegram

### Инициализация (src/config/telegram.js)

```javascript
import { initTelegram } from './config/telegram.js';

// Инициализация при загрузке приложения
await initTelegram();
```

**Что происходит при инициализации:**
- Расширение окна на весь экран (`expand()`)
- Установка цветов заголовка и фона
- Включение подтверждения при закрытии
- Настройка обработчика BackButton
- Инициализация Haptic Feedback

### Haptic Feedback

```javascript
import { haptic } from './config/telegram.js';

// Легкая вибрация (при нажатии кнопок)
haptic.light();

// Средняя вибрация
haptic.medium();

// Сильная вибрация
haptic.heavy();

// Вибрация выбора (при переключении)
haptic.selection();

// Уведомления
haptic.success();  // Успешное действие
haptic.warning();  // Предупреждение
haptic.error();    // Ошибка
```

### BackButton

```javascript
import { showBackButton, hideBackButton } from './config/telegram.js';

// Показать кнопку "Назад"
showBackButton();

// Скрыть кнопку "Назад"
hideBackButton();

// Обработчик автоматически связан с navigationManager
```

### Telegram WebApp API

Доступ к полному API:

```javascript
import { TG } from './config/telegram.js';

// Закрыть приложение
TG.close();

// Получить данные пользователя
const user = TG.initDataUnsafe.user;
console.log(user.id, user.first_name, user.username);

// Главная кнопка
TG.MainButton.setText('Продолжить');
TG.MainButton.show();
TG.MainButton.onClick(() => {
    // Действие при клике
});
```

### Mock данные для разработки

При локальной разработке (вне Telegram) автоматически подключаются моковые данные:

```javascript
// В src/app/bootstrap.js
if (import.meta.env.DEV) {
    mockTelegramData();
}

// Создается фейковый объект Telegram WebApp
window.Telegram = {
    WebApp: {
        initDataUnsafe: {
            user: {
                id: 123456789,
                first_name: "Test",
                last_name: "User",
                username: "testuser"
            }
        },
        ready: () => {},
        expand: () => {},
        // ... другие методы
    }
};
```

## 🚀 Деплой

### GitHub Pages (рекомендуется)

Приложение настроено для автоматического деплоя на GitHub Pages через GitHub Actions.

#### Шаги для деплоя:

1. **Создайте репозиторий на GitHub** и запушьте код:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/ваш-username/имя-репозитория.git
git push -u origin main
```

2. **Настройте секреты GitHub**:
   - Перейдите в Settings → Secrets and variables → Actions
   - Добавьте следующие секреты:
     - `VITE_TMDB_API_KEY`
     - `VITE_BOT_USERNAME`
     - `VITE_BOT_USERNAME`

3. **Включите GitHub Pages**:
   - Settings → Pages
   - Source → выберите "GitHub Actions"

4. **Обновите base path в `vite.config.mjs`**:
```javascript
base: process.env.GITHUB_PAGES === 'true' ? '/имя-вашего-репозитория/' : '/',
```

5. **Запушьте изменения** - деплой запустится автоматически!

📖 **Подробные инструкции**: см. файл [DEPLOYMENT.md](./DEPLOYMENT.md)

После деплоя приложение будет доступно по адресу:
```
https://ваш-username.github.io/имя-репозитория/
```

### Другие платформы

Приложение можно задеплоить на любой платформе с поддержкой статических сайтов:
- **Netlify** 
- **Vercel**
- **Cloudflare Pages**
- **Firebase Hosting**

Для деплоя на других платформах:
1. Соберите проект: `npm run build:local`
2. Загрузите содержимое папки `dist`

### Настройка Telegram бота

После деплоя настройте Mini App в BotFather:

1. Отправьте `/mybots` в @BotFather
2. Выберите своего бота
3. Bot Settings → Menu Button → Configure Menu Button
4. Укажите URL вашего задеплоенного приложения

## 💻 Разработка

### Команды

```bash
# Установка зависимостей
npm install

# Запуск dev сервера (http://localhost:3000)
npm run dev

# Сборка для production
npm run build

# Просмотр production сборки локально
npm run preview

# Сборка для GitHub Pages (с base path)
npm run build

# Сборка для других платформ (без base path)
npm run build:local
```

### Рекомендации для разработки

#### 1. Локальная разработка

При разработке вне Telegram автоматически подключаются моковые данные. Приложение полностью функционально в браузере.

#### 2. Тестирование в Telegram

Для тестирования в реальном окружении Telegram:

1. Используйте ngrok для создания публичного URL:
```bash
ngrok http 3000
```

2. Укажите ngrok URL в настройках бота
3. Откройте Mini App через Telegram

#### 3. Отладка

- **Chrome DevTools** - для браузерной отладки
- **Telegram DevTools** - для отладки в мобильном приложении (включается в настройках Telegram)
- **Console logs** - активное логирование во всех ключевых местах

#### 4. Hot Module Replacement (HMR)

Vite поддерживает HMR из коробки - изменения отображаются мгновенно без перезагрузки страницы.

#### 5. Структура коммитов

Рекомендуемый формат:
```
feat: добавлена поддержка трейлеров
fix: исправлена навигация на странице персоны
docs: обновлена документация API
style: форматирование кода компонентов
refactor: оптимизация загрузки данных
```

### Добавление нового компонента

Компоненты лежат в `src/app/components` (общие) или `src/app/features/<экран>` (части одного экрана). shadcn-компоненты добавляются командой `npx shadcn@latest add <name>` и попадают в `src/app/components/ui`.

```jsx
// src/app/components/my-component.jsx
import { cn } from '@/lib/utils';

export function MyComponent({ title, onSelect, className }) {
    return (
        <button
            type="button"
            className={cn('rounded-[12px] bg-card p-4 text-foreground', className)}
            onClick={onSelect}
        >
            {title}
        </button>
    );
}
```

Диалоги и контекстные меню делаются через `AppDrawer`, он сам подключает кнопку «Назад» Telegram и блокировку скролла.

### Добавление нового экрана

1. Создайте файл экрана в `src/app/screens/`:

```jsx
// src/app/screens/my-screen.jsx
export function MyScreen({ state }) {
    return <div className="p-4">Контент</div>;
}
```

2. Подключите его в `src/app/Screen.jsx`: добавьте импорт и ветку в `ScreenContent` (для таба ещё и в `TabScreen`).

3. Для нового таба добавьте кнопку в `src/app/components/tab-bar.jsx`.

## ⚠️ Известные проблемы и решения

### 1. API ключ в коде

**Проблема**: API ключ TMDB хранится в открытом виде в `src/config/api.js`

**Решение**: 
1. Создайте файл `.env`:
```env
VITE_TMDB_API_KEY=your_key_here
```

2. Обновите `src/config/api.js`:
```javascript
export const API_CONFIG = {
    API_KEY: import.meta.env.VITE_TMDB_API_KEY || 'fallback_key',
    // ...
};
```

3. Добавьте переменную окружения в GitHub Secrets (Settings → Secrets and variables → Actions)

### 2. Язык контента

**Проблема**: API настроен на английский, но интерфейс на русском

**Решение**: Измените `LANGUAGE` в `src/config/api.js`:
```javascript
LANGUAGE: 'ru-RU'  // вместо 'en-US'
```

### 3. Кеширование

**Проблема**: Данные не обновляются при повторном посещении страницы

**Решение**: Кеш реализован только для страницы фильмов. Добавьте кеширование для других страниц или реализуйте централизованную систему с TTL:

```javascript
class CacheService {
    constructor() {
        this.cache = new Map();
        this.TTL = 5 * 60 * 1000; // 5 минут
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > this.TTL) {
            this.cache.delete(key);
            return null;
        }
        
        return item.data;
    }

    set(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
}
```

### 4. Офлайн работа

**Проблема**: Приложение не работает без интернета

**Решение**: Добавьте Service Worker для кеширования запросов и статических ресурсов:

```javascript
// src/service-worker.js
const CACHE_NAME = 'movie-app-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/assets/index.js',
    '/assets/index.css'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});
```

### 5. Производительность на слабых устройствах

**Проблема**: Подтормаживания на старых устройствах

**Решение**:
- Используйте виртуализацию для длинных списков
- Добавьте lazy loading для изображений
- Оптимизируйте размер изображений (используйте WebP)
- Реализуйте code splitting

## 📝 Лицензия

ISC

## 🆕 Версия 1.2 - Разделение хранилищ

**Важное обновление!** В версии 1.2 фильмы и сериалы хранятся в отдельных структурах данных.

### Что изменилось?

- ✅ **Фильмы** теперь имеют только 2 состояния: `want` и `watched`
- ✅ **Сериалы** имеют 3 состояния: `want`, `watching` и `watched`
- ✅ **Автоматическая миграция** данных при первом запуске
- ✅ **Новые методы API** для работы с сериалами

### Для разработчиков

```javascript
// Для фильмов
userMoviesService.getMovieState(movieId)
userMoviesService.addToWant(movie)
userMoviesService.addToWatched(movie)

// Для сериалов (новые методы)
userMoviesService.getTVShowState(showId)
userMoviesService.addTVShowToWant(show)
userMoviesService.addTVShowToWatching(show)
userMoviesService.addTVShowToWatched(show)
```

📖 **Подробнее**: 
- [Краткая справка API](./docs/API_CHANGES_v1.2.md)
- [Полная документация](./docs/STORAGE_SEPARATION.md)
- [Резюме миграции](./docs/MIGRATION_SUMMARY.md)
- [Changelog](./CHANGELOG.md)

---

## 📚 Документация

### Прямые ссылки и шаринг
- [⚡ Быстрая настройка Direct Link](./docs/DIRECT_LINK_SETUP.md) - Настройка за 5 минут
- [🎨 Шаринг с превью](./docs/INLINE_SHARE_SETUP.md) - Красивые карточки с постером и inline кнопкой
- [🤖 Код бота](./bot/README.md) - Готовый бот на Node.js с inline mode
- [⚡ Быстрый старт бота](./bot/QUICK_START.md) - Запуск бота за 5 минут
- [Полное руководство](./docs/SHARE_SETUP.md) - Детальная настройка прямых ссылок
- [Документация (RU)](./docs/SHARE_LINKS_RU.md) - Полное описание функционала на русском
- [Documentation (EN)](./docs/SHARE_LINKS.md) - Full documentation in English

### Другие документы
- [Быстрый старт](./QUICK_START.md) - Деплой за 5 минут
- [Миграция](./MIGRATION_CHECKLIST.md) - Переход с Vercel на GitHub Pages

## 👥 Автор

Ваше имя / Команда

## 🤝 Содействие

Pull requests приветствуются! Для значительных изменений сначала откройте issue для обсуждения.

## 📞 Поддержка

Если у вас возникли вопросы или проблемы:
- Откройте Issue на GitHub
- Свяжитесь с разработчиками

---

**Сделано с ❤️ для Telegram Mini Apps**

