class TrailersStore {
    constructor() {
        this._storageKey = 'watched_trailers';
        this._watchedTrailers = new Set(this._loadWatchedTrailers());
    }

    _loadWatchedTrailers() {
        try {
            return JSON.parse(localStorage.getItem(this._storageKey)) || [];
        } catch {
            return [];
        }
    }

    _saveWatchedTrailers() {
        localStorage.setItem(this._storageKey, JSON.stringify([...this._watchedTrailers]));
    }

    markAsWatched(trailerId) {
        this._watchedTrailers.add(trailerId);
        this._saveWatchedTrailers();
    }

    isWatched(trailerId) {
        return this._watchedTrailers.has(trailerId);
    }
}

export const trailersStore = new TrailersStore(); 