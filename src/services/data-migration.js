/**
 * Сервис миграции данных пользователя
 * Обеспечивает совместимость при изменении структуры данных
 */

class DataMigrationService {
    constructor() {
        this.CURRENT_VERSION = '1.1';
        this.migrations = {
            '1.0': this._migrateFrom1_0.bind(this),
            '1.1': null // текущая версия, миграция не нужна
        };
    }

    /**
     * Проверяет и мигрирует данные если нужно
     */
    migrate(data) {
        if (!data) {
            return this._createFreshStore();
        }

        const dataVersion = data.version || '1.0';
        
        // Если версия совпадает, просто валидируем
        if (dataVersion === this.CURRENT_VERSION) {
            return this._validateAndFix(data);
        }

        // Если версия старая, мигрируем
        console.log(`Миграция данных с версии ${dataVersion} на ${this.CURRENT_VERSION}`);
        
        let migratedData = { ...data };
        
        // Применяем все необходимые миграции по порядку
        if (dataVersion === '1.0') {
            migratedData = this._migrateFrom1_0(migratedData);
        }

        // Валидируем после миграции
        migratedData = this._validateAndFix(migratedData);
        migratedData.version = this.CURRENT_VERSION;

        console.log('Миграция завершена успешно');
        return migratedData;
    }

    /**
     * Миграция с версии 1.0 на 1.1
     * Исправляет проблемы со старой структурой данных
     */
    _migrateFrom1_0(data) {
        console.log('Применяется миграция 1.0 → 1.1');
        
        const migrated = { ...data };

        // 1. Исправляем структуру movies
        if (migrated.movies) {
            // Старая структура: movies = { movieId: { want: true, watched: true, ... } }
            // Новая структура: movies = { want: [], watched: [], watching: [], reviews: {} }
            
            if (!Array.isArray(migrated.movies.want)) {
                const oldMovies = { ...migrated.movies };
                migrated.movies = {
                    want: [],
                    watched: [],
                    watching: [],
                    reviews: {}
                };

                // Конвертируем старые данные
                Object.entries(oldMovies).forEach(([movieId, movieData]) => {
                    if (typeof movieData === 'object' && movieData !== null) {
                        // Это старый формат данных фильма
                        const movie = {
                            id: parseInt(movieId),
                            title: movieData.title || 'Unknown',
                            poster_path: movieData.poster_path || null,
                            release_date: movieData.release_date || null
                        };

                        if (movieData.want) {
                            migrated.movies.want.push(movie);
                        }
                        if (movieData.watched) {
                            migrated.movies.watched.push(movie);
                        }
                        if (movieData.watching) {
                            migrated.movies.watching.push(movie);
                        }
                        if (movieData.rating || movieData.review) {
                            migrated.movies.reviews[movieId] = {
                                rating: movieData.rating || null,
                                review: movieData.review || null,
                                date: movieData.reviewDate || new Date().toISOString()
                            };
                        }
                    }
                });

                console.log(`Мигрировано фильмов: want=${migrated.movies.want.length}, watched=${migrated.movies.watched.length}, watching=${migrated.movies.watching.length}`);
            }
        }

        // 2. Исправляем структуру tvShows
        if (!migrated.tvShows) {
            migrated.tvShows = {
                episodes: {},
                seasonReviews: {},
                reviews: {}
            };
        } else {
            if (!migrated.tvShows.episodes) migrated.tvShows.episodes = {};
            if (!migrated.tvShows.seasonReviews) migrated.tvShows.seasonReviews = {};
            if (!migrated.tvShows.reviews) migrated.tvShows.reviews = {};
        }

        // 3. Исправляем структуру activity
        if (!Array.isArray(migrated.activity)) {
            migrated.activity = [];
        }

        // 4. Исправляем структуру search
        if (!migrated.search || !Array.isArray(migrated.search.recent)) {
            migrated.search = { recent: [] };
        }

        return migrated;
    }

    /**
     * Валидирует и исправляет структуру данных
     */
    _validateAndFix(data) {
        const fixed = { ...data };

        // Проверяем movies
        if (!fixed.movies || typeof fixed.movies !== 'object') {
            fixed.movies = { want: [], watched: [], watching: [], reviews: {} };
        } else {
            if (!Array.isArray(fixed.movies.want)) fixed.movies.want = [];
            if (!Array.isArray(fixed.movies.watched)) fixed.movies.watched = [];
            if (!Array.isArray(fixed.movies.watching)) fixed.movies.watching = [];
            if (!fixed.movies.reviews || typeof fixed.movies.reviews !== 'object') {
                fixed.movies.reviews = {};
            }

            // Удаляем дубликаты
            fixed.movies.want = this._removeDuplicates(fixed.movies.want);
            fixed.movies.watched = this._removeDuplicates(fixed.movies.watched);
            fixed.movies.watching = this._removeDuplicates(fixed.movies.watching);

            // Удаляем некорректные записи
            fixed.movies.want = fixed.movies.want.filter(m => m && m.id);
            fixed.movies.watched = fixed.movies.watched.filter(m => m && m.id);
            fixed.movies.watching = fixed.movies.watching.filter(m => m && m.id);
        }

        // Проверяем tvShows
        if (!fixed.tvShows || typeof fixed.tvShows !== 'object') {
            fixed.tvShows = { episodes: {}, seasonReviews: {}, reviews: {} };
        } else {
            if (!fixed.tvShows.episodes || typeof fixed.tvShows.episodes !== 'object') {
                fixed.tvShows.episodes = {};
            }
            if (!fixed.tvShows.seasonReviews || typeof fixed.tvShows.seasonReviews !== 'object') {
                fixed.tvShows.seasonReviews = {};
            }
            if (!fixed.tvShows.reviews || typeof fixed.tvShows.reviews !== 'object') {
                fixed.tvShows.reviews = {};
            }

            // Очищаем некорректные данные эпизодов
            Object.keys(fixed.tvShows.episodes).forEach(key => {
                if (!Array.isArray(fixed.tvShows.episodes[key])) {
                    fixed.tvShows.episodes[key] = [];
                } else {
                    // Удаляем дубликаты эпизодов
                    fixed.tvShows.episodes[key] = [...new Set(fixed.tvShows.episodes[key])];
                }
            });
        }

        // Проверяем activity
        if (!Array.isArray(fixed.activity)) {
            fixed.activity = [];
        } else {
            // Удаляем некорректные активности
            fixed.activity = fixed.activity.filter(a => 
                a && a.id && a.type && a.action && a.date
            );
        }

        // Проверяем search
        if (!fixed.search || !Array.isArray(fixed.search.recent)) {
            fixed.search = { recent: [] };
        } else {
            fixed.search.recent = fixed.search.recent.filter(s => s && s.id);
        }

        return fixed;
    }

    /**
     * Удаляет дубликаты из массива по id
     */
    _removeDuplicates(array) {
        const seen = new Set();
        return array.filter(item => {
            if (!item || !item.id) return false;
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });
    }

    /**
     * Создает чистое хранилище для новых пользователей
     */
    _createFreshStore() {
        return {
            version: this.CURRENT_VERSION,
            movies: {
                want: [],
                watched: [],
                watching: [],
                reviews: {}
            },
            tvShows: {
                episodes: {},
                seasonReviews: {},
                reviews: {}
            },
            search: {
                recent: []
            },
            activity: []
        };
    }

    /**
     * Проверяет, нужна ли миграция
     */
    needsMigration(data) {
        if (!data) return false;
        const dataVersion = data.version || '1.0';
        return dataVersion !== this.CURRENT_VERSION;
    }
}

export const dataMigrationService = new DataMigrationService();
