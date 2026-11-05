import { useCallback, useSyncExternalStore } from 'react';
import { userDataStore } from '../../services/user-data-store.js';
import { userFollowingService } from '../../services/user-following.js';

// Сервисы на каждый вызов отдают новый массив, а useSyncExternalStore требует,
// чтобы снимок между событиями не менялся. Поэтому прочитанное кладём в кэш
// и сбрасываем его только по событию сервиса.
//
// Смена пользователя (tg-user-data-updated): сервисы подменяют адаптер и заново
// инициализируются, но ни movie-list-changed, ни following-list-changed не шлют.
// Их обработчики стоят раньше нашего (модули сервисов импортируются выше), поэтому
// к моменту нашего слушателя _initialized уже сброшен в false. Промис init() наружу
// не отдаётся, так что ждём, пока сервис сам выставит _initialized обратно в true,
// и перечитываем списки ещё раз. Сами сервисы не меняем.
const INIT_POLL_MS = 50;
const INIT_POLL_LIMIT = 200;

function whenInitialized(service, callback) {
    let attempts = 0;
    const check = () => {
        if (service._initialized || ++attempts > INIT_POLL_LIMIT) {
            callback();
        } else {
            setTimeout(check, INIT_POLL_MS);
        }
    };
    check();
}

function createStore(eventName, read, service) {
    const cache = new Map();
    const listeners = new Set();

    const refresh = () => {
        cache.clear();
        listeners.forEach((listener) => listener());
    };

    document.addEventListener(eventName, refresh);
    document.addEventListener('tg-user-data-updated', () => {
        refresh();
        whenInitialized(service, refresh);
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
    kind === 'movies' ? userDataStore.getMovies(type) : userDataStore.getTVShows(type),
    userDataStore
);

const followingStore = createStore('following-list-changed', () =>
    userFollowingService.getFollowingList(),
    userFollowingService
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
