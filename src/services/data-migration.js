/**
 * Сервис миграции данных пользователя
 * Обеспечивает совместимость при изменении структуры данных
 */

class DataMigrationService {
    constructor() {
        this.CURRENT_VERSION = '1.3';
        this.migrations = {
            '1.0': this._migrateFrom1_0.bind(this),
            '1.1': this._migrateFrom1_1.bind(this),
            '1.2': this._migrateFrom1_2.bind(this),
            '1.3': null // текущая версия, миграция не нужна
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
            migratedData = this._migrateFrom1_2(migratedData);
        } else if (dataVersion === '1.1') {
            migratedData = this._migrateFrom1_1(migratedData);
            migratedData = this._migrateFrom1_2(migratedData);
        } else if (dataVersion === '1.2') {
            migratedData = this._migrateFrom1_2(migratedData);
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
                seasonReviews: {}
            };
        } else {
            if (!migrated.tvShows.episodes) migrated.tvShows.episodes = {};
            if (!migrated.tvShows.seasonReviews) migrated.tvShows.seasonReviews = {};
            // Удаляем tvShows.reviews (больше не используется)
            if (migrated.tvShows.reviews) {
                delete migrated.tvShows.reviews;
            }
        }

        // 3. Удаляем activity (больше не используется)
        if (migrated.activity) {
            delete migrated.activity;
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
     * Миграция с версии 1.2 на 1.3
     * Оптимизация: сохраняем только ID вместо полных объектов
     */
    _migrateFrom1_2(data) {
        console.log('Применяется миграция 1.2 → 1.3: Оптимизация хранения (только ID)');
        
        const migrated = { ...data };

        // Конвертируем массивы фильмов в массивы ID
        if (migrated.movies) {
            ['want', 'watched'].forEach(listType => {
                if (Array.isArray(migrated.movies[listType])) {
                    const originalLength = migrated.movies[listType].length;
                    migrated.movies[listType] = migrated.movies[listType].map(item => {
                        return typeof item === 'object' ? item.id : item;
                    }).filter(id => id !== undefined && id !== null);
                    
                    console.log(`Оптимизировано movies.${listType}: ${originalLength} объектов → ${migrated.movies[listType].length} ID`);
                }
            });
        }

        // Конвертируем массивы сериалов в массивы ID
        if (migrated.tvShows) {
            ['want', 'watching', 'watched'].forEach(listType => {
                if (Array.isArray(migrated.tvShows[listType])) {
                    const originalLength = migrated.tvShows[listType].length;
                    migrated.tvShows[listType] = migrated.tvShows[listType].map(item => {
                        return typeof item === 'object' ? item.id : item;
                    }).filter(id => id !== undefined && id !== null);
                    
                    console.log(`Оптимизировано tvShows.${listType}: ${originalLength} объектов → ${migrated.tvShows[listType].length} ID`);
                }
            });
        }

        // Оптимизируем recent searches - оставляем только последние 10
        if (migrated.search && Array.isArray(migrated.search.recent)) {
            migrated.search.recent = migrated.search.recent.slice(0, 10);
        }

        // Удаляем activity (больше не используется)
        if (migrated.activity) {
            delete migrated.activity;
        }

        console.log('Миграция 1.2 → 1.3 завершена');
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
            } else {
                // Удаляем неиспользуемые поля season_air_date и season_number из отзывов на фильмы
                Object.keys(fixed.movies.reviews).forEach(id => {
                    const review = fixed.movies.reviews[id];
                    if (review?.season_air_date !== undefined) {
                        delete review.season_air_date;
                    }
                    if (review?.season_number !== undefined) {
                        delete review.season_number;
                    }
                });
            }

            // Удаляем watching из movies (фильмы не могут быть в watching)
            if (fixed.movies.watching) {
                delete fixed.movies.watching;
            }

            // Нормализуем к ID и удаляем дубликаты
            fixed.movies.want = this._normalizeToIds(fixed.movies.want);
            fixed.movies.watched = this._normalizeToIds(fixed.movies.watched);
        }

        // Проверяем tvShows (с добавлением списков want, watching, watched)
        if (!fixed.tvShows || typeof fixed.tvShows !== 'object') {
            fixed.tvShows = { 
                want: [], 
                watching: [], 
                watched: [], 
                episodes: {}, 
                seasonReviews: {}
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
            } else {
                // Удаляем неиспользуемое поле season_air_date из отзывов на сезоны
                Object.keys(fixed.tvShows.seasonReviews).forEach(key => {
                    const review = fixed.tvShows.seasonReviews[key];
                    if (review?.season_air_date !== undefined) {
                        delete review.season_air_date;
                    }
                });
            }
            // Удаляем tvShows.reviews (больше не используется)
            if (fixed.tvShows.reviews) {
                delete fixed.tvShows.reviews;
            }

            // Нормализуем к ID и удаляем дубликаты
            fixed.tvShows.want = this._normalizeToIds(fixed.tvShows.want);
            fixed.tvShows.watching = this._normalizeToIds(fixed.tvShows.watching);
            fixed.tvShows.watched = this._normalizeToIds(fixed.tvShows.watched);

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

        // Удаляем activity (больше не используется)
        if (fixed.activity) {
            delete fixed.activity;
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
     * Нормализует массив к массиву ID (удаляет дубликаты)
     */
    _normalizeToIds(array) {
        if (!Array.isArray(array)) return [];
        
        const ids = array.map(item => {
            return typeof item === 'object' ? item.id : item;
        }).filter(id => id !== undefined && id !== null && typeof id === 'number');
        
        // Удаляем дубликаты
        return [...new Set(ids)];
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
                seasonReviews: {}
            },
            search: {
                recent: []
            }
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
