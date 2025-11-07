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
import './pages/activity-page.js';
import './services/data-repair-utility.js'; // Утилита для диагностики данных
import './pages/tvshows/show-card.js';
import './pages/genre/genre-page.js';
import './pages/person/person-page.js';
import { API_CONFIG } from './config/api.js';

// Импортируем изображения
import story2 from '../public/assets/stories/story2.jpg';
import story3 from '../public/assets/stories/story3.jpg';
import story4 from '../public/assets/stories/story4.jpg';
import story5 from '../public/assets/stories/story5.jpg';

// Обработчик выбора фильма/сериала
document.addEventListener('movie-selected', async (event) => {
    const { movieId, type, sourceTab } = event.detail;
    try {
        navigationManager.navigateToDetails(movieId, type, sourceTab);
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
        navigationManager.navigateToGenre(genreId, genreName, from, type);
    } catch (error) {
        console.error('Ошибка при показе жанра:', error);
    }
});

// Обработчик для события выбора персоны
document.addEventListener('person-selected', (event) => {
    const { personId } = event.detail;
    try {
        navigationManager.navigateToPerson(personId);
    } catch (error) {
        console.error('Ошибка при показе информации о персоне:', error);
    }
});

function showMainScreen(screenName) {
    console.log('Showing screen:', screenName);
    
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
        case 'activity':
            screen = document.createElement('activity-screen');
            break;    
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
        window.scrollTo(0, 0);
    }
}

// Обработик изменения навигации
window.addEventListener('navigation-changed', async (event) => {
    const { state } = event.detail;
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
                    showMainScreen(sourceTab);
                } else {
                    showMainScreen(currentTab);
                }
            } else {
                showMainScreen(currentTab);
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
            showMainScreen(state.name);
        } else if (state.type === 'person') {
            // Показываем экран персоны
            const personScreen = document.createElement('person-screen');
            container.appendChild(personScreen);
        } else if (state.type === 'genre') {
            // Показываем экран жанра
            const genreScreen = document.createElement('genre-screen');
            container.appendChild(genreScreen);
        }
    } catch (error) {
        console.error('Ошибка при обработке навигации:', error);
    }
});

// Добавляем моковые данные для локальной разработки
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
        // В режиме разработки добавляем моковые данные
        if (import.meta.env.DEV) {
            mockTelegramData();
        }
        
        // Сначала инициализируем Telegram
        await initTelegram();
        
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
                    showMainScreen('movies');
                }
            };
            document.body.appendChild(storyViewer);
        } else {
            // Если не первый запуск, сразу показываем основной экран
            navigationManager.navigateToTab('movies');
            showMainScreen('movies');
        }
        
    } catch (error) {
        console.error('Ошибка инициализации приложения:', error);
        // Если произошла ошибка, все равно показываем основной экран
        navigationManager.navigateToTab('movies');
        showMainScreen('movies');
    }
});