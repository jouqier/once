import { TG } from './telegram.js';

export class NavigationManager {
    constructor() {
        this._currentTab = 'movies';
        this._navigationStack = [];
        this._modalStack = [];
        
        window.addEventListener('popstate', (event) => {
            if (this._modalStack.length > 0) {
                const modal = this._modalStack.pop();
                modal.remove();
                return;
            }
            
            if (event.state) {
                // Синхронизируем стек с историей браузера
                this._syncStackWithHistory(event.state);
                this._dispatchNavigationEvent(event.state);
            } else {
                this.goBack();
            }
        });
    }

    get currentTab() {
        return this._currentTab;
    }

    _pushState(state) {
        const lastState = this._navigationStack[this._navigationStack.length - 1];
        
        // Проверяем, не является ли новое состояние дубликатом предыдущего
        if (lastState && lastState.type === state.type) {
            if (state.type === 'details' && 
                lastState.mediaId === state.mediaId && 
                lastState.mediaType === state.mediaType) {
                return;
            }
            if (state.type === 'genre' && 
                lastState.genreId === state.genreId && 
                lastState.mediaType === state.mediaType) {
                return;
            }
            if (state.type === 'person' && 
                lastState.personId === state.personId) {
                return;
            }
        }

        if (this._navigationStack.length === 0) {
            const tabState = {
                type: 'tab',
                name: this._currentTab
            };
            this._navigationStack.push(tabState);
        }
        
        this._navigationStack.push(state);
    }

    _popState() {
        return this._navigationStack.pop();
    }

    _dispatchNavigationEvent(state) {
        if (state.type === 'tab') {
            this._currentTab = state.name;
        }
        window.dispatchEvent(new CustomEvent('navigation-changed', {
            detail: { state }
        }));
    }

    getPreviousState() {
        // Возвращаем предыдущее состояние (не текущее)
        if (this._navigationStack.length <= 1) {
            return null;
        }
        return this._navigationStack[this._navigationStack.length - 2];
    }

    getCurrentState() {
        // Возвращаем текущее состояние
        if (this._navigationStack.length === 0) {
            return null;
        }
        return this._navigationStack[this._navigationStack.length - 1];
    }

    goBack() {
        if (this._modalStack.length > 0) {
            const modal = this._modalStack.pop();
            modal.remove();
            return true;
        }

        if (this._navigationStack.length <= 1) {
            const state = {
                type: 'tab',
                name: this._currentTab
            };
            this._navigationStack = [state];
            this._dispatchNavigationEvent(state);
            return false;
        }
        
        // Удаляем текущее состояние
        const currentState = this._popState();
        
        // Если текущее состояние - это жанр или персона, удаляем экран из DOM
        if (currentState && (currentState.type === 'genre' || currentState.type === 'person')) {
            const container = document.querySelector('#movies-container');
            if (container) {
                const screen = container.querySelector(
                    currentState.type === 'genre' ? 'genre-screen' : 'person-screen'
                );
                if (screen) {
                    screen.remove();
                }
            }
        }
        
        // Получаем предыдущее состояние
        const previousState = this._navigationStack[this._navigationStack.length - 1];
        if (previousState) {
            this._dispatchNavigationEvent(previousState);
        } else {
            const state = {
                type: 'tab',
                name: this._currentTab
            };
            this._navigationStack = [state];
            this._dispatchNavigationEvent(state);
        }
        return true;
    }

    navigateToTab(tab, skipTabBar = true) {
        const url = new URL(window.location);
        url.searchParams.delete('id');
        url.searchParams.delete('name');
        url.searchParams.delete('from');
        url.searchParams.delete('type');
        window.history.pushState(null, '', url);

        while (this._modalStack.length > 0) {
            const modal = this._modalStack.pop();
            modal.remove();
        }

        this._navigationStack = [];
        
        const state = {
            type: 'tab',
            name: tab
        };
        this._dispatchNavigationEvent(state);
    }

