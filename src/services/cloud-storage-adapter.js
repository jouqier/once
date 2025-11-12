/**
 * CloudStorageAdapter - обертка над Telegram CloudStorage API
 * Преобразует callback-based API в Promise-based API
 * 
 * Ограничения Telegram CloudStorage:
 * - Максимум 1024 ключа на пользователя
 * - Размер значения: 0-4096 символов
 * - Формат ключа: A-Z, a-z, 0-9, _, -
 */

const MAX_VALUE_SIZE = 4096; // Лимит CloudStorage

class CloudStorageAdapter {
    /**
     * Проверяет доступность CloudStorage
     * @returns {boolean}
     */
    static isAvailable() {
        return !!(
            window.Telegram?.WebApp?.CloudStorage &&
            typeof window.Telegram.WebApp.CloudStorage.getItem === 'function' &&
            typeof window.Telegram.WebApp.CloudStorage.setItem === 'function'
        );
    }

    /**
     * Получить значение по ключу
     * @param {string} key - Ключ
     * @returns {Promise<string | null>}
     */
    async getItem(key) {
        if (!CloudStorageAdapter.isAvailable()) {
            throw new Error('CloudStorage недоступен');
        }

        return new Promise((resolve, reject) => {
            try {
                window.Telegram.WebApp.CloudStorage.getItem(key, (error, value) => {
                    if (error) {
                        console.error(`Ошибка чтения ключа ${key} из CloudStorage:`, error);
                        reject(error);
                    } else {
                        resolve(value || null);
                    }
                });
            } catch (error) {
                console.error(`Исключение при чтении ключа ${key}:`, error);
                reject(error);
            }
        });
    }

    /**
     * Сохранить значение по ключу
     * @param {string} key - Ключ
     * @param {string} value - Значение (строка)
     * @returns {Promise<boolean>}
     */
    async setItem(key, value) {
        if (!CloudStorageAdapter.isAvailable()) {
            throw new Error('CloudStorage недоступен');
        }

        // Проверка размера значения
        if (value.length > MAX_VALUE_SIZE) {
            const error = new Error(
                `Значение ключа ${key} превышает лимит CloudStorage: ${value.length} > ${MAX_VALUE_SIZE}`
            );
            console.error(error.message);
            throw error;
        }

        return new Promise((resolve, reject) => {
            try {
                window.Telegram.WebApp.CloudStorage.setItem(key, value, (error, success) => {
                    if (error) {
                        console.error(`Ошибка записи ключа ${key} в CloudStorage:`, error);
                        reject(error);
                    } else {
                        resolve(success);
                    }
                });
            } catch (error) {
                console.error(`Исключение при записи ключа ${key}:`, error);
                reject(error);
            }
        });
    }

    /**
     * Удалить ключ
     * @param {string} key - Ключ
     * @returns {Promise<boolean>}
     */
    async removeItem(key) {
        if (!CloudStorageAdapter.isAvailable()) {
            throw new Error('CloudStorage недоступен');
        }

        return new Promise((resolve, reject) => {
            try {
                window.Telegram.WebApp.CloudStorage.removeItem(key, (error, success) => {
                    if (error) {
                        console.error(`Ошибка удаления ключа ${key} из CloudStorage:`, error);
                        reject(error);
                    } else {
                        resolve(success);
                    }
                });
            } catch (error) {
                console.error(`Исключение при удалении ключа ${key}:`, error);
                reject(error);
            }
        });
    }

    /**
     * Получить все ключи
     * @returns {Promise<string[]>}
     */
    async getKeys() {
        if (!CloudStorageAdapter.isAvailable()) {
            throw new Error('CloudStorage недоступен');
        }

        return new Promise((resolve, reject) => {
            try {
                window.Telegram.WebApp.CloudStorage.getKeys((error, keys) => {
                    if (error) {
                        console.error('Ошибка получения ключей из CloudStorage:', error);
                        reject(error);
                    } else {
                        resolve(keys || []);
                    }
                });
            } catch (error) {
                console.error('Исключение при получении ключей:', error);
                reject(error);
            }
        });
    }
}

export { CloudStorageAdapter };

