/**
 * Утилита для диагностики и ремонта данных пользователя
 * Можно вызвать из консоли браузера для отладки
 */

import { dataMigrationService } from './data-migration.js';
import { StorageAdapter } from './storage-adapter.js';

class DataRepairUtility {
    /**
     * Проверяет состояние данных пользователя
     */
    diagnose(userId = null) {
        // Определяем userId
        if (!userId) {
            const storageKey = this._findUserDataKey();
            if (storageKey) {
                userId = storageKey.replace('user_data_', '');
            } else {
                userId = sessionStorage.getItem('user_id') || 
                         window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 
                         'guest';
            }
        }

        const storageKey = `user_data_${userId}`;
        const oldData = localStorage.getItem(storageKey);
        
        // Проверяем новую структуру
        const adapter = new StorageAdapter(userId);
        const meta = adapter.getMeta();
        
        const report = {
            userId,
            hasOldStructure: !!oldData,
            hasNewStructure: !!(meta && meta.version === '1.4'),
            version: meta?.version || (oldData ? JSON.parse(oldData).version : 'не указана'),
            needsMigration: false,
            issues: []
        };

        console.log(`🔍 Проверка данных пользователя: ${userId}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        try {
            // Если есть старая структура
            if (oldData) {
                const data = JSON.parse(oldData);
                report.version = data.version || 'не указана';
                report.needsMigration = data.version !== '1.4';
                report.issues.push('⚠️ Обнаружена старая структура данных (требуется миграция в 1.4)');
                
                // Проверяем структуру старой версии
                this._diagnoseOldStructure(data, report);
            }
            
            // Если есть новая структура
            if (meta && meta.version === '1.4') {
                console.log('✅ Новая структура данных (1.4) обнаружена');
                this._diagnoseNewStructure(adapter, report);
            }
            
            // Если нет ни старой, ни новой структуры
            if (!oldData && (!meta || meta.version !== '1.4')) {
                report.issues.push('❌ Данные не найдены ни в старой, ни в новой структуре');
            }

            // Проверяем структуру movies
            if (!data.movies) {
                report.issues.push('❌ Отсутствует объект movies');
            } else {
                if (!Array.isArray(data.movies.want)) {
                    report.issues.push('⚠️ movies.want не является массивом');
                }
                if (!Array.isArray(data.movies.watched)) {
                    report.issues.push('⚠️ movies.watched не является массивом');
                }
                if (!Array.isArray(data.movies.watching)) {
                    report.issues.push('⚠️ movies.watching не является массивом');
                }
                if (!data.movies.reviews || typeof data.movies.reviews !== 'object') {
                    report.issues.push('⚠️ movies.reviews не является объектом');
                }

                // Статистика
                report.moviesStats = {
                    want: Array.isArray(data.movies.want) ? data.movies.want.length : 'N/A',
                    watched: Array.isArray(data.movies.watched) ? data.movies.watched.length : 'N/A',
                    watching: Array.isArray(data.movies.watching) ? data.movies.watching.length : 'N/A',
                    reviews: data.movies.reviews ? Object.keys(data.movies.reviews).length : 'N/A'
                };
            }

            // Проверяем структуру tvShows
            if (!data.tvShows) {
                report.issues.push('❌ Отсутствует объект tvShows');
            } else {
                if (!data.tvShows.episodes || typeof data.tvShows.episodes !== 'object') {
                    report.issues.push('⚠️ tvShows.episodes не является объектом');
                }
                if (!data.tvShows.seasonReviews || typeof data.tvShows.seasonReviews !== 'object') {
                    report.issues.push('⚠️ tvShows.seasonReviews не является объектом');
                }
                // Удаляем tvShows.reviews если он существует (больше не используется)
                if (data.tvShows.reviews) {
                    report.issues.push('⚠️ tvShows.reviews найден (больше не используется, будет удален)');
                }

                // Статистика
                report.tvShowsStats = {
                    episodeKeys: data.tvShows.episodes ? Object.keys(data.tvShows.episodes).length : 'N/A',
                    seasonReviews: data.tvShows.seasonReviews ? Object.keys(data.tvShows.seasonReviews).length : 'N/A'
                };
            }

            // Удаляем activity если он существует (больше не используется)
            if (data.activity) {
                report.issues.push('⚠️ activity найден (больше не используется, будет удален)');
            }

            // Проверяем search.recent в sessionStorage (теперь хранится там)
            try {
                const searchUserId = userId || data.userId || 'guest';
                const key = `recent_searches_${searchUserId}`;
                const sessionData = sessionStorage.getItem(key);
                if (sessionData) {
                    const recent = JSON.parse(sessionData);
                    if (Array.isArray(recent)) {
                        report.recentSearchCount = recent.length;
                    }
                }
            } catch (error) {
                // Игнорируем ошибки
            }
            
            // Если search.recent все еще в localStorage (старые данные), предупреждаем
            if (data.search && data.search.recent) {
                report.issues.push('⚠️ search.recent найден в localStorage (будет перенесен в sessionStorage)');
            }

            // Вывод отчета
            console.log(`\n📊 ОТЧЕТ О СОСТОЯНИИ ДАННЫХ:`);
            console.log(`Версия: ${report.version}`);
            console.log(`Старая структура: ${report.hasOldStructure ? '✅ Да' : '❌ Нет'}`);
            console.log(`Новая структура: ${report.hasNewStructure ? '✅ Да' : '❌ Нет'}`);
            console.log(`Требуется миграция: ${report.needsMigration ? '⚠️ Да' : '✅ Нет'}`);
            
            if (report.moviesStats) {
                console.log('\n🎬 Фильмы:');
                console.log(`  Want: ${report.moviesStats.want}`);
                console.log(`  Watched: ${report.moviesStats.watched}`);
                console.log(`  Reviews: ${report.moviesStats.reviews}`);
            }

            if (report.tvShowsStats) {
                console.log('\n📺 Сериалы:');
                console.log(`  Want: ${report.tvShowsStats.want || 'N/A'}`);
                console.log(`  Watching: ${report.tvShowsStats.watching || 'N/A'}`);
                console.log(`  Watched: ${report.tvShowsStats.watched || 'N/A'}`);
                console.log(`  Episode keys: ${report.tvShowsStats.episodeKeys || 'N/A'}`);
                console.log(`  Season reviews: ${report.tvShowsStats.seasonReviews || 'N/A'}`);
            }

            if (report.recentSearchCount !== undefined) {
                console.log(`\n🔍 Недавние поиски: ${report.recentSearchCount} записей`);
            }

            if (report.issues.length > 0) {
                console.log('\n⚠️ ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ:');
                report.issues.forEach(issue => console.log(`  ${issue}`));
            } else {
                console.log('\n✅ Проблем не обнаружено');
            }

            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

            return report;
        } catch (error) {
            console.error('❌ Ошибка при проверке данных:', error);
            return null;
        }
    }

    /**
     * Диагностика старой структуры данных
     */
    _diagnoseOldStructure(data, report) {
        // Проверяем структуру movies
        if (!data.movies) {
            report.issues.push('❌ Отсутствует объект movies');
        } else {
            if (!Array.isArray(data.movies.want)) {
                report.issues.push('⚠️ movies.want не является массивом');
            }
            if (!Array.isArray(data.movies.watched)) {
                report.issues.push('⚠️ movies.watched не является массивом');
            }
            if (!data.movies.reviews || typeof data.movies.reviews !== 'object') {
                report.issues.push('⚠️ movies.reviews не является объектом');
            }

            report.moviesStats = {
                want: Array.isArray(data.movies.want) ? data.movies.want.length : 'N/A',
                watched: Array.isArray(data.movies.watched) ? data.movies.watched.length : 'N/A',
                reviews: data.movies.reviews ? Object.keys(data.movies.reviews).length : 'N/A'
            };
        }

        // Проверяем структуру tvShows
        if (!data.tvShows) {
            report.issues.push('❌ Отсутствует объект tvShows');
        } else {
            if (!data.tvShows.episodes || typeof data.tvShows.episodes !== 'object') {
                report.issues.push('⚠️ tvShows.episodes не является объектом');
            }
            if (!data.tvShows.seasonReviews || typeof data.tvShows.seasonReviews !== 'object') {
                report.issues.push('⚠️ tvShows.seasonReviews не является объектом');
            }

            report.tvShowsStats = {
                episodeKeys: data.tvShows.episodes ? Object.keys(data.tvShows.episodes).length : 'N/A',
                seasonReviews: data.tvShows.seasonReviews ? Object.keys(data.tvShows.seasonReviews).length : 'N/A'
            };
        }

        // Удаляем activity если он существует (больше не используется)
        if (data.activity) {
            report.issues.push('⚠️ activity найден (больше не используется, будет удален)');
        }

        // Проверяем search.recent в sessionStorage
        try {
            const searchUserId = data.userId || 'guest';
            const key = `recent_searches_${searchUserId}`;
            const sessionData = sessionStorage.getItem(key);
            if (sessionData) {
                const recent = JSON.parse(sessionData);
                if (Array.isArray(recent)) {
                    report.recentSearchCount = recent.length;
                }
            }
        } catch (error) {
            // Игнорируем ошибки
        }
        
        // Если search.recent все еще в localStorage (старые данные), предупреждаем
        if (data.search && data.search.recent) {
            report.issues.push('⚠️ search.recent найден в localStorage (будет перенесен в sessionStorage)');
        }
    }

    /**
     * Диагностика новой структуры данных (1.4)
     */
    _diagnoseNewStructure(adapter, report) {
        try {
            // Проверяем фильмы
            const moviesWant = adapter.getMoviesList('want');
            const moviesWatched = adapter.getMoviesList('watched');
            const moviesReviews = adapter.getAllMovieReviews();
            
            report.moviesStats = {
                want: moviesWant.length,
                watched: moviesWatched.length,
                reviews: Object.keys(moviesReviews).length
            };

            // Проверяем сериалы
            const tvWant = adapter.getTVShowsList('want');
            const tvWatching = adapter.getTVShowsList('watching');
            const tvWatched = adapter.getTVShowsList('watched');
            const seasonReviews = adapter.getAllSeasonReviews();
            
            // Подсчитываем количество сериалов с эпизодами
            // Получаем все эпизоды из новой структуры (tv_episodes)
            let episodeKeysCount = 0;
            const allEpisodes = adapter._getAllEpisodesData();
            
            // Подсчитываем количество сезонов во всех сериалах
            Object.values(allEpisodes).forEach(tvData => {
                if (tvData && typeof tvData === 'object') {
                    episodeKeysCount += Object.keys(tvData).length;
                }
            });
            
            report.tvShowsStats = {
                want: tvWant.length,
                watching: tvWatching.length,
                watched: tvWatched.length,
                episodeKeys: episodeKeysCount,
                seasonReviews: Object.keys(seasonReviews).length
            };

            // Проверяем недавние поиски
            try {
                const userId = adapter._userId;
                const key = `recent_searches_${userId}`;
                const sessionData = sessionStorage.getItem(key);
                if (sessionData) {
                    const recent = JSON.parse(sessionData);
                    if (Array.isArray(recent)) {
                        report.recentSearchCount = recent.length;
                    }
                }
            } catch (error) {
                // Игнорируем ошибки
            }
        } catch (error) {
            console.error('Ошибка при диагностике новой структуры:', error);
            report.issues.push('⚠️ Ошибка при проверке новой структуры данных');
        }
    }

    /**
     * Исправляет данные пользователя и мигрирует в новую структуру (1.4)
     */
    repair(userId = null, backup = true) {
        // Определяем userId
        if (!userId) {
            const storageKey = this._findUserDataKey();
            if (storageKey) {
                userId = storageKey.replace('user_data_', '');
            } else {
                // Пытаемся получить из sessionStorage или Telegram
                userId = sessionStorage.getItem('user_id') || 
                         window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 
                         'guest';
            }
        }

        const storageKey = `user_data_${userId}`;
        const oldData = localStorage.getItem(storageKey);
        
        if (!oldData) {
            console.log('ℹ️ Старые данные не найдены, проверяем новую структуру...');
            // Проверяем, есть ли данные в новой структуре
            const adapter = new StorageAdapter(userId);
            const meta = adapter.getMeta();
            if (meta && meta.version === '1.4') {
                console.log('✅ Данные уже в новой структуре (1.4)');
                return true;
            }
            console.error('❌ Данные не найдены ни в старой, ни в новой структуре');
            return false;
        }

        console.log(`🔧 Начинаем ремонт и миграцию данных: ${storageKey}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        try {
            // Создаем резервную копию
            if (backup) {
                const backupKey = `${storageKey}_backup_${Date.now()}`;
                localStorage.setItem(backupKey, oldData);
                console.log(`💾 Резервная копия создана: ${backupKey}`);
            }

            const data = JSON.parse(oldData);
            console.log(`📊 Текущая версия данных: ${data.version || 'не указана'}`);
            
            // Применяем миграции до версии 1.3
            const migratedData = dataMigrationService.migrate(data);
            console.log(`✅ Миграция до версии 1.3 завершена`);
            
            // Мигрируем в новую разбитую структуру (1.4)
            const adapter = new StorageAdapter(userId);
            const migrationResult = adapter.migrateFromOldStructure(migratedData);
            
            if (!migrationResult) {
                console.error('❌ Ошибка миграции в новую структуру');
                return false;
            }
            
            console.log(`✅ Миграция в версию 1.4 (разбитая структура) завершена`);
            
            // Проверяем, что миграция прошла успешно
            const newMeta = adapter.getMeta();
            if (newMeta && newMeta.version === '1.4') {
                console.log('✅ Данные успешно мигрированы в новую структуру');
                
                // Удаляем старый ключ после успешной миграции
                localStorage.removeItem(storageKey);
                console.log(`🗑️ Старый ключ ${storageKey} удален`);
                
                // Очищаем все старые ключи (отзывы, эпизоды в старом формате)
                this._cleanupOldKeys(userId);
                
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('✅ Данные успешно исправлены и мигрированы!');
                console.log('🔄 Перезагрузите страницу для применения изменений');
                
                return true;
            } else {
                console.error('❌ Ошибка: данные не были мигрированы в новую структуру');
                return false;
            }
        } catch (error) {
            console.error('❌ Ошибка при ремонте данных:', error);
            return false;
        }
    }

    /**
     * Очищает старые ключи после миграции
     */
    _cleanupOldKeys(userId) {
        const prefix = `user_${userId}_`;
        const keysToRemove = [];
        
        // Собираем все старые ключи для удаления
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            
            // Обрабатываем ключи пользовательских данных
            if (key.startsWith(prefix)) {
                const suffix = key.replace(prefix, '');
                
                // Удаляем старые ключи отзывов (movies_review_{id}, tv_review_{id}, tv_season_review_{tvId}_{season})
                if (suffix.startsWith('movies_review_') && suffix !== 'movies_reviews' && !suffix.startsWith('movies_reviews_g')) {
                    keysToRemove.push(key);
                }
                // Удаляем tv_review_ и tv_reviews (отзывы на сериалы больше не поддерживаются)
                if (suffix.startsWith('tv_review_') || suffix === 'tv_reviews' || suffix.startsWith('tv_reviews_g')) {
                    keysToRemove.push(key);
                }
                if (suffix.startsWith('tv_season_review_') && suffix !== 'tv_season_reviews' && !suffix.startsWith('tv_season_reviews_g')) {
                    keysToRemove.push(key);
                }
                
                // Удаляем старые ключи эпизодов (tv_ep_{tvId}, tv_ep_{tvId}_{season}, tv_ep_{tvId}_g*, tv_ep_{tvId}_meta)
                if (suffix.startsWith('tv_ep_') && suffix !== 'tv_episodes' && !suffix.startsWith('tv_episodes_g') && suffix !== 'tv_episodes_meta') {
                    keysToRemove.push(key);
                }
            }
            
            // Удаляем старые ключи кеша списков из localStorage (теперь хранятся в sessionStorage)
            // Кеш деталей фильмов/сериалов (cache_movie_${id}, cache_tv_${id}) остается в localStorage
            if (key.startsWith('cache_')) {
                const cacheKey = key.replace('cache_', '');
                
                // Удаляем кеш списков, которые теперь хранятся в sessionStorage
                const listCacheKeys = [
                    'movies_trending',
                    'movies_popular',
                    'movies_upcoming',
                    'tv_trending',
                    'tv_popular',
                    'tv_top_rated'
                ];
                
                if (listCacheKeys.includes(cacheKey)) {
                    keysToRemove.push(key);
                }
            }
        }
        
        if (keysToRemove.length > 0) {
            console.log(`🗑️ Найдено ${keysToRemove.length} старых ключей для удаления`);
            
            // Разделяем ключи пользовательских данных и кеша для логирования
            const userDataKeys = keysToRemove.filter(key => key.startsWith(prefix));
            const cacheKeys = keysToRemove.filter(key => key.startsWith('cache_'));
            
            if (userDataKeys.length > 0) {
                console.log(`   Пользовательские данные: ${userDataKeys.length} ключей`);
            }
            if (cacheKeys.length > 0) {
                console.log(`   Кеш списков: ${cacheKeys.length} ключей (теперь в sessionStorage)`);
            }
            
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                console.log(`   Удален: ${key}`);
            });
        }
    }

    /**
     * Создает резервную копию данных
     */
    backup(userId = null) {
        const storageKey = userId ? `user_data_${userId}` : this._findUserDataKey();
        
        if (!storageKey) {
            console.error('❌ Не найдены данные пользователя');
            return null;
        }

        try {
            const rawData = localStorage.getItem(storageKey);
            if (!rawData) {
                console.error('❌ Данные пусты');
                return null;
            }

            const backupKey = `${storageKey}_backup_${Date.now()}`;
            localStorage.setItem(backupKey, rawData);
            
            console.log(`✅ Резервная копия создана: ${backupKey}`);
            return backupKey;
        } catch (error) {
            console.error('❌ Ошибка при создании резервной копии:', error);
            return null;
        }
    }

    /**
     * Восстанавливает данные из резервной копии
     */
    restore(backupKey) {
        try {
            const backupData = localStorage.getItem(backupKey);
            if (!backupData) {
                console.error('❌ Резервная копия не найдена');
                return false;
            }

            // Извлекаем оригинальный ключ
            const originalKey = backupKey.replace(/_backup_\d+$/, '');
            
            localStorage.setItem(originalKey, backupData);
            console.log(`✅ Данные восстановлены из ${backupKey}`);
            console.log('🔄 Перезагрузите страницу для применения изменений');
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка при восстановлении данных:', error);
            return false;
        }
    }

    /**
     * Показывает список всех резервных копий
     */
    listBackups() {
        const backups = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('_backup_')) {
                const timestamp = key.match(/_backup_(\d+)$/)?.[1];
                const date = timestamp ? new Date(parseInt(timestamp)) : null;
                
                backups.push({
                    key,
                    date: date ? date.toLocaleString('ru-RU') : 'неизвестно',
                    size: localStorage.getItem(key)?.length || 0
                });
            }
        }

        if (backups.length === 0) {
            console.log('📦 Резервных копий не найдено');
            return [];
        }

        console.log('📦 СПИСОК РЕЗЕРВНЫХ КОПИЙ:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        backups.forEach((backup, index) => {
            console.log(`${index + 1}. ${backup.key}`);
            console.log(`   Дата: ${backup.date}`);
            console.log(`   Размер: ${(backup.size / 1024).toFixed(2)} KB`);
        });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return backups;
    }

    /**
     * Находит ключ данных пользователя в localStorage
     */
    _findUserDataKey() {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('user_data_') && !key.includes('_backup_')) {
                return key;
            }
        }
        return null;
    }

    /**
     * Показывает справку по использованию
     */
    help() {
        console.log(`
🛠️ DATA REPAIR UTILITY - СПРАВКА
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Доступные команды:

1. dataRepair.diagnose()
   Проверяет состояние данных и выводит отчет о проблемах

2. dataRepair.repair()
   Исправляет данные (автоматически создает резервную копию)

3. dataRepair.backup()
   Создает резервную копию текущих данных

4. dataRepair.restore('backup_key')
   Восстанавливает данные из резервной копии

5. dataRepair.listBackups()
   Показывает список всех резервных копий

6. dataRepair.help()
   Показывает эту справку

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Пример использования:
  dataRepair.diagnose()  // Проверить данные
  dataRepair.repair()    // Исправить проблемы
  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `);
    }
}

export const dataRepair = new DataRepairUtility();

// Делаем доступным глобально для использования в консоли
if (typeof window !== 'undefined') {
    window.dataRepair = dataRepair;
    console.log('🛠️ Data Repair Utility загружена. Введите dataRepair.help() для справки');
}
