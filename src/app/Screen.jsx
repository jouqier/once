import { useEffect, useLayoutEffect, useState } from 'react';
import TMDBService from '../services/tmdb.js';
import { API_CONFIG } from '../config/api.js';
import { LegacyScreen } from './LegacyScreen.jsx';
import { DiscoverScreen } from './screens/discover.jsx';
import { SearchScreen } from './screens/search.jsx';
import { GenreScreen } from './screens/genre.jsx';
import { PersonScreen } from './screens/person.jsx';
import { ProfileScreen } from './screens/profile.jsx';

// В v1 каждое событие навигации пересоздавало экран. Каждое событие несёт новый объект state,
// поэтому ключ по объекту даёт то же поведение, даже если тег не поменялся.
const screenKeys = new WeakMap();
let nextScreenKey = 0;

function keyFor(state) {
    if (!screenKeys.has(state)) {
        screenKeys.set(state, ++nextScreenKey);
    }
    return screenKeys.get(state);
}

function TabScreen({ state }) {
    const isSearch = state.name === 'search';
    const isDiscover = state.name === 'movies' || state.name === 'tv';
    const isProfile = state.name === 'profile';

    useLayoutEffect(() => {
        if (isProfile || isSearch || isDiscover) window.scrollTo(0, 0);
    }, [isProfile, isSearch, isDiscover]);

    if (isSearch) return <SearchScreen />;
    if (isDiscover) return <DiscoverScreen kind={state.name} />;
    if (isProfile) return <ProfileScreen state={state} />;

    console.error('Unknown screen:', state.name);
    return null;
}

function DetailsScreen({ state }) {
    const { mediaId } = state;
    const mediaType = state.mediaType === undefined ? 'movie' : state.mediaType;
    const [movie, setMovie] = useState(null);

    useEffect(() => {
        let cancelled = false;

        TMDBService.getFullMovieInfo(mediaId, mediaType)
            .then((data) => {
                if (cancelled) return;
                const movieData = { ...data, media_type: mediaType };
                if (movieData.backdrop_path) {
                    document.documentElement.style.setProperty(
                        '--movie-backdrop',
                        `url(${API_CONFIG.IMAGE_BASE_URL.replace('/w500', '/original')}${movieData.backdrop_path})`
                    );
                }
                setMovie(movieData);
            })
            .catch((error) => {
                console.error('Ошибка при показе деталей:', error);
            });

        return () => {
            cancelled = true;
        };
    }, [mediaId, mediaType]);

    useLayoutEffect(() => {
        if (movie) window.scrollTo(0, 0);
    }, [movie]);

    if (!movie) return null;

    return (
        <LegacyScreen
            tag={mediaType === 'movie' ? 'movie-card-details' : 'tv-show-card-details'}
            props={{ movie }}
        />
    );
}

function ScreenContent({ state }) {
    switch (state.type) {
        case 'tab':
            return <TabScreen state={state} />;
        case 'details':
            return <DetailsScreen state={state} />;
        case 'person':
            return <PersonScreen state={state} />;
        case 'genre':
            return <GenreScreen state={state} />;
        default:
            return null;
    }
}

export function Screen({ state }) {
    if (!state) return null;
    return <ScreenContent key={keyFor(state)} state={state} />;
}
