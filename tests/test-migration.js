/**
 * Тестовый скрипт для проверки миграции данных 1.1 → 1.2
 */

import { dataMigrationService } from '../src/services/data-migration.js';

// Тестовые данные версии 1.1 (старая структура)
const oldData = {
    version: '1.1',
    userId: 'test-user',
    movies: {
        want: [
            { id: 1, title: 'Movie 1', media_type: 'movie', poster_path: '/path1.jpg' },
            { id: 2, name: 'TV Show 1', media_type: 'tv', poster_path: '/path2.jpg' }
        ],
        watched: [
            { id: 3, title: 'Movie 2', media_type: 'movie', poster_path: '/path3.jpg' },
            { id: 4, name: 'TV Show 2', media_type: 'tv', poster_path: '/path4.jpg' }
        ],
        watching: [
            { id: 5, name: 'TV Show 3', media_type: 'tv', poster_path: '/path5.jpg' }
        ],
        reviews: {
            1: { rating: 8, review: 'Great movie!' },
            3: { rating: 9, review: 'Excellent!' }
        }
    },
    tvShows: {
        episodes: {
            '2_1': [1, 2, 3],
            '4_1': [1, 2]
        },
        seasonReviews: {
            '2_1': { rating: 7, review: 'Good season' }
        },
        reviews: {}
    },
    search: {
        recent: []
    },
    activity: []
};

console.log('=== Тест миграции 1.1 → 1.2 ===\n');

console.log('📦 Исходные данные (версия 1.1):');
console.log('movies.want:', oldData.movies.want.length, 'элементов');
console.log('  - Фильмов:', oldData.movies.want.filter(m => m.media_type === 'movie').length);
console.log('  - Сериалов:', oldData.movies.want.filter(m => m.media_type === 'tv').length);
console.log('movies.watched:', oldData.movies.watched.length, 'элементов');
console.log('  - Фильмов:', oldData.movies.watched.filter(m => m.media_type === 'movie').length);
console.log('  - Сериалов:', oldData.movies.watched.filter(m => m.media_type === 'tv').length);
console.log('movies.watching:', oldData.movies.watching.length, 'элементов');
console.log('  - Сериалов:', oldData.movies.watching.filter(m => m.media_type === 'tv').length);
console.log('');

// Выполняем миграцию
const migratedData = dataMigrationService.migrate(oldData);

console.log('✅ Миграция завершена!\n');

console.log('📦 Новые данные (версия 1.2):');
console.log('Версия:', migratedData.version);
console.log('');

console.log('🎬 Фильмы (movies):');
console.log('  want:', migratedData.movies.want.length, 'элементов');
migratedData.movies.want.forEach(m => {
    console.log(`    - ${m.title} (id: ${m.id}, type: ${m.media_type})`);
});
console.log('  watched:', migratedData.movies.watched.length, 'элементов');
migratedData.movies.watched.forEach(m => {
    console.log(`    - ${m.title} (id: ${m.id}, type: ${m.media_type})`);
});
console.log('  watching:', migratedData.movies.watching || 'undefined (удалено)');
console.log('  reviews:', Object.keys(migratedData.movies.reviews).length, 'отзывов');
console.log('');

console.log('📺 Сериалы (tvShows):');
console.log('  want:', migratedData.tvShows.want.length, 'элементов');
migratedData.tvShows.want.forEach(s => {
    console.log(`    - ${s.name} (id: ${s.id}, type: ${s.media_type})`);
});
console.log('  watching:', migratedData.tvShows.watching.length, 'элементов');
migratedData.tvShows.watching.forEach(s => {
    console.log(`    - ${s.name} (id: ${s.id}, type: ${s.media_type})`);
});
console.log('  watched:', migratedData.tvShows.watched.length, 'элементов');
migratedData.tvShows.watched.forEach(s => {
    console.log(`    - ${s.name} (id: ${s.id}, type: ${s.media_type})`);
});
console.log('  episodes:', Object.keys(migratedData.tvShows.episodes).length, 'сезонов');
console.log('  seasonReviews:', Object.keys(migratedData.tvShows.seasonReviews).length, 'отзывов');
console.log('');

// Проверки
console.log('🔍 Проверки:');

const checks = [
    {
        name: 'Версия обновлена до 1.2',
        pass: migratedData.version === '1.2'
    },
    {
        name: 'movies.watching удалён',
        pass: !migratedData.movies.watching
    },
    {
        name: 'Все фильмы в movies.want',
        pass: migratedData.movies.want.every(m => m.media_type === 'movie')
    },
    {
        name: 'Все фильмы в movies.watched',
        pass: migratedData.movies.watched.every(m => m.media_type === 'movie')
    },
    {
        name: 'Все сериалы в tvShows.want',
        pass: migratedData.tvShows.want.every(s => s.media_type === 'tv')
    },
    {
        name: 'Все сериалы в tvShows.watching',
        pass: migratedData.tvShows.watching.every(s => s.media_type === 'tv')
    },
    {
        name: 'Все сериалы в tvShows.watched',
        pass: migratedData.tvShows.watched.every(s => s.media_type === 'tv')
    },
    {
        name: 'Количество фильмов сохранено',
        pass: migratedData.movies.want.length === 1 && migratedData.movies.watched.length === 1
    },
    {
        name: 'Количество сериалов сохранено',
        pass: migratedData.tvShows.want.length === 1 && 
              migratedData.tvShows.watching.length === 1 && 
              migratedData.tvShows.watched.length === 1
    },
    {
        name: 'Отзывы на фильмы сохранены',
        pass: Object.keys(migratedData.movies.reviews).length === 2
    },
    {
        name: 'Эпизоды сериалов сохранены',
        pass: Object.keys(migratedData.tvShows.episodes).length === 2
    },
    {
        name: 'Отзывы на сезоны сохранены',
        pass: Object.keys(migratedData.tvShows.seasonReviews).length === 1
    }
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
    if (check.pass) {
        console.log(`  ✅ ${check.name}`);
        passed++;
    } else {
        console.log(`  ❌ ${check.name}`);
        failed++;
    }
});

console.log('');
console.log(`📊 Результат: ${passed}/${checks.length} тестов пройдено`);

if (failed === 0) {
    console.log('🎉 Все тесты пройдены успешно!');
} else {
    console.log(`⚠️  ${failed} тестов провалено`);
    process.exit(1);
}
