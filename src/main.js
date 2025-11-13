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
import { API_CONFIG } from './config/api.js';
import { cacheMigration } from './services/cache-migration.js';
import { StorageCleanup } from './utils/storage-cleanup.js'; // Утилита для очистки хранилища
import { analytics } from './services/analytics.js'; // Google Analytics
import { userDataStore } from './services/user-data-store.js';
import { userFollowingService } from './services/user-following.js';

// Импортируем изображения
import story2 from '../public/assets/stories/story2.jpg';
import story3 from '../public/assets/stories/story3.jpg';
import story4 from '../public/assets/stories/story4.jpg';
import story5 from '../public/assets/stories/story5.jpg';

// Обработчик выбора фильма/сериала
document.addEventListener('movie-selected', async (event) => {
    const { movieId, type, sourceTab, movie } = event.detail;
    try {
        // Сохраняем позицию скролла ПЕРЕД навигацией
        navigationManager.saveScrollPositionBeforeNavigation();
        
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

async function showMovieDetails(id, type = 'movie', savedScrollPosition) {
    const container = document.querySelector('#movies-container');
    
    // Если возвращаемся назад, восстанавливаем позицию скролла СРАЗУ после очистки
    // Это предотвращает видимость контента с нулевой позиции
    if (savedScrollPosition !== undefined && savedScrollPosition !== null && savedScrollPosition > 0) {
        container.innerHTML = '';
        // Восстанавливаем позицию сразу, чтобы избежать видимости с нулевой позиции
        restoreScrollPositionImmediate(savedScrollPosition);
    } else {
        // Очищаем контейнер от всех экранов
        container.innerHTML = '';
    }
    
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
        
        // Если возвращаемся назад, уточняем позицию после загрузки контента
        if (savedScrollPosition !== undefined && savedScrollPosition !== null && savedScrollPosition > 0) {
            // Уточняем позицию после рендеринга (на случай если высота контента изменилась)
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    restoreScrollPosition(savedScrollPosition);
                });
            });
        } else {
            // При новом переходе сбрасываем скролл в начало
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            window.scrollTo(0, 0);
        }
    } catch (error) {
        console.error('Ошибка при показе деталей:', error);
    }
}

// Обработчик переключения табов
document.addEventListener('tab-changed', (event) => {
    const { tab } = event.detail;
    
    // Сохраняем позицию скролла ПЕРЕД навигацией
    navigationManager.saveScrollPositionBeforeNavigation();
    
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
        // Сохраняем позицию скролла ПЕРЕД навигацией
        navigationManager.saveScrollPositionBeforeNavigation();
        
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
        // Сохраняем позицию скролла ПЕРЕД навигацией
        navigationManager.saveScrollPositionBeforeNavigation();
        
        // Отслеживаем просмотр персоны
        if (personName) {
            analytics.trackPersonView(personId, personName);
        }
        
        navigationManager.navigateToPerson(personId);
    } catch (error) {
        console.error('Ошибка при показе информации о персоне:', error);
    }
});

// Функция для немедленного восстановления позиции скролла (без задержек)
function restoreScrollPositionImmediate(scrollPosition) {
    if (scrollPosition !== undefined && scrollPosition !== null && scrollPosition > 0) {
        // Убеждаемся, что body не заблокирован (на случай если остался scrollLock)
        if (document.body.style.position === 'fixed') {
            document.body.style.position = '';
            document.body.style.overflow = '';
            document.body.style.width = '';
            document.body.style.top = '';
        }
        
        // Принудительно завершаем любую активную прокрутку на iOS
        if (document.body.style.overflow === 'hidden') {
            document.body.style.overflow = '';
        }
        
        // Восстанавливаем скролл немедленно, без задержек и без анимации
        // Используем только прямое присваивание, чтобы не блокировать события на iOS
        document.body.scrollTop = scrollPosition;
        document.documentElement.scrollTop = scrollPosition;
        
        // На iOS после программного изменения скролла может оставаться активное состояние прокрутки
        // Принудительно снимаем блокировку touch-событий
        document.body.style.touchAction = '';
        document.documentElement.style.touchAction = '';
    }
}

// Функция для восстановления позиции скролла
function restoreScrollPosition(scrollPosition) {
    if (scrollPosition !== undefined && scrollPosition !== null && scrollPosition > 0) {
        console.log('[Navigation] Восстанавливаем позицию скролла:', scrollPosition);
        // Используем requestAnimationFrame для восстановления после рендеринга
        // Используем минимальную задержку чтобы не блокировать события на iOS
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // Убеждаемся, что body не заблокирован (на случай если остался scrollLock)
                if (document.body.style.position === 'fixed') {
                    document.body.style.position = '';
                    document.body.style.overflow = '';
                    document.body.style.width = '';
                    document.body.style.top = '';
                }
                
                // Принудительно завершаем любую активную прокрутку на iOS
                // Это помогает избежать блокировки событий касания
                if (document.body.style.overflow === 'hidden') {
                    document.body.style.overflow = '';
                }
                
                // Восстанавливаем скролл БЕЗ анимации (instant) чтобы не блокировать события на iOS
                // Используем только прямое присваивание для избежания блокировки событий
                document.body.scrollTop = scrollPosition;
                document.documentElement.scrollTop = scrollPosition;
                
                // На iOS после программного изменения скролла может оставаться активное состояние прокрутки
                // Принудительно снимаем блокировку touch-событий
                document.body.style.touchAction = '';
                document.documentElement.style.touchAction = '';
                
                console.log('[Navigation] Позиция скролла восстановлена:', scrollPosition, 
                    'текущая body.scrollTop:', document.body.scrollTop,
                    'documentElement.scrollTop:', document.documentElement.scrollTop,
                    'window.scrollY:', window.scrollY);
            });
        });
    }
}

