import { TG, initTelegram } from './config/telegram.js';
import { navigationManager } from './config/navigation.js';
import './theme.css';
import '@material/web/button/filled-tonal-button.js';
import '@material/web/checkbox/checkbox.js';
import './pages/movies/movie-card.js';
import './components/card-info.js';
import './components/card-poster.js';
import './components/card-cast.js';
import './components/card-recomendation.js';
import './components/show-card-seasons.js';
import './components/story-viewer.js';
import './pages/search-page.js';
import './components/bottom-navigation.js';
import './pages/movies/movies-page.js';
import './pages/tvshows/shows-page.js';
import TMDBService from './services/tmdb.js';
import './pages/profile/profile-page.js';
// import './pages/activity-page.js'; // Не используется
import './services/data-repair-utility.js'; // Утилита для диагностики данных
import './pages/tvshows/show-card.js';
import './pages/genre/genre-page.js';
import './pages/person/person-page.js';
import './pages/profile/followers-following-page.js';
import { API_CONFIG } from './config/api.js';
import { cacheMigration } from './services/cache-migration.js';
import { StorageCleanup } from './utils/storage-cleanup.js'; // Утилита для очистки хранилища
import { analytics } from './services/analytics.js'; // Google Analytics
import { telegramAnalytics } from './services/telegram-analytics.js'; // Telegram Analytics SDK
import { TELEGRAM_ANALYTICS_CONFIG } from './config/bot.js';
import { userDataStore } from './services/user-data-store.js';
import { userFollowingService } from './services/user-following.js';
import { supabaseProfileService } from './services/supabase-profile-service.js';
import { viewContextService } from './services/view-context-service.js';
import { dataSyncService } from './services/data-sync-service.js';
import { supabaseMigration } from './services/supabase-migration.js';

// Импортируем изображения
import story2 from '../public/assets/stories/story2.jpg';
import story3 from '../public/assets/stories/story3.jpg';
import story4 from '../public/assets/stories/story4.jpg';
import story5 from '../public/assets/stories/story5.jpg';

// Обработчик выбора фильма/сериала
document.addEventListener('movie-selected', async (event) => {
    const { movieId, type, sourceTab, movie } = event.detail;
    try {
        // Отслеживаем просмотр медиа
        if (movie?.title || movie?.name) {
            analytics.trackMediaView(movieId, type, movie.title || movie.name);
        }
        
        // Используем специальную навигацию для персон
        if (type === 'person') {
            navigationManager.navigateToPerson(movieId);
        } else {
            navigationManager.navigateToDetails(movieId, type, sourceTab);
        }
    } catch (error) {
        console.error('Ошибка при показе деталей фильма:', error);
    }
});

async function showMovieDetails(id, type = 'movie') {
    const container = document.querySelector('#movies-container');
    
    // Очищаем контейнер от всех экранов
    container.innerHTML = '';
    
    try {
        const data = await TMDBService.getFullMovieInfo(id, type);
        const movieData = {
            ...data,
            media_type: type
        };
        
        if (movieData.backdrop_path) {
            document.documentElement.style.setProperty(
                '--movie-backdrop',
                `url(${API_CONFIG.IMAGE_BASE_URL.replace('/w500', '/original')}${movieData.backdrop_path})`
            );
        }
        
        const cardElement = document.createElement(type === 'movie' ? 'movie-card-details' : 'tv-show-card-details');
        cardElement.movie = movieData;
        container.appendChild(cardElement);
        
        window.scrollTo(0, 0);
    } catch (error) {
        console.error('Ошибка при показе деталей:', error);
    }
}

// Обработчик переключения табов
document.addEventListener('tab-changed', (event) => {
    const { tab } = event.detail;
    
    // Отслеживаем переключение таба
    analytics.trackTabChange(tab);
    
    navigationManager.navigateToTab(tab, false); // Убираем пропуск обновления таб-бара
    
    // Обновляем активный таб в TabBar
    const tabBar = document.querySelector('tab-bar');
    if (tabBar) {
        tabBar.setActiveTab(tab);
    }
});

