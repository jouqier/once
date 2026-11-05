import { useCallback, useSyncExternalStore } from 'react';
import { userDataStore } from '../../services/user-data-store.js';
import { userFollowingService } from '../../services/user-following.js';

// Сервисы на каждый вызов отдают новый массив, а useSyncExternalStore требует,
// чтобы снимок между событиями не менялся. Поэтому прочитанное кладём в кэш
// и сбрасываем его только по событию сервиса.
function createStore(eventName, read) {
    const cache = new Map();
    const listeners = new Set();

    document.addEventListener(eventName, () => {
        cache.clear();
        listeners.forEach((listener) => listener());
    });

    return {
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        get(key, ...args) {
            if (!cache.has(key)) {
                cache.set(key, read(...args));
            }
            return cache.get(key);
        },
    };
}

const listStore = createStore('movie-list-changed', (kind, type) =>
    kind === 'movies' ? userDataStore.getMovies(type) : userDataStore.getTVShows(type)
);

const followingStore = createStore('following-list-changed', () =>
    userFollowingService.getFollowingList()
);

// kind: 'movies' | 'tv', type: 'want' | 'watching' | 'watched'
export function useUserList(kind, type) {
    const getSnapshot = useCallback(
        () => listStore.get(`${kind}:${type}`, kind, type),
        [kind, type]
    );
    return useSyncExternalStore(listStore.subscribe, getSnapshot);
}

export function useFollowing() {
    return useSyncExternalStore(followingStore.subscribe, getFollowingSnapshot);
}

function getFollowingSnapshot() {
    return followingStore.get('following');
}
