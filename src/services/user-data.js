class UserDataStore {
    constructor() {
        this._store = this._loadFromStorage();
    }

    _loadFromStorage() {
        const data = localStorage.getItem('user_data');
        if (!data) {
            return this._getInitialStore();
        }
        return JSON.parse(data);
    }

    _getInitialStore() {
        return {
            version: "1.0",
            userId: "guest",
            movies: {},
            tvShows: {
                episodes: {},
                seasonReviews: {}
            },
            search: {
                recent: []
            }
        };
    }

    _saveToStorage() {
        localStorage.setItem('user_data', JSON.stringify(this._store));
    }

    _isInWantList(contentId, contentType) {
        if (contentType === 'movie') {
            return this._store.movies[contentId]?.want || false;
        } else if (contentType === 'tv') {
            // Для сериалов проверяем наличие в списке want
            const wantList = this._store.tvShows?.want || [];
            return Array.isArray(wantList) ? wantList.includes(contentId) : false;
        }
        return false;
    }

    _isInWatchedList(contentId, contentType) {
        if (contentType === 'movie') {
            return this._store.movies[contentId]?.watched || false;
        } else if (contentType === 'tv') {
            // Для сериала проверяем наличие просмотренных эпизодов
            const episodes = this._store.tvShows.episodes[contentId] || {};
            return Object.values(episodes).some(e => e.watched);
        }
        return false;
    }

    // Обновляем метод удаления из списка want
    removeFromWantList(contentId, contentType) {
        if (contentType === 'movie') {
            if (this._store.movies[contentId]) {
                this._store.movies[contentId].want = false;
            }
        } else if (contentType === 'tv') {
            // Для сериалов удаляем из списка want
            const wantList = this._store.tvShows?.want || [];
            if (Array.isArray(wantList)) {
                const index = wantList.indexOf(contentId);
                if (index > -1) {
                    wantList.splice(index, 1);
                    this._store.tvShows.want = wantList;
                }
            }
        }
        this._saveToStorage();
        this.removeActivitiesByContent(contentId, contentType);
    }

    // Обновляем метод удаления из списка watched
    removeFromWatchedList(contentId, contentType) {
        if (contentType === 'movie') {
            if (this._store.movies[contentId]) {
                this._store.movies[contentId].watched = false;
            }
        } else if (contentType === 'tv') {
            const episodes = this._store.tvShows.episodes[contentId] || {};
            Object.keys(episodes).forEach(episodeKey => {
                episodes[episodeKey].watched = false;
            });
            this._store.tvShows.episodes[contentId] = episodes;
        }
        this._saveToStorage();
        this.removeActivitiesByContent(contentId, contentType);
    }

    // ... остальные методы класса ...
}

export const userDataStore = new UserDataStore(); 