async function showMainScreen(screenName, savedScrollPosition) {
    const container = document.querySelector('#movies-container');
    
    // Если возвращаемся назад, восстанавливаем позицию скролла СРАЗУ после очистки
    // Это предотвращает видимость контента с нулевой позиции
    if (savedScrollPosition !== undefined && savedScrollPosition !== null && savedScrollPosition > 0) {
        container.innerHTML = '';
        // Восстанавливаем позицию сразу, чтобы избежать видимости с нулевой позиции
        restoreScrollPositionImmediate(savedScrollPosition);
    } else {
        container.innerHTML = '';
    }
    
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
            return;
    }
     
    if (screen) {
        container.appendChild(screen);
        
        // Если возвращаемся назад, уточняем позицию после загрузки контента
        if (savedScrollPosition !== undefined && savedScrollPosition !== null && savedScrollPosition > 0) {
            // Ждем загрузки контента и уточняем позицию скролла
            // Используем минимальную задержку чтобы не блокировать события на iOS
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        resolve();
                    });
                });
            });
            // Уточняем позицию после рендеринга (на случай если высота контента изменилась)
            restoreScrollPosition(savedScrollPosition);
        } else {
            // При новом переходе сбрасываем скролл в начало
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            window.scrollTo(0, 0);
        }
    }
}

// Обработик изменения навигации
window.addEventListener('navigation-changed', async (event) => {
    const { state, scrollPosition } = event.detail;
    const container = document.querySelector('#movies-container');
    
    try {
        if (!state) {
            // Возврат на предыдущий экран
            const currentTab = navigationManager.currentTab;
            const previousState = navigationManager.getPreviousState();
            
            if (previousState) {
                if (previousState.type === 'details') {
                    // Если возвращаемся из деталей фильма
                    const sourceTab = previousState.sourceTab || currentTab;
                    await showMainScreen(sourceTab, previousState.scrollPosition);
                } else {
                    await showMainScreen(currentTab, previousState.scrollPosition);
                }
            } else {
                await showMainScreen(currentTab);
            }
            return;
        }
        
        // Определяем, возвращаемся ли мы назад (есть сохраненная позиция скролла)
        // ВАЖНО: проверяем только наличие scrollPosition в состоянии, не его значение
        // При переходе вперед scrollPosition будет undefined, при возврате назад - будет значение
        const isGoingBack = scrollPosition !== undefined && scrollPosition !== null;
        
        console.log('[Navigation] navigation-changed:', { 
            stateType: state.type, 
            isGoingBack, 
            scrollPosition,
            bodyScrollTop: document.body.scrollTop,
            documentElementScrollTop: document.documentElement.scrollTop,
            windowScrollY: window.scrollY
        });
        
        if (state.type === 'details') {
            // Показываем детали фильма/сериала
            await showMovieDetails(state.mediaId, state.mediaType, isGoingBack ? scrollPosition : undefined);
        } else if (state.type === 'tab') {
            // Показываем экран таба
            await showMainScreen(state.name, isGoingBack ? scrollPosition : undefined);
        } else if (state.type === 'person') {
            // Очищаем контейнер перед показом нового экрана
            container.innerHTML = '';
            // Если возвращаемся назад, восстанавливаем позицию СРАЗУ после очистки
            if (isGoingBack) {
                restoreScrollPositionImmediate(scrollPosition);
            }
            // Показываем экран персоны
            const personScreen = document.createElement('person-screen');
            container.appendChild(personScreen);
            // Уточняем позицию после загрузки контента
            if (isGoingBack) {
                // Используем минимальную задержку чтобы не блокировать события на iOS
                await new Promise(resolve => {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            resolve();
                        });
                    });
                });
                restoreScrollPosition(scrollPosition);
            }
        } else if (state.type === 'genre') {
            // Очищаем контейнер перед показом нового экрана
            container.innerHTML = '';
            // Если возвращаемся назад, восстанавливаем позицию СРАЗУ после очистки
            if (isGoingBack) {
                restoreScrollPositionImmediate(scrollPosition);
            }
            // Показываем экран жанра
            const genreScreen = document.createElement('genre-screen');
            container.appendChild(genreScreen);
            // Уточняем позицию после загрузки контента
            if (isGoingBack) {
                // Используем минимальную задержку чтобы не блокировать события на iOS
                await new Promise(resolve => {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            resolve();
                        });
                    });
                });
                restoreScrollPosition(scrollPosition);
            }
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
    try {
        // Запускаем миграцию кеша (если нужна)
        cacheMigration.migrate();
        
        // В режиме разработки добавляем моковые данные
        if (import.meta.env.DEV) {
            mockTelegramData();
        }
        
        // Сначала инициализируем Telegram
        await initTelegram();
        
        // Инициализируем хранилище данных пользователя (CloudStorage или localStorage)
        await userDataStore.init();
        
        // Инициализируем сервис подписок на персон
        await userFollowingService.init();
        
        // Мигрируем старые данные подписок из localStorage в CloudStorage
        await migrateFollowingData();
        
        // Инициализируем Google Analytics
        await analytics.init();
        analytics.trackAppStart();
        analytics.trackSessionDuration();
        
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
        
        // Проверяем startapp параметр для Direct Link (t.me/bot/app?startapp=movie_123)
        // Также проверяем start_param из initDataUnsafe
        const startApp = urlParams.get('startapp') || TG?.initDataUnsafe?.start_param;
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
        
    } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
        // Если произошла ошибка, все равно показываем основной экран
        navigationManager.navigateToTab('movies');
    }
});