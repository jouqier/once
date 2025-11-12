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
                // При popstate браузер уже вернулся к определенному состоянию
                // Нужно синхронизировать _navigationStack с browser history
                // Ищем это состояние в стеке (с конца, чтобы найти последнее вхождение)
                let stateIndex = -1;
                for (let i = this._navigationStack.length - 1; i >= 0; i--) {
                    const s = this._navigationStack[i];
                    if (s.type === event.state.type && 
                        (s.name === event.state.name || 
                         s.mediaId === event.state.mediaId || 
                         s.personId === event.state.personId || 
                         s.genreId === event.state.genreId)) {
                        stateIndex = i;
                        break;
                    }
                }
                
                if (stateIndex !== -1) {
                    // Обрезаем стек до найденного состояния (включительно)
                    this._navigationStack = this._navigationStack.slice(0, stateIndex + 1);
                } else {
                    // Состояние не найдено в стеке - удаляем последний элемент
                    if (this._navigationStack.length > 0) {
                        this._popState();
                    }
                }
                
                this._dispatchNavigationEvent(event.state);
            } else {
                // event.state === null - вернулись к начальному состоянию
                const state = {
                    type: 'tab',
                    name: this._currentTab
                };
                this._navigationStack = [];
                this._dispatchNavigationEvent(state);
            }
        });
    }

    get currentTab() {
        return this._currentTab;
    }

    _pushState(state) {
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
        return this._navigationStack[this._navigationStack.length - 2];
    }

    canGoBack() {
        // Можем вернуться назад если:
        // 1. Есть модальные окна
        // 2. В навигационном стеке больше 1 элемента
        return this._modalStack.length > 0 || 
               this._navigationStack.length > 1;
    }

    goBack() {
        // Обрабатываем модальные окна отдельно (они не в browser history)
        if (this._modalStack.length > 0) {
            const modal = this._modalStack.pop();
            modal.remove();
            return true;
        }

        // Проверяем, можем ли вернуться назад
        if (this._navigationStack.length <= 1) {
            return false;
        }
        
        // Вызываем browser back - popstate обработчик сделает всю работу
        window.history.back();
        return true;
    }

    navigateToTab(tab, skipTabBar = true) {
        const url = new URL(window.location);
        url.searchParams.delete('id');
        url.searchParams.delete('name');
        url.searchParams.delete('from');
        url.searchParams.delete('type');
        
        const state = {
            type: 'tab',
            name: tab
        };
        
        window.history.pushState(state, '', url);

        while (this._modalStack.length > 0) {
            const modal = this._modalStack.pop();
            modal.remove();
        }

        // Очищаем стек и добавляем только tab state
        this._navigationStack = [state];
        
        this._dispatchNavigationEvent(state);
    }

    navigateToDetails(mediaId, mediaType, sourceTab) {
        const state = {
            type: 'details',
            mediaId,
            mediaType,
            sourceTab: sourceTab || this._currentTab
        };
        
        // Проверяем дубликат ПЕРЕД добавлением в browser history
        const lastState = this._navigationStack[this._navigationStack.length - 1];
        if (lastState?.type === 'details' && 
            lastState.mediaId === mediaId && 
            lastState.mediaType === mediaType) {
            return;
        }
        
        const url = new URL(window.location);
        url.searchParams.set('id', mediaId);
        url.searchParams.set('type', mediaType);
        window.history.pushState(state, '', url);
        
        this._pushState(state);
        this._dispatchNavigationEvent(state);
    }

    navigateToGenre(genreId, genreName, from, type) {
        const state = {
            type: 'genre',
            genreId,
            genreName,
            from,
            mediaType: type
        };
        
        // Проверяем дубликат ПЕРЕД добавлением в browser history
        const lastState = this._navigationStack[this._navigationStack.length - 1];
        if (lastState?.type === 'genre' && lastState.genreId === genreId) {
            return;
        }
        
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
        const state = {
            type: 'person',
            personId
        };
        
        // Проверяем дубликат ПЕРЕД добавлением в browser history
        const lastState = this._navigationStack[this._navigationStack.length - 1];
        if (lastState?.type === 'person' && lastState.personId === personId) {
            return;
        }
        
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
}

export const navigationManager = new NavigationManager();