// Добавляем обработчик для события выбора жанра
document.addEventListener('genre-selected', (event) => {
    const { genreId, genreName, from, type } = event.detail;
    try {
        // Отслеживаем просмотр жанра
        analytics.trackGenreView(genreId, genreName);
        
        navigationManager.navigateToGenre(genreId, genreName, from, type);
    } catch (error) {
        console.error('Ошибка при показе жанра:', error);
    }
});

// Обработчик для события выбора персоны
document.addEventListener('person-selected', (event) => {
    const { personId, personName } = event.detail;
    try {
        // Отслеживаем просмотр персоны
        if (personName) {
            analytics.trackPersonView(personId, personName);
        }
        
        navigationManager.navigateToPerson(personId);
    } catch (error) {
        console.error('Ошибка при показе информации о персоне:', error);
    }
});

function showMainScreen(screenName) {
    const container = document.querySelector('#movies-container');
    container.innerHTML = '';
    
    let screen;
    switch (screenName) {
        case 'profile':
            screen = document.createElement('profile-screen');
            break;
        case 'movies':
            screen = document.createElement('movies-screen');
            break;
        case 'tv':
            screen = document.createElement('tv-shows-screen');
            break;
        // case 'activity':
        //     screen = document.createElement('activity-screen');
        //     break; // Не используется
        case 'search':
            screen = document.createElement('search-screen');
            break;
        case 'genre':
            screen = document.createElement('genre-screen');
            break;
        case 'person':
            screen = document.createElement('person-screen');
            break;
        default:
            console.error('Unknown screen:', screenName);
            return null;
    }
     
    if (screen) {
        container.appendChild(screen);
        window.scrollTo(0, 0);
    }
    
    return screen;
}

// Обработик изменения навигации
window.addEventListener('navigation-changed', async (event) => {
    const { state } = event.detail;
    const container = document.querySelector('#movies-container');
    
    try {
        if (!state) {
            // Возврат на предыдущий экран
            const currentTab = navigationManager.currentTab;
            const currentState = navigationManager.getCurrentState();
            
            if (currentState && currentState.type === 'tab' && currentState.name === 'profile') {
                // Возвращаемся на профиль - используем текущее состояние из стека
                const screen = showMainScreen('profile');
                if (screen) {
                    // Удаляем viewing-user-id для своего профиля
                    screen.removeAttribute('viewing-user-id');
                    if (currentState.activeTab) {
                        screen.setAttribute('active-tab', currentState.activeTab);
                    }
                    if (currentState.tabsScrollPosition !== undefined) {
                        screen.setAttribute('tabs-scroll-position', currentState.tabsScrollPosition);
                    }
                }
            } else {
                const previousState = navigationManager.getPreviousState();
                if (previousState) {
                    if (previousState.type === 'details') {
                        // Если возвращаемся из деталей фильма
                        const sourceTab = previousState.sourceTab || currentTab;
                        showMainScreen(sourceTab);
                    } else {
                        showMainScreen(currentTab);
                    }
                } else {
                    showMainScreen(currentTab);
                }
            }
            return;
        }
        
        // Очищаем контейнер перед показом нового экрана
        container.innerHTML = '';
        
        if (state.type === 'details') {
            // Показываем детали фильма/сериала
            await showMovieDetails(state.mediaId, state.mediaType);
        } else if (state.type === 'tab') {
            // Показываем экран таба
            const screen = showMainScreen(state.name);
            // Если это профиль, передаем состояние
            if (state.name === 'profile' && screen) {
                // Удаляем viewing-user-id для своего профиля
                screen.removeAttribute('viewing-user-id');
                if (state.activeTab) {
                    screen.setAttribute('active-tab', state.activeTab);
                }
                if (state.tabsScrollPosition !== undefined) {
                    screen.setAttribute('tabs-scroll-position', state.tabsScrollPosition);
                }
            }
        } else if (state.type === 'person') {
            // Показываем экран персоны
            const personScreen = document.createElement('person-screen');
            if (state.activeTab) {
                personScreen.setAttribute('active-tab', state.activeTab);
            }
            container.appendChild(personScreen);
        } else if (state.type === 'genre') {
            // Показываем экран жанра
            const genreScreen = document.createElement('genre-screen');
            container.appendChild(genreScreen);
        } else if (state.type === 'user_profile') {
            // Показываем профиль пользователя
            const profileScreen = document.createElement('profile-screen');
            profileScreen.setAttribute('viewing-user-id', state.userId);
            if (state.activeTab) {
                profileScreen.setAttribute('active-tab', state.activeTab);
            }
            container.appendChild(profileScreen);
        } else if (state.type === 'followers_following') {
            // Показываем список подписок/подписчиков
            const followersFollowingPage = document.createElement('followers-following-page');
            followersFollowingPage.setAttribute('user-id', state.userId);
            if (state.activeTab) {
                followersFollowingPage.setAttribute('active-tab', state.activeTab);
            }
            container.appendChild(followersFollowingPage);
        }
    } catch (error) {
        console.error('Ошибка при обработке навигации:', error);
    }
});

// Добавляем моковые данные для локальной разработки
/**
 * Мигрирует старые данные подписок из localStorage в CloudStorage
 */
async function migrateFollowingData() {
    try {
        const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 'guest';
        const oldKey = `user_following_${userId}`;
        const oldData = localStorage.getItem(oldKey);
        
        if (!oldData) {
            return; // Нет старых данных для миграции
        }
        
        try {
            const parsedData = JSON.parse(oldData);
            if (Array.isArray(parsedData) && parsedData.length > 0) {
                // Получаем текущий список из нового хранилища
                const currentList = userFollowingService.getFollowingList();
                
                // Объединяем старые и новые данные (убираем дубликаты)
                const mergedList = [...new Set([...parsedData, ...currentList])];
                
                // Сохраняем в новое хранилище (через CloudStorage)
                if (mergedList.length > currentList.length) {
                    // Используем приватный метод для сохранения
                    userFollowingService._saveFollowingList(mergedList);
                    console.log(`✅ Мигрировано ${parsedData.length} подписок на персон`);
                    
                    // Удаляем старые данные после успешной миграции
                    localStorage.removeItem(oldKey);
                }
            }
        } catch (error) {
            console.error('Ошибка миграции данных подписок:', error);
        }
    } catch (error) {
        console.error('Ошибка миграции подписок:', error);
    }
}

/**
 * Ожидание загрузки Telegram Analytics SDK
 */
function waitForTelegramAnalyticsSDK() {
    return new Promise((resolve) => {
        // Если SDK уже загружен
        if (window.telegramAnalytics) {
            resolve();
            return;
        }

        // Ждем загрузки SDK (максимум 10 секунд)
        let attempts = 0;
        const maxAttempts = 100; // 10 секунд
        
        const checkSDK = setInterval(() => {
            attempts++;
            if (window.telegramAnalytics || attempts >= maxAttempts) {
                clearInterval(checkSDK);
                resolve();
            }
        }, 100);
    });
}

function mockTelegramData() {
    if (!window.Telegram) {
        window.Telegram = {
            WebApp: {
                initDataUnsafe: {
                    user: {
                        id: 123456789,
                        first_name: "Test",
                        last_name: "User",
                        username: "testuser",
                        language_code: "en"
                    }
                },
                ready: () => {},
                expand: () => {},
                close: () => {},
                MainButton: {
                    show: () => {},
                    hide: () => {},
                    setText: () => {}
                }
            }
        };
    }
}

