/**
 * Сервис миграции данных пользователя
 * Обеспечивает совместимость при изменении структуры данных
 */

class DataMigrationService {
    constructor() {
        this.CURRENT_VERSION = '1.2';
        this.migrations = {
            '1.0': this._migrateFrom1_0.bind(this),
            '1.1': this._migrateFrom1_1.bind(this),
            '1.2': null // текущая версия, миграция не нужна
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
            migratedData = this._migrateFrom1_1(migratedData);
        } else if (dataVersion === '1.1') {
            migratedData = this._migrateFrom1_1(migratedData);
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
     * Миграция с версии 1.1 на 1.2
     * Разделяет хранилища фильмов и сериалов
     */
    _migrateFrom1_1(data) {
        console.log('Применяется миграция 1.1 → 1.2: Разделение хранилищ фильмов и сериалов');
        
        const migrated = { ...data };

        // Создаем новую структуру для сериалов
        if (!migrated.tvShows) {
            migrated.tvShows = {
                want: [],
                watching: [],
                watched: [],
                episodes: {},
                seasonReviews: {},
                reviews: {}
            };
        } else {
            // Добавляем списки для сериалов, если их нет
            if (!migrated.tvShows.want) migrated.tvShows.want = [];
            if (!migrated.tvShows.watching) migrated.tvShows.watching = [];
            if (!migrated.tvShows.watched) migrated.tvShows.watched = [];
        }

        // Переносим сериалы из movies в tvShows
        if (migrated.movies) {
            ['want', 'watched', 'watching'].forEach(listType => {
                if (Array.isArray(migrated.movies[listType])) {
                    // Фильтруем сериалы и переносим их
                    const tvShows = migrated.movies[listType].filter(item => item.media_type === 'tv');
                    const movies = migrated.movies[listType].filter(item => item.media_type === 'movie' || !item.media_type);
                    
                    // Обновляем список фильмов (только фильмы)
                    migrated.movies[listType] = movies;
                    
                    // Добавляем сериалы в соответствующий список
                    tvShows.forEach(show => {
                        if (!migrated.tvShows[listType].find(s => s.id === show.id)) {
                            migrated.tvShows[listType].push(show);
                        }
                    });
                    
                    console.log(`Перенесено ${tvShows.length} сериалов из movies.${listType} в tvShows.${listType}`);
                }
            });

            // Удаляем watching из movies (фильмы не могут быть в watching)
            if (migrated.movies.watching) {
                console.log(`Удалено ${migrated.movies.watching.length} записей из movies.watching (фильмы не могут быть в watching)`);
                delete migrated.movies.watching;
            }
        }

        console.log('Миграция 1.1 → 1.2 завершена');
        return migrated;
    }

    /**
     * Валидирует и исправляет структуру данных
     */
    _validateAndFix(data) {
        const fixed = { ...data };

        // Проверяем movies (только want и watched, без watching)
        if (!fixed.movies || typeof fixed.movies !== 'object') {
            fixed.movies = { want: [], watched: [], reviews: {} };
        } else {
            if (!Array.isArray(fixed.movies.want)) fixed.movies.want = [];
            if (!Array.isArray(fixed.movies.watched)) fixed.movies.watched = [];
            if (!fixed.movies.reviews || typeof fixed.movies.reviews !== 'object') {
                fixed.movies.reviews = {};
            }

            // Удаляем watching из movies (фильмы не могут быть в watching)
            if (fixed.movies.watching) {
                delete fixed.movies.watching;
            }

            // Удаляем дубликаты
            fixed.movies.want = this._removeDuplicates(fixed.movies.want);
            fixed.movies.watched = this._removeDuplicates(fixed.movies.watched);

            // Удаляем некорректные записи и сериалы из списков фильмов
            fixed.movies.want = fixed.movies.want.filter(m => m && m.id && m.media_type !== 'tv');
            fixed.movies.watched = fixed.movies.watched.filter(m => m && m.id && m.media_type !== 'tv');
        }

        // Проверяем tvShows (с добавлением списков want, watching, watched)
        if (!fixed.tvShows || typeof fixed.tvShows !== 'object') {
            fixed.tvShows = { 
                want: [], 
                watching: [], 
                watched: [], 
                episodes: {}, 
                seasonReviews: {}, 
                reviews: {} 
            };
        } else {
            if (!Array.isArray(fixed.tvShows.want)) fixed.tvShows.want = [];
            if (!Array.isArray(fixed.tvShows.watching)) fixed.tvShows.watching = [];
            if (!Array.isArray(fixed.tvShows.watched)) fixed.tvShows.watched = [];
            if (!fixed.tvShows.episodes || typeof fixed.tvShows.episodes !== 'object') {
                fixed.tvShows.episodes = {};
            }
            if (!fixed.tvShows.seasonReviews || typeof fixed.tvShows.seasonReviews !== 'object') {
                fixed.tvShows.seasonReviews = {};
            }
            if (!fixed.tvShows.reviews || typeof fixed.tvShows.reviews !== 'object') {
                fixed.tvShows.reviews = {};
            }

            // Удаляем дубликаты из списков сериалов
            fixed.tvShows.want = this._removeDuplicates(fixed.tvShows.want);
            fixed.tvShows.watching = this._removeDuplicates(fixed.tvShows.watching);
            fixed.tvShows.watched = this._removeDuplicates(fixed.tvShows.watched);

            // Удаляем некорректные записи и фильмы из списков сериалов
            fixed.tvShows.want = fixed.tvShows.want.filter(s => s && s.id && s.media_type !== 'movie');
            fixed.tvShows.watching = fixed.tvShows.watching.filter(s => s && s.id && s.media_type !== 'movie');
            fixed.tvShows.watched = fixed.tvShows.watched.filter(s => s && s.id && s.media_type !== 'movie');

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
                reviews: {}
            },
            tvShows: {
                want: [],
                watching: [],
                watched: [],
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