    navigateToDetails(mediaId, mediaType, sourceTab) {
        // Очищаем экраны жанров и персон из DOM
        this._clearGenreAndPersonScreens();

        const state = {
            type: 'details',
            mediaId,
            mediaType,
            sourceTab: sourceTab || this._currentTab
        };
        
        const url = new URL(window.location);
        url.searchParams.set('id', mediaId);
        url.searchParams.set('type', mediaType);
        window.history.pushState(state, '', url);
        
        this._pushState(state);
        this._dispatchNavigationEvent(state);
    }

    navigateToGenre(genreId, genreName, from, type) {
        // Очищаем экраны жанров и персон из DOM
        this._clearGenreAndPersonScreens();

        const state = {
            type: 'genre',
            genreId,
            genreName,
            from,
            mediaType: type
        };
        
        const url = new URL(window.location);
        url.searchParams.set('id', genreId);
        url.searchParams.set('name', genreName);
        if (from) url.searchParams.set('from', from);
        if (type) url.searchParams.set('type', type);
        
        window.history.pushState(state, '', url);
        
        this._pushState(state);
        this._dispatchNavigationEvent(state);
    }

    navigateToPerson(personId) {
        // Очищаем экраны жанров и персон из DOM
        this._clearGenreAndPersonScreens();

        const state = {
            type: 'person',
            personId
        };
        
        const url = new URL(window.location);
        url.searchParams.set('id', personId);
        window.history.pushState(state, '', url);
        
        this._pushState(state);
        this._dispatchNavigationEvent(state);
    }

    pushModal(element) {
        this._modalStack.push(element);
        window.history.pushState(null, '', window.location.href);
    }

    removeModal(element) {
        const index = this._modalStack.indexOf(element);
        if (index !== -1) {
            this._modalStack.splice(index, 1);
        }
    }

    _clearGenreAndPersonScreens() {
        const container = document.querySelector('#movies-container');
        if (container) {
            const genreScreen = container.querySelector('genre-screen');
            const personScreen = container.querySelector('person-screen');
            if (genreScreen) genreScreen.remove();
            if (personScreen) personScreen.remove();
        }
    }

    _syncStackWithHistory(targetState) {
        // Находим индекс целевого состояния в стеке
        let targetIndex = -1;
        for (let i = this._navigationStack.length - 1; i >= 0; i--) {
            const state = this._navigationStack[i];
            if (this._statesMatch(state, targetState)) {
                targetIndex = i;
                break;
            }
        }

        if (targetIndex === -1) {
            // Если состояние не найдено в стеке, это может быть возврат на таб
            if (targetState.type === 'tab') {
                this._navigationStack = [targetState];
            } else {
                // Добавляем состояние в стек, если его там нет
                this._navigationStack.push(targetState);
            }
            return;
        }

        // Удаляем все состояния после целевого
        if (targetIndex < this._navigationStack.length - 1) {
            this._navigationStack = this._navigationStack.slice(0, targetIndex + 1);
        }

        // Убеждаемся, что целевое состояние - последнее в стеке
        if (this._navigationStack[this._navigationStack.length - 1] !== targetState) {
            // Обновляем последнее состояние, если оно не совпадает
            this._navigationStack[this._navigationStack.length - 1] = targetState;
        }
    }

    _statesMatch(state1, state2) {
        if (!state1 || !state2) return false;
        if (state1.type !== state2.type) return false;

        switch (state1.type) {
            case 'tab':
                return state1.name === state2.name;
            case 'details':
                return state1.mediaId === state2.mediaId && 
                       state1.mediaType === state2.mediaType;
            case 'genre':
                return state1.genreId === state2.genreId && 
                       state1.mediaType === state2.mediaType;
            case 'person':
                return state1.personId === state2.personId;
            default:
                return JSON.stringify(state1) === JSON.stringify(state2);
        }
    }
}

export const navigationManager = new NavigationManager();