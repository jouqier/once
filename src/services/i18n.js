/**
 * Сервис локализации (i18n)
 * Автоматически определяет язык из Telegram (ru для русского, en для остальных)
 */
export class I18nService {
    constructor() {
        this._locale = this._detectLocale();
        this._translations = {
            ru: {
                // Navigation
                profile: 'Профиль',
                movies: 'Фильмы',
                tvShows: 'Сериалы',
                search: 'Поиск',
                activity: 'Активность',
                
                // Profile
                want: 'Буду смотреть',
                watched: 'Посмотрел',
                wantListEmpty: 'Список "Буду смотреть" пуст',
                watchedListEmpty: 'Список "Посмотрел" пуст',
                tvShowsListEmpty: 'Список сериалов пуст',
                startAddingMovies: 'Начните добавлять фильмы',
                startAddingToWant: 'Начните добавлять фильмы в желаемое',
                startAddingToWatched: 'Начните добавлять фильмы в просмотренное',
                startAddingTVShows: 'Начните добавлять сериалы в список',
                browseMovies: 'Смотреть фильмы',
                browseTVShows: 'Смотреть сериалы',
                
                // Movies/TV Shows
                moviesLabel: 'ФИЛЬМЫ',
                tvShowsLabel: 'СЕРИАЛЫ',
                trendingNow: 'В тренде',
                forYou: 'Для вас',
                upcoming: 'Скоро выйдет',
                mostPopular: 'Популярное',
                topRated: 'Топ рейтинга',
                errorLoadingContent: 'Ошибка загрузки контента',
                errorLoadingTVShows: 'Ошибка загрузки сериалов',
                errorInMoviesScreen: 'Ошибка в экране фильмов',
                loading: 'Загрузка...',
                
                // Reviews
                reviews: 'Отзывы',
                writeReview: 'Напишите свой отзыв...',
                shareReview: 'Поделиться отзывом',
                submit: 'Отправить',
                generatingStory: 'Генерация истории...',
                sharingStory: 'Публикация истории...',
                failedToShareStory: 'Не удалось опубликовать историю',
                somethingWentWrong: 'Что-то пошло не так',
                season: 'Сезон',
                user: 'Пользователь',
                
                // Actions
                moveToWatched: 'Переместить в "Посмотрел"',
                removeFromWant: 'Удалить из "Буду смотреть"',
                moveToWant: 'Переместить в "Буду смотреть"',
                removeFromWatched: 'Удалить из "Посмотрел"',
                removeFromWatching: 'Удалить из просмотра',
                editReview: 'Редактировать отзыв',
                imWatchingThis: 'Сейчас смотрю',
                watching: 'Смотрю…',
                markAllAsWatched: 'Отметить всё как просмотренное',
                markAllAsUnwatched: 'Отметить всё как непросмотренное',
                markAsWatched: 'Отметить как просмотренное',
                markAsUnwatched: 'Отметить как непросмотренное',
                
                // Search
                moviesOrTVShows: 'Фильмы или сериалы...',
                justStartTyping: 'Просто начните печатать...',
                searchAmongMillions: 'Поиск среди миллионов фильмов и сериалов',
                nothingFound: 'Ничего не найдено',
                maybeNotFilmedYet: 'Возможно, еще не снято',
                recent: 'Недавние',
                
                // Story Viewer
                letsGetStarted: 'Начнем',
                next: 'Далее',
                story: 'История',
                
                // Common
                error: 'Ошибка',
                success: 'Успешно',
                cancel: 'Отмена',
                confirm: 'Подтвердить',
                close: 'Закрыть',
                
                // Card labels
                castAndCrew: 'Актёры и съёмочная группа',
                ifYouLike: 'Если вам понравился',
                genres: 'Жанры',
                more: '…ЕЩЕ',
                less: 'Свернуть',
                releaseDate: 'Дата выпуска',
                duration: 'Продолжительность',
                statusEnded: 'Завершён',
                statusInProgress: 'В производстве',
                present: 'Настоящее время',
                markAllAsWatched: 'Смотрел все',
                markAllAsUnwatched: 'Не смотрел',
                rateSeason: 'Оценить сезон'
            },
            en: {
                // Navigation
                profile: 'Profile',
                movies: 'Movies',
                tvShows: 'TV Shows',
                search: 'Search',
                activity: 'Activity',
                
                // Profile
                want: 'Want',
                watched: 'Watched',
                wantListEmpty: 'Want list is empty',
                watchedListEmpty: 'Watched list is empty',
                tvShowsListEmpty: 'TV Shows list is empty',
                startAddingMovies: 'Start adding movies',
                startAddingToWant: 'Start adding movies to your Want list',
                startAddingToWatched: 'Start adding movies to your Watched list',
                startAddingTVShows: 'Start adding TV shows to your list',
                browseMovies: 'Browse Movies',
                browseTVShows: 'Browse TV Shows',
                
                // Movies/TV Shows
                moviesLabel: 'MOVIES',
                tvShowsLabel: 'TV SHOWS',
                trendingNow: 'Trending Now',
                forYou: 'For You',
                upcoming: 'Upcoming',
                mostPopular: 'Most Popular',
                topRated: 'Top Rated',
                errorLoadingContent: 'Error loading content',
                errorLoadingTVShows: 'Error loading TV shows',
                errorInMoviesScreen: 'Error in MoviesScreen',
                loading: 'Loading...',
                
                // Reviews
                reviews: 'Reviews',
                writeReview: 'Write your review...',
                shareReview: 'Share a review',
                submit: 'Submit',
                generatingStory: 'Generating story...',
                sharingStory: 'Sharing story...',
                failedToShareStory: 'Failed to share story',
                somethingWentWrong: 'Something went wrong',
                season: 'Season',
                user: 'User',
                
                // Actions
                moveToWatched: 'Move to Watched',
                removeFromWant: 'Remove from Want',
                moveToWant: 'Move to Want',
                removeFromWatched: 'Remove from Watched',
                removeFromWatching: 'Remove from Watching',
                editReview: 'Edit Review',
                imWatchingThis: 'I\'m watching this',
                watching: 'Watching…',
                markAllAsWatched: 'Mark all as watched',
                markAllAsUnwatched: 'Mark all as unwatched',
                markAsWatched: 'Mark as watched',
                markAsUnwatched: 'Mark as unwatched',
                
                // Search
                moviesOrTVShows: 'Movies or TV Shows...',
                justStartTyping: 'Just start typing…',
                searchAmongMillions: 'Search among millions of Movies and TV Shows',
                nothingFound: 'Nothing was found',
                maybeNotFilmedYet: 'Maybe hasn\'t been filmed yet',
                recent: 'Recent',
                
                // Story Viewer
                letsGetStarted: 'Let\'s Get Started',
                next: 'Next',
                story: 'Story',
                
                // Common
                error: 'Error',
                success: 'Success',
                cancel: 'Cancel',
                confirm: 'Confirm',
                close: 'Close',
                
                // Card labels
                castAndCrew: 'Cast and Crew',
                ifYouLike: 'If you like',
                genres: 'Genres',
                more: '…More',
                less: 'Less',
                releaseDate: 'Release Date',
                duration: 'Duration',
                statusEnded: 'Ended',
                statusInProgress: 'In progress',
                present: 'Present',
                markAllAsWatched: 'Mark all as Watched',
                markAllAsUnwatched: 'Mark all as Unwatched',
                rateSeason: 'Rate season'
            }
        };
    }
    
