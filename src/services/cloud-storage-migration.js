/**
 * CloudStorageMigration - миграция данных из localStorage в CloudStorage
 */

import { CloudStorageAdapter } from './cloud-storage-adapter.js';

class CloudStorageMigration {
    /**
     * Мигрировать данные пользователя из localStorage в CloudStorage
     * @param {string} userId - ID пользователя
     * @returns {Promise<boolean>} - true если миграция успешна
     */
    async migrateToCloudStorage(userId) {
        // Проверяем доступность CloudStorage
        if (!CloudStorageAdapter.isAvailable()) {
            console.log('CloudStorage недоступен, миграция не требуется');
            return false;
        }

        const cloudAdapter = new CloudStorageAdapter();
        const prefix = `user_${userId}_`;
        const migrationFlagKey = `${prefix}migrated`;

        try {
            // Проверяем, была ли уже выполнена миграция
            const migrationFlag = await cloudAdapter.getItem(migrationFlagKey);
            if (migrationFlag === 'true') {
                console.log('Миграция уже выполнена ранее');
                return true;
            }

            // Получаем все ключи из localStorage с префиксом пользователя
            const localStorageKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) {
                    localStorageKeys.push(key);
                }
            }
            
            // Также добавляем старый формат подписок (user_following_{userId})
            const oldFollowingKey = `user_following_${userId}`;
            if (localStorage.getItem(oldFollowingKey) && !localStorageKeys.includes(oldFollowingKey)) {
                // Конвертируем в новый формат ключа
                const newFollowingKey = `${prefix}following`;
                if (!localStorageKeys.includes(newFollowingKey)) {
                    // Временно добавляем старый ключ для миграции
                    const oldData = localStorage.getItem(oldFollowingKey);
                    if (oldData) {
                        localStorage.setItem(newFollowingKey, oldData);
                        localStorageKeys.push(newFollowingKey);
                    }
                }
            }

            if (localStorageKeys.length === 0) {
                console.log('Нет данных для миграции');
                // Помечаем миграцию как выполненную
                await cloudAdapter.setItem(migrationFlagKey, 'true');
                return true;
            }

            console.log(`Найдено ${localStorageKeys.length} ключей для миграции`);

            // Проверяем, есть ли данные в CloudStorage
            const cloudKeys = await cloudAdapter.getKeys();
            const cloudUserKeys = cloudKeys.filter(key => key.startsWith(prefix));
            
            if (cloudUserKeys.length > 0) {
                console.log(`В CloudStorage уже есть ${cloudUserKeys.length} ключей, пропускаем миграцию`);
                // Помечаем миграцию как выполненную
                await cloudAdapter.setItem(migrationFlagKey, 'true');
                return true;
            }

            // Мигрируем данные
            let migratedCount = 0;
            let failedCount = 0;

            for (const key of localStorageKeys) {
                try {
                    const value = localStorage.getItem(key);
                    if (value) {
                        // Проверяем размер значения
                        if (value.length > 4096) {
                            console.warn(`⚠️ Ключ ${key} превышает лимит CloudStorage (${value.length} символов), пропускаем`);
                            failedCount++;
                            continue;
                        }

                        await cloudAdapter.setItem(key, value);
                        migratedCount++;
                    }
                } catch (error) {
                    console.error(`Ошибка миграции ключа ${key}:`, error);
                    failedCount++;
                }
            }

            console.log(`✅ Миграция завершена: ${migratedCount} успешно, ${failedCount} ошибок`);

            // Валидация: проверяем количество ключей после миграции
            const cloudKeysAfter = await cloudAdapter.getKeys();
            const cloudUserKeysAfter = cloudKeysAfter.filter(key => key.startsWith(prefix));
            
            if (cloudUserKeysAfter.length >= migratedCount) {
                // Помечаем миграцию как выполненную
                await cloudAdapter.setItem(migrationFlagKey, 'true');
                console.log('✅ Миграция успешно завершена и проверена');
                return true;
            } else {
                console.warn(`⚠️ Валидация миграции не прошла: ожидалось ${migratedCount}, получено ${cloudUserKeysAfter.length}`);
                return false;
            }
        } catch (error) {
            console.error('Ошибка миграции в CloudStorage:', error);
            return false;
        }
    }

    /**
     * Проверить, была ли выполнена миграция
     * @param {string} userId - ID пользователя
     * @returns {Promise<boolean>}
     */
    async isMigrated(userId) {
        if (!CloudStorageAdapter.isAvailable()) {
            return false;
        }

        const cloudAdapter = new CloudStorageAdapter();
        const migrationFlagKey = `user_${userId}_migrated`;

        try {
            const flag = await cloudAdapter.getItem(migrationFlagKey);
            return flag === 'true';
        } catch (error) {
            console.error('Ошибка проверки флага миграции:', error);
            return false;
        }
    }
}

export const cloudStorageMigration = new CloudStorageMigration();

