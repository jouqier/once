/**
 * Утилита для диагностики и ремонта данных пользователя
 * Можно вызвать из консоли браузера для отладки
 */

import { dataMigrationService } from './data-migration.js';

class DataRepairUtility {
    /**
     * Проверяет состояние данных пользователя
     */
    diagnose(userId = null) {
        const storageKey = userId ? `user_data_${userId}` : this._findUserDataKey();
        
        if (!storageKey) {
            console.error('❌ Не найдены данные пользователя в localStorage');
            return null;
        }

        console.log(`🔍 Проверка данных: ${storageKey}`);
        
        try {
            const rawData = localStorage.getItem(storageKey);
            if (!rawData) {
                console.error('❌ Данные пусты');
                return null;
            }

            const data = JSON.parse(rawData);
            const report = {
                version: data.version || 'не указана',
                needsMigration: dataMigrationService.needsMigration(data),
                issues: []
            };

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
                if (!data.tvShows.reviews || typeof data.tvShows.reviews !== 'object') {
                    report.issues.push('⚠️ tvShows.reviews не является объектом');
                }

                // Статистика
                report.tvShowsStats = {
                    episodeKeys: data.tvShows.episodes ? Object.keys(data.tvShows.episodes).length : 'N/A',
                    seasonReviews: data.tvShows.seasonReviews ? Object.keys(data.tvShows.seasonReviews).length : 'N/A',
                    reviews: data.tvShows.reviews ? Object.keys(data.tvShows.reviews).length : 'N/A'
                };
            }

            // Проверяем activity
            if (!Array.isArray(data.activity)) {
                report.issues.push('⚠️ activity не является массивом');
            } else {
                report.activityCount = data.activity.length;
            }

            // Проверяем search
            if (!data.search || !Array.isArray(data.search.recent)) {
                report.issues.push('⚠️ search.recent не является массивом');
            } else {
                report.recentSearchCount = data.search.recent.length;
            }

            // Вывод отчета
            console.log('\n📊 ОТЧЕТ О СОСТОЯНИИ ДАННЫХ:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`Версия: ${report.version}`);
            console.log(`Требуется миграция: ${report.needsMigration ? '✅ Да' : '❌ Нет'}`);
            
            if (report.moviesStats) {
                console.log('\n🎬 Фильмы:');
                console.log(`  Want: ${report.moviesStats.want}`);
                console.log(`  Watched: ${report.moviesStats.watched}`);
                console.log(`  Watching: ${report.moviesStats.watching}`);
                console.log(`  Reviews: ${report.moviesStats.reviews}`);
            }

            if (report.tvShowsStats) {
                console.log('\n📺 Сериалы:');
                console.log(`  Episode keys: ${report.tvShowsStats.episodeKeys}`);
                console.log(`  Season reviews: ${report.tvShowsStats.seasonReviews}`);
                console.log(`  Reviews: ${report.tvShowsStats.reviews}`);
            }

            if (report.activityCount !== undefined) {
                console.log(`\n📝 Активность: ${report.activityCount} записей`);
            }

            if (report.recentSearchCount !== undefined) {
                console.log(`🔍 Недавние поиски: ${report.recentSearchCount} записей`);
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
     * Исправляет данные пользователя
     */
    repair(userId = null, backup = true) {
        const storageKey = userId ? `user_data_${userId}` : this._findUserDataKey();
        
        if (!storageKey) {
            console.error('❌ Не найдены данные пользователя');
            return false;
        }

        console.log(`🔧 Начинаем ремонт данных: ${storageKey}`);

        try {
            const rawData = localStorage.getItem(storageKey);
            if (!rawData) {
                console.error('❌ Данные пусты');
                return false;
            }

            // Создаем резервную копию
            if (backup) {
                const backupKey = `${storageKey}_backup_${Date.now()}`;
                localStorage.setItem(backupKey, rawData);
                console.log(`💾 Резервная копия создана: ${backupKey}`);
            }

            const data = JSON.parse(rawData);
            
            // Применяем миграцию
            const repairedData = dataMigrationService.migrate(data);
            
            // Сохраняем исправленные данные
            localStorage.setItem(storageKey, JSON.stringify(repairedData));
            
            console.log('✅ Данные успешно исправлены!');
            console.log('🔄 Перезагрузите страницу для применения изменений');
            
            return true;
        } catch (error) {
            console.error('❌ Ошибка при ремонте данных:', error);
            return false;
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