    /**
     * Получить код языка для API (ru-RU или en-US)
     */
    getApiLanguage() {
        return this._locale === 'ru' ? 'ru-RU' : 'en-US';
    }
    
    /**
     * Определяет локаль из Telegram или браузера
     * ru для русского, en для всех остальных
     */
    _detectLocale() {
        // Проверяем язык из Telegram
        const telegramLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
        
        if (telegramLang) {
            // Если язык начинается с 'ru', возвращаем 'ru', иначе 'en'
            return telegramLang.startsWith('ru') ? 'ru' : 'en';
        }
        
        // Fallback на язык браузера
        const browserLang = navigator.language || navigator.userLanguage;
        return browserLang.startsWith('ru') ? 'ru' : 'en';
    }
    
    /**
     * Получить текущую локаль
     */
    getLocale() {
        return this._locale;
    }
    
    /**
     * Установить локаль вручную
     */
    setLocale(locale) {
        if (this._translations[locale]) {
            this._locale = locale;
        }
    }
    
    /**
     * Получить перевод по ключу
     * @param {string} key - Ключ перевода
     * @param {Object} params - Параметры для подстановки в перевод
     * @returns {string} Переведенная строка
     */
    t(key, params = {}) {
        const translation = this._translations[this._locale]?.[key] || 
                           this._translations.en[key] || 
                           key;
        
        // Поддержка параметров (например, {name}, {count})
        return translation.replace(/\{(\w+)\}/g, (match, paramKey) => {
            return params[paramKey] !== undefined ? params[paramKey] : match;
        });
    }
}

// Экспортируем singleton
export const i18n = new I18nService();

