/**
 * Миграция старого кеша на новую систему
 * Запускается один раз при обновлении приложения
 */

import { cacheStrategy } from './cache-strategy.js';

class CacheMigration {
    constructor() {
        this.MIGRATION_VERSION = '1.3';
        this.MIGRATION_KEY = 'cache_migration_version';
    }

    /**
     * Проверить, нужна ли миграция
     */
    needsMigration() {
        const currentVersion = localStorage.getItem(this.MIGRATION_KEY);
        return currentVersion !== this.MIGRATION_VERSION;
    }

    /**
     * Выполнить миграцию
     */
    migrate() {
        if (!this.needsMigration()) {
            console.log('Cache migration not needed');
            return;
        }

        console.log('Starting cache migration...');

        try {
            // Шаг 1: Удалить старый кеш сериалов
            this._removeOldTVShowsCache();

            // Шаг 2: Очистить старые ключи кеша (если были)
            this._cleanupOldCacheKeys();

            // Шаг 3: Сохранить версию миграции
            localStorage.setItem(this.MIGRATION_KEY, this.MIGRATION_VERSION);

            console.log('✓ Cache migration completed successfully');
        } catch (error) {
            console.error('Cache migration failed:', error);
            // Не критично - продолжаем работу
        }
    }

    /**
     * Удалить старый кеш сериалов
     */
    _removeOldTVShowsCache() {
        const oldKey = 'tvShowsData';
        if (localStorage.getItem(oldKey)) {
            localStorage.removeItem(oldKey);
            console.log('✓ Removed old tvShowsData cache');
        }
    }

    /**
     * Очистить старые ключи кеша
     */
    _cleanupOldCacheKeys() {
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            // Удаляем все ключи, которые не являются:
            // - user_data_*
            // - cache_*
            // - cache_migration_version
            // - app_launched
            if (key && 
                !key.startsWith('user_data_') && 
                !key.startsWith('cache_') &&
                key !== 'cache_migration_version' &&
                key !== 'app_launched') {
                
                // Это может быть старый кеш - удаляем
                keysToRemove.push(key);
            }
        }

        if (keysToRemove.length > 0) {
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });
            console.log(`✓ Cleaned up ${keysToRemove.length} old cache keys`);
        }
    }

    /**
     * Получить статистику хранилища
     */
    getStorageStats() {
        let userDataSize = 0;
        let cacheSize = 0;
        let otherSize = 0;
        let userDataCount = 0;
        let cacheCount = 0;
        let otherCount = 0;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;

            const value = localStorage.getItem(key);
            const size = (key.length + (value?.length || 0)) * 2; // UTF-16

            if (key.startsWith('user_data_')) {
                userDataSize += size;
                userDataCount++;
            } else if (key.startsWith('cache_')) {
                cacheSize += size;
                cacheCount++;
            } else {
                otherSize += size;
                otherCount++;
            }
        }

        const totalSize = userDataSize + cacheSize + otherSize;

        return {
            total: {
                size: totalSize,
                sizeKB: (totalSize / 1024).toFixed(2),
                count: localStorage.length
            },
            userData: {
                size: userDataSize,
                sizeKB: (userDataSize / 1024).toFixed(2),
                count: userDataCount,
                percentage: totalSize > 0 ? ((userDataSize / totalSize) * 100).toFixed(1) : 0
            },
            cache: {
                size: cacheSize,
                sizeKB: (cacheSize / 1024).toFixed(2),
                count: cacheCount,
                percentage: totalSize > 0 ? ((cacheSize / totalSize) * 100).toFixed(1) : 0
            },
            other: {
                size: otherSize,
                sizeKB: (otherSize / 1024).toFixed(2),
                count: otherCount,
                percentage: totalSize > 0 ? ((otherSize / totalSize) * 100).toFixed(1) : 0
            }
        };
    }

    /**
     * Вывести статистику в консоль
     */
    printStorageStats() {
        const stats = this.getStorageStats();
        
        console.log('📊 Storage Statistics:');
        console.log('─────────────────────────────────────');
        console.log(`Total: ${stats.total.sizeKB} KB (${stats.total.count} items)`);
        console.log('');
        console.log(`🔴 User Data: ${stats.userData.sizeKB} KB (${stats.userData.count} items) - ${stats.userData.percentage}%`);
        console.log(`   ↳ CRITICAL - Never delete`);
        console.log('');
        console.log(`🟡 Cache: ${stats.cache.sizeKB} KB (${stats.cache.count} items) - ${stats.cache.percentage}%`);
        console.log(`   ↳ Safe to delete`);
        console.log('');
        if (stats.other.count > 0) {
            console.log(`⚪ Other: ${stats.other.sizeKB} KB (${stats.other.count} items) - ${stats.other.percentage}%`);
        }
        console.log('─────────────────────────────────────');
    }

    /**
     * Очистить только кеш (безопасно)
     */
    clearCacheOnly() {
        const beforeStats = this.getStorageStats();
        
        cacheStrategy.clearAll({ persistent: true });
        
        const afterStats = this.getStorageStats();
        const freedKB = (beforeStats.cache.size - afterStats.cache.size) / 1024;
        
        console.log(`✓ Cleared cache: freed ${freedKB.toFixed(2)} KB`);
        console.log(`✓ User data preserved: ${afterStats.userData.sizeKB} KB`);
    }
}

export const cacheMigration = new CacheMigration();

// Глобальные функции для отладки
if (typeof window !== 'undefined') {
    window.cacheDebug = {
        stats: () => cacheMigration.printStorageStats(),
        clear: () => cacheMigration.clearCacheOnly(),
        migrate: () => cacheMigration.migrate()
    };
}
