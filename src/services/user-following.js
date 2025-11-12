import TMDBService from './tmdb.js';

/**
 * Сервис для управления подписками на персон
 * Хранит только ID персон в localStorage
 */
class UserFollowingService {
    constructor() {
        this._storageKey = 'user_following';
        this._userId = null;
        this._initUserId();
        
        // Добавляем обработчик обновления данных пользователя
        document.addEventListener('tg-user-data-updated', () => {
            this._initUserId();
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
        
        this._userId = userId;
    }

    _getStorageKey() {
        return `${this._storageKey}_${this._userId}`;
    }

    /**
     * Получить список ID подписанных персон
     * @returns {number[]} Массив ID персон
     */
    getFollowingList() {
        try {
            const data = localStorage.getItem(this._getStorageKey());
            if (data) {
                const parsed = JSON.parse(data);
                return Array.isArray(parsed) ? parsed : [];
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
        try {
            localStorage.setItem(this._getStorageKey(), JSON.stringify(list));
            
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

