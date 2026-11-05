import { useLayoutEffect } from 'react';
import { DetailsScreen } from './screens/details.jsx';
import { DiscoverScreen } from './screens/discover.jsx';
import { SearchScreen } from './screens/search.jsx';
import { GenreScreen } from './screens/genre.jsx';
import { PersonScreen } from './screens/person.jsx';
import { ProfileScreen } from './screens/profile.jsx';
import { ErrorBoundary } from './components/error-boundary.jsx';

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

    // Перенесено из v1 как есть. Прокручивается body (html overflow: hidden), поэтому
    // window.scrollTo ничего не делает и новая вкладка открывается на позиции body предыдущей.
    useLayoutEffect(() => {
        if (isProfile || isSearch || isDiscover) window.scrollTo(0, 0);
    }, [isProfile, isSearch, isDiscover]);

    if (isSearch) return <SearchScreen />;
    if (isDiscover) return <DiscoverScreen kind={state.name} />;
    if (isProfile) return <ProfileScreen state={state} />;

    console.error('Unknown screen:', state.name);
    return null;
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
    const key = keyFor(state);
    // Граница с тем же ключом, что и экран: переход на другой экран сбрасывает ошибку
    return (
        <ErrorBoundary key={key}>
            <ScreenContent state={state} />
        </ErrorBoundary>
    );
}
