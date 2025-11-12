import TMDBService from './tmdb.js';
import { StorageAdapter } from './storage-adapter.js';

/**
 * Сервис для управления подписками на персон
 * Использует StorageAdapter для синхронизации через CloudStorage
 */
class UserFollowingService {
    constructor() {
        this._userId = null;
        this._adapter = null;
        this._initialized = false;
        this._initUserId();
        
        // Добавляем обработчик обновления данных пользователя
        document.addEventListener('tg-user-data-updated', async () => {
            this._initUserId();
            this._initialized = false;
            await this.init();
        });
    }

    _initUserId() {
        // Пытаемся получить сохраненный ID пользователя из sessionStorage
        let userId = sessionStorage.getItem('user_id');
        
        // Если нет сохраненного ID, получаем из Telegram
        if (!userId) {
            userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
            if (userId) {
                sessionStorage.setItem('user_id', userId);
            } else {
                userId = 'guest';
            }
        }
        
        if (this._userId !== userId) {
            this._userId = userId;
            this._adapter = new StorageAdapter(userId);
            this._initialized = false;
        }
    }

    /**
     * Инициализировать адаптер (загрузить данные в кеш)
     */
    async init() {
        if (this._initialized || !this._adapter) {
            return;
        }

        try {
            await this._adapter.init();
            this._initialized = true;
        } catch (error) {
            console.error('Ошибка инициализации UserFollowingService:', error);
            this._initialized = true; // Помечаем как инициализированное, чтобы не блокировать работу
        }
    }

    _getStorageKey() {
        // Используем формат ключа StorageAdapter: user_{userId}_following
        return `following`;
    }

    /**
     * Получить список ID подписанных персон
     * @returns {number[]} Массив ID персон
     */
    getFollowingList() {
        if (!this._adapter) {
            this._initUserId();
            if (!this._adapter) {
                return [];
            }
        }

        try {
            const value = this._adapter.getValue(this._getStorageKey());
            
            if (value) {
                return Array.isArray(value) ? value : [];
            }
        } catch (error) {
            console.error('Ошибка получения списка подписок:', error);
        }
        return [];
    }

    /**
     * Сохранить список ID подписанных персон
     * @param {number[]} list - Массив ID персон
     */
    _saveFollowingList(list) {
        if (!this._adapter) {
            this._initUserId();
            if (!this._adapter) {
                return;
            }
        }

        try {
            // Используем публичный метод StorageAdapter для синхронизации через CloudStorage
            this._adapter.setValue(this._getStorageKey(), list);
            
            // Отправляем событие об изменении списка
            document.dispatchEvent(new CustomEvent('following-list-changed', {
                detail: { 
                    count: list.length,
                    timestamp: Date.now()
                },
                bubbles: true,
                composed: true
            }));
        } catch (error) {
            console.error('Ошибка сохранения списка подписок:', error);
        }
    }

    /**
     * Проверить, подписан ли пользователь на персону
     * @param {number} personId - ID персоны
     * @returns {boolean}
     */
    isFollowing(personId) {
        const list = this.getFollowingList();
        return list.includes(personId);
    }

    /**
     * Добавить персону в подписки
     * @param {number} personId - ID персоны
     */
    follow(personId) {
        if (!personId) {
            console.error('Попытка добавить персону без ID');
            return;
        }

        const list = this.getFollowingList();
        
        if (!list.includes(personId)) {
            // Добавляем в начало списка (последние сверху)
            list.unshift(personId);
            this._saveFollowingList(list);
        }
    }

    /**
     * Удалить персону из подписок
     * @param {number} personId - ID персоны
     */
    unfollow(personId) {
        const list = this.getFollowingList();
        const newList = list.filter(id => id !== personId);
        
        if (newList.length !== list.length) {
            this._saveFollowingList(newList);
        }
    }

    /**
     * Получить количество подписок
     * @returns {number}
     */
    getFollowingCount() {
        return this.getFollowingList().length;
    }

    /**
     * Получить детальную информацию о подписанных персонах
     * @returns {Promise<Array>} Массив объектов персон с деталями
     */
    async getFollowingWithDetails() {
        const ids = this.getFollowingList();
        if (ids.length === 0) return [];
        
        try {
            const persons = await Promise.all(
                ids.map(id => 
                    TMDBService.getPersonDetails(id)
                        .catch(error => {
                            console.error(`Ошибка загрузки персоны ${id}:`, error);
                            return null;
                        })
                )
            );
            
            return persons.filter(p => p !== null);
        } catch (error) {
            console.error('Ошибка загрузки деталей персон:', error);
            return [];
        }
    }
}

export const userFollowingService = new UserFollowingService();