// Инициализация приложения
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Начало инициализации приложения...');
    console.log('📍 URL:', window.location.href);
    console.log('🌐 Telegram SDK доступен:', !!window.Telegram?.WebApp);
    console.log('🔒 Протокол:', window.location.protocol);
    console.log('📱 Платформа:', navigator.platform);
    console.log('🌐 User Agent:', navigator.userAgent);
    
    // Очищаем индикатор загрузки сразу
    try {
        const container = document.querySelector('#movies-container');
        if (container && container.innerHTML.includes('Загрузка приложения')) {
            container.innerHTML = '';
        }
    } catch (e) {
        console.warn('Не удалось очистить индикатор загрузки:', e);
    }
    
    // Проверка HTTPS
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.error('❌ Приложение должно работать по HTTPS для Telegram Mini App');
        const container = document.querySelector('#movies-container');
        if (container) {
            container.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #fff;">
                    <h2>Ошибка безопасности</h2>
                    <p>Приложение должно работать по HTTPS</p>
                    <p style="font-size: 12px; opacity: 0.7;">Текущий протокол: ${window.location.protocol}</p>
                </div>
            `;
            return;
        }
    }
    
    try {
        // Запускаем миграцию кеша (если нужна)
        try {
            cacheMigration.migrate();
        } catch (error) {
            console.error('Ошибка миграции кеша:', error);
        }
        
        // В режиме разработки добавляем моковые данные
        if (import.meta.env.DEV) {
            try {
                mockTelegramData();
            } catch (error) {
                console.error('Ошибка создания моковых данных:', error);
            }
        }
        
        // Сначала инициализируем Telegram
        try {
            await initTelegram();
        } catch (error) {
            console.error('Ошибка инициализации Telegram:', error);
        }
        
        // Инициализируем хранилище данных пользователя (CloudStorage или localStorage)
        try {
            await userDataStore.init();
        } catch (error) {
            console.error('Ошибка инициализации хранилища:', error);
        }
        
        // Инициализируем сервис подписок на персон
        try {
            await userFollowingService.init();
        } catch (error) {
            console.error('Ошибка инициализации сервиса подписок:', error);
        }
        
        // Инициализируем Supabase сервисы
        try {
            const currentUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 
                                 sessionStorage.getItem('user_id');
            
            if (currentUserId && currentUserId !== 'guest') {
                // Инициализируем сервисы с текущим ID пользователя
                supabaseProfileService.init(currentUserId);
                viewContextService.init(currentUserId);
                
                // Выполняем однократную миграцию данных (если нужно)
                // Проверяем, была ли уже выполнена миграция
                const migrationKey = `supabase_migrated_${currentUserId}`;
                const alreadyMigrated = sessionStorage.getItem(migrationKey);
                
                if (!alreadyMigrated && supabaseProfileService.isEnabled()) {
                    // Выполняем миграцию в фоне (не блокируем запуск приложения)
                    supabaseMigration.migrateAllData().then(success => {
                        if (success) {
                            sessionStorage.setItem(migrationKey, 'true');
                            console.log('✅ Миграция данных в Supabase завершена');
                        }
                    }).catch(error => {
                        console.error('Ошибка миграции данных:', error);
                    });
                }
                
                // Выполняем начальную синхронизацию данных
                if (supabaseProfileService.isEnabled()) {
                    // Синхронизируем в фоне после небольшой задержки
                    setTimeout(() => {
                        dataSyncService.syncAllPublicData().catch(error => {
                            console.warn('Ошибка начальной синхронизации:', error);
                        });
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('Ошибка инициализации Supabase сервисов:', error);
        }
        
        // Мигрируем старые данные подписок из localStorage в CloudStorage
        try {
            await migrateFollowingData();
        } catch (error) {
            console.error('Ошибка миграции подписок:', error);
        }
        
        // Инициализируем Google Analytics
        try {
            await analytics.init();
            analytics.trackAppStart();
            analytics.trackSessionDuration();
        } catch (error) {
            console.error('Ошибка инициализации Google Analytics:', error);
        }
        
        // Инициализируем Telegram Analytics SDK
        // Ждем загрузки SDK (так как скрипт загружается асинхронно)
        try {
            await waitForTelegramAnalyticsSDK();
            if (TELEGRAM_ANALYTICS_CONFIG.TOKEN) {
                await telegramAnalytics.init(
                    TELEGRAM_ANALYTICS_CONFIG.TOKEN,
                    TELEGRAM_ANALYTICS_CONFIG.APP_NAME
                );
                telegramAnalytics.trackAppStart();
            } else {
                console.warn('⚠️ Telegram Analytics токен не настроен. Получите токен через @DataChief_bot и добавьте VITE_TELEGRAM_ANALYTICS_TOKEN в .env');
            }
        } catch (error) {
            console.error('Ошибка инициализации Telegram Analytics:', error);
        }
        
        // Мониторинг размера хранилища
        try {
            const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 'guest';
            const data = localStorage.getItem(`user_data_${userId}`);
            if (data) {
                const sizeKB = (data.length / 1024).toFixed(2);
                console.log(`📊 Размер данных: ${sizeKB} KB`);
                
                // Предупреждение при приближении к лимиту
                if (sizeKB > 2000) {
                    console.warn(`⚠️ Размер данных приближается к лимиту: ${sizeKB} KB`);
                }
            }
        } catch (error) {
            console.error('Ошибка мониторинга хранилища:', error);
        }
        
        // Проверяем, что получили данные пользователя
        if (!window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
            console.warn('Не удалось получить ID пользователя Telegram');
        }
        
        // Проверяем URL параметры для deep linking
        const urlParams = new URLSearchParams(window.location.search);
        let mediaId = urlParams.get('id');
        let mediaType = urlParams.get('type');
        const profileUserId = urlParams.get('profile');
        
        // Проверяем startapp параметр для Direct Link (t.me/bot/app?startapp=movie_123)
        // Также проверяем start_param из initDataUnsafe
        const tg = window.Telegram?.WebApp;
        const startApp = urlParams.get('startapp') || tg?.initDataUnsafe?.start_param;
        if (startApp && !mediaId) {
            // Формат: movie_123 или tv_456
            const parts = startApp.split('_');
            if (parts.length === 2) {
                mediaType = parts[0]; // 'movie' или 'tv'
                mediaId = parts[1];   // ID
                console.log('Telegram Direct Link detected:', { mediaId, mediaType, startApp });
            }
        }
        
        // Fallback: проверяем start параметр (для старого формата t.me/bot?start=movie_123)
        if (!mediaId) {
            const startParam = urlParams.get('start');
            if (startParam) {
                const parts = startParam.split('_');
                if (parts.length === 2) {
                    mediaType = parts[0];
                    mediaId = parts[1];
                    console.log('Telegram start param detected:', { mediaId, mediaType, startParam });
                }
            }
        }
        
        // Если есть параметр профиля, открываем профиль пользователя
        if (profileUserId) {
            console.log('Profile deep link detected:', { profileUserId });
            localStorage.setItem('app_launched', 'true'); // Пропускаем сторис
            navigationManager.navigateToUserProfile(profileUserId);
            return;
        }
        
        // Если есть параметры медиа, открываем детали напрямую
        if (mediaId && mediaType) {
            console.log('Deep link detected:', { mediaId, mediaType });
            localStorage.setItem('app_launched', 'true'); // Пропускаем сторис
            navigationManager.navigateToDetails(mediaId, mediaType);
            return;
        }
        
        // Проверяем, первый ли это запуск
        const isFirstLaunch = !localStorage.getItem('app_launched');
        
        if (isFirstLaunch) {
            // Показываем приветственные сторис только при первом запуске
            const storyViewer = document.createElement('story-viewer');
            storyViewer.stories = [
                story2,
                story3,
                story4,
                story5
            ];
            storyViewer.slideDuration = 5000;
            storyViewer.actionButton = {
                callback: () => {
                    storyViewer.remove();
                    // Отмечаем, что приложение уже запускалось
                    localStorage.setItem('app_launched', 'true');
                    // Инициализируем основной экран после закрытия сторис
                    navigationManager.navigateToTab('movies');
                }
            };
            document.body.appendChild(storyViewer);
        } else {
            // Если не первый запуск, сразу показываем основной экран
            navigationManager.navigateToTab('movies');
        }
        
        console.log('✅ Инициализация приложения завершена успешно');
        
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации приложения:', error);
        console.error('Stack trace:', error.stack);
        // Если произошла ошибка, все равно показываем основной экран
        try {
            navigationManager.navigateToTab('movies');
        } catch (navError) {
            console.error('❌ Ошибка при показе основного экрана:', navError);
            // Последняя попытка - показываем сообщение об ошибке
            const container = document.querySelector('#movies-container');
            if (container) {
                container.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: var(--md-sys-color-on-surface);">
                        <h2>Ошибка загрузки приложения</h2>
                        <p>Пожалуйста, перезагрузите страницу</p>
                        <p style="font-size: 12px; opacity: 0.7;">${error.message}</p>
                    </div>
                `;
            }
        }
    }
});