/**
 * Тесты для системы миграции данных
 */

import { dataMigrationService } from '../data-migration.js';

describe('DataMigrationService', () => {
    describe('migrate()', () => {
        test('создает новое хранилище если данных нет', () => {
            const result = dataMigrationService.migrate(null);
            
            expect(result).toBeDefined();
            expect(result.version).toBe('1.1');
            expect(result.movies).toBeDefined();
            expect(result.tvShows).toBeDefined();
            expect(result.activity).toEqual([]);
            expect(result.search).toEqual({ recent: [] });
        });

        test('не изменяет данные если версия актуальная', () => {
            const data = {
                version: '1.1',
                movies: { want: [], watched: [], watching: [], reviews: {} },
                tvShows: { episodes: {}, seasonReviews: {}, reviews: {} },
                activity: [],
                search: { recent: [] }
            };

            const result = dataMigrationService.migrate(data);
            
            expect(result.version).toBe('1.1');
            expect(result).toMatchObject(data);
        });

        test('мигрирует данные с версии 1.0 на 1.1', () => {
            const oldData = {
                version: '1.0',
                movies: {
                    '123': {
                        want: true,
                        watched: false,
                        title: 'Test Movie',
                        poster_path: '/test.jpg',
                        release_date: '2024-01-01'
                    },
                    '456': {
                        want: false,
                        watched: true,
                        rating: 5,
                        review: 'Great!',
                        title: 'Another Movie',
                        poster_path: '/test2.jpg'
                    }
                },
                tvShows: {
                    episodes: {},
                    reviews: {}
                },
                activity: [],
                search: { recent: [] }
            };

            const result = dataMigrationService.migrate(oldData);
            
            expect(result.version).toBe('1.1');
            expect(Array.isArray(result.movies.want)).toBe(true);
            expect(Array.isArray(result.movies.watched)).toBe(true);
            expect(Array.isArray(result.movies.watching)).toBe(true);
            
            // Проверяем что фильм из want попал в массив want
            expect(result.movies.want).toHaveLength(1);
            expect(result.movies.want[0].id).toBe(123);
            expect(result.movies.want[0].title).toBe('Test Movie');
            
            // Проверяем что фильм из watched попал в массив watched
            expect(result.movies.watched).toHaveLength(1);
            expect(result.movies.watched[0].id).toBe(456);
            
            // Проверяем что отзыв сохранился
            expect(result.movies.reviews['456']).toBeDefined();
            expect(result.movies.reviews['456'].rating).toBe(5);
            expect(result.movies.reviews['456'].review).toBe('Great!');
        });

        test('исправляет некорректную структуру movies', () => {
            const badData = {
                version: '1.1',
                movies: null, // некорректная структура
                tvShows: { episodes: {}, seasonReviews: {}, reviews: {} },
                activity: [],
                search: { recent: [] }
            };

            const result = dataMigrationService.migrate(badData);
            
            expect(result.movies).toBeDefined();
            expect(Array.isArray(result.movies.want)).toBe(true);
            expect(Array.isArray(result.movies.watched)).toBe(true);
            expect(Array.isArray(result.movies.watching)).toBe(true);
            expect(result.movies.reviews).toBeDefined();
        });

        test('исправляет некорректную структуру tvShows', () => {
            const badData = {
                version: '1.1',
                movies: { want: [], watched: [], watching: [], reviews: {} },
                tvShows: null, // некорректная структура
                activity: [],
                search: { recent: [] }
            };

            const result = dataMigrationService.migrate(badData);
            
            expect(result.tvShows).toBeDefined();
            expect(result.tvShows.episodes).toBeDefined();
            expect(result.tvShows.seasonReviews).toBeDefined();
            // tvShows.reviews больше не используется
            expect(result.tvShows.reviews).toBeUndefined();
        });

        test('удаляет дубликаты из списков', () => {
            const dataWithDuplicates = {
                version: '1.1',
                movies: {
                    want: [
                        { id: 123, title: 'Movie 1' },
                        { id: 123, title: 'Movie 1' }, // дубликат
                        { id: 456, title: 'Movie 2' }
                    ],
                    watched: [],
                    watching: [],
                    reviews: {}
                },
                tvShows: { episodes: {}, seasonReviews: {}, reviews: {} },
                activity: [],
                search: { recent: [] }
            };

            const result = dataMigrationService.migrate(dataWithDuplicates);
            
            expect(result.movies.want).toHaveLength(2);
            expect(result.movies.want[0].id).toBe(123);
            expect(result.movies.want[1].id).toBe(456);
        });

        test('удаляет некорректные записи', () => {
            const dataWithBadRecords = {
                version: '1.1',
                movies: {
                    want: [
                        { id: 123, title: 'Movie 1' },
                        null, // некорректная запись
                        { title: 'Movie without ID' }, // нет ID
                        { id: 456, title: 'Movie 2' }
                    ],
                    watched: [],
                    watching: [],
                    reviews: {}
                },
                tvShows: { episodes: {}, seasonReviews: {}, reviews: {} },
                activity: [],
                search: { recent: [] }
            };

            const result = dataMigrationService.migrate(dataWithBadRecords);
            
            expect(result.movies.want).toHaveLength(2);
            expect(result.movies.want[0].id).toBe(123);
            expect(result.movies.want[1].id).toBe(456);
        });

        test('исправляет некорректные данные эпизодов', () => {
            const badEpisodesData = {
                version: '1.1',
                movies: { want: [], watched: [], watching: [], reviews: {} },
                tvShows: {
                    episodes: {
                        '123_1': [1, 2, 3, 2], // дубликат эпизода
                        '456_1': 'not an array', // некорректный тип
                        '789_1': [1, 2, 3]
                    },
                    seasonReviews: {},
                    reviews: {}
                },
                activity: [],
                search: { recent: [] }
            };

            const result = dataMigrationService.migrate(badEpisodesData);
            
            // Дубликаты удалены
            expect(result.tvShows.episodes['123_1']).toEqual([1, 2, 3]);
            
            // Некорректный тип исправлен
            expect(Array.isArray(result.tvShows.episodes['456_1'])).toBe(true);
            expect(result.tvShows.episodes['456_1']).toEqual([]);
            
            // Корректные данные не изменены
            expect(result.tvShows.episodes['789_1']).toEqual([1, 2, 3]);
        });
    });

    describe('needsMigration()', () => {
        test('возвращает false для null', () => {
            expect(dataMigrationService.needsMigration(null)).toBe(false);
        });

        test('возвращает true для старой версии', () => {
            const oldData = { version: '1.0' };
            expect(dataMigrationService.needsMigration(oldData)).toBe(true);
        });

        test('возвращает false для актуальной версии', () => {
            const currentData = { version: '1.1' };
            expect(dataMigrationService.needsMigration(currentData)).toBe(false);
        });

        test('возвращает true для данных без версии', () => {
            const noVersionData = { movies: {} };
            expect(dataMigrationService.needsMigration(noVersionData)).toBe(true);
        });
    });
});
