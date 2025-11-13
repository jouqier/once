import { TG } from './telegram.js';

export class NavigationManager {
    constructor() {
        this._currentTab = 'movies';
        this._navigationStack = [];
        this._modalStack = [];
        
        window.addEventListener('popstate', (event) => {
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
                    // Если найденное состояние - это последний элемент стека, значит мы остались на том же экране
                    // В этом случае нужно перейти к предыдущему состоянию
                    if (stateIndex === this._navigationStack.length - 1 && this._navigationStack.length > 1) {
                        // Удаляем текущее состояние и переходим к предыдущему
                        this._popState();
                        const previousState = this._navigationStack[this._navigationStack.length - 1];
                        console.log('[Navigation] popstate: остались на текущем экране, переходим к предыдущему', {
                            type: previousState.type,
                            mediaId: previousState.mediaId,
                            scrollPosition: previousState.scrollPosition,
                            stack: this._navigationStack.map(s => ({ 
                                type: s.type, 
                                name: s.name || s.mediaId || s.personId || s.genreId,
                                scrollPosition: s.scrollPosition 
                            }))
                        });
                        this._dispatchNavigationEvent(previousState);
                    } else {
                        // Обрезаем стек до найденного состояния (включительно)
                        // ВАЖНО: обрезаем ДО найденного состояния включительно, так как мы возвращаемся к нему
                        const oldStackLength = this._navigationStack.length;
                        this._navigationStack = this._navigationStack.slice(0, stateIndex + 1);
                        // Используем состояние из стека, чтобы сохранить scrollPosition
                        const stateFromStack = this._navigationStack[stateIndex];
                        console.log('[Navigation] popstate: восстановление состояния из стека', {
                            type: stateFromStack.type,
                            mediaId: stateFromStack.mediaId,
                            scrollPosition: stateFromStack.scrollPosition,
                            oldStackLength,
                            newStackLength: this._navigationStack.length,
                            stateIndex,
                            stack: this._navigationStack.map(s => ({ 
                                type: s.type, 
                                name: s.name || s.mediaId || s.personId || s.genreId,
                                scrollPosition: s.scrollPosition 
                            }))
                        });
                        this._dispatchNavigationEvent(stateFromStack);
                    }
                } else {
                    // Состояние не найдено в стеке - удаляем последний элемент и возвращаемся к предыдущему
                    if (this._navigationStack.length > 1) {
                        // Удаляем текущее состояние и возвращаемся к предыдущему
                        this._popState();
                        const previousState = this._navigationStack[this._navigationStack.length - 1];
                        console.log('[Navigation] popstate: состояние не найдено, возвращаемся к предыдущему', {
                            type: previousState.type,
                            scrollPosition: previousState.scrollPosition
                        });
                        this._dispatchNavigationEvent(previousState);
                    } else if (this._navigationStack.length === 1) {
                        // Осталось только одно состояние - удаляем его
                        this._popState();
                        this._dispatchNavigationEvent(event.state);
                    } else {
                        this._dispatchNavigationEvent(event.state);
                    }
                }
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
        // Сохраняем позицию скролла текущего экрана перед переходом
        // ВАЖНО: сохраняем ДО добавления нового состояния в стек
        this._saveCurrentScrollPosition();
        // Добавляем новое состояние в стек
        // НЕ сохраняем позицию скролла для нового состояния - оно должно начинаться с нуля
        this._navigationStack.push(state);
    }

    _getScrollPosition() {
        // Получаем позицию скролла с учетом того, что скролл может быть на body или window
        // В Telegram WebApp скролл обычно на body из-за overflow-y: auto
        return document.body.scrollTop || 
               document.documentElement.scrollTop || 
               window.scrollY || 
               window.pageYOffset || 
               0;
    }

    saveScrollPositionBeforeNavigation() {
        // Сохраняем позицию скролла ДО навигации (вызывается из обработчиков событий)
        // ВАЖНО: вызывать ДО вызова методов навигации
        if (this._navigationStack.length > 0) {
            const currentState = this._navigationStack[this._navigationStack.length - 1];
            const scrollY = this._getScrollPosition();
            currentState.scrollPosition = scrollY;
            console.log('[Navigation] Сохранена позиция скролла ПЕРЕД навигацией:', scrollY, 
                'body.scrollTop:', document.body.scrollTop,
                'documentElement.scrollTop:', document.documentElement.scrollTop,
                'window.scrollY:', window.scrollY,
                'для экрана:', currentState.type, currentState.name || currentState.mediaId || currentState.personId || currentState.genreId);
        } else {
            console.log('[Navigation] Не могу сохранить позицию скролла: стек пуст');
        }
    }

    _saveCurrentScrollPosition() {
        // Сохраняем позицию скролла для текущего экрана в стеке
        // ВАЖНО: вызывать ДО очистки контейнера или сброса скролла
        if (this._navigationStack.length > 0) {
            const currentState = this._navigationStack[this._navigationStack.length - 1];
            // Если позиция уже сохранена через saveScrollPositionBeforeNavigation, не перезаписываем
            if (currentState.scrollPosition === undefined) {
                const scrollY = this._getScrollPosition();
                currentState.scrollPosition = scrollY;
                console.log('[Navigation] Сохранена позиция скролла:', scrollY, 'для экрана:', currentState.type);
            }
            
            // Сохраняем позиции скролла табов и контента для профиля
            if (currentState.type === 'tab' && currentState.name === 'profile') {
                this._saveProfileScrollPositions(currentState);
            }
            
            // Сохраняем активный таб для экранов персоны и жанра
            if (currentState.type === 'person') {
                this._savePersonActiveTab(currentState);
            } else if (currentState.type === 'genre') {
                this._saveGenreActiveTab(currentState);
            }
        }
    }

    _savePersonActiveTab(state) {
        // Сохраняем активный таб для экрана персоны
        const screenElement = document.querySelector('person-screen');
        if (screenElement && screenElement._activeTab) {
            state.activeTab = screenElement._activeTab;
            console.log('[Navigation] Сохранен активный таб персоны:', state.activeTab);
        }
    }

    _saveGenreActiveTab(state) {
        // Сохраняем активный таб (mediaType) для экрана жанра
        const screenElement = document.querySelector('genre-screen');
        if (screenElement && screenElement._mediaType) {
            state.activeTab = screenElement._mediaType;
            console.log('[Navigation] Сохранен активный таб жанра:', state.activeTab);
        }
    }

    _restorePersonActiveTab(state) {
        // Восстанавливаем активный таб для экрана персоны
        if (state.type === 'person' && state.activeTab) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        const screenElement = document.querySelector('person-screen');
                        if (screenElement && state.activeTab) {
                            screenElement._activeTab = state.activeTab;
                            // Обновляем UI табов
                            const tabs = screenElement.shadowRoot.querySelectorAll('.tab');
                            tabs.forEach(tab => {
                                tab.classList.toggle('active', tab.dataset.tab === state.activeTab);
                            });
                            // Перерисовываем контент
                            screenElement._renderMediaItems();
                            console.log('[Navigation] Восстановлен активный таб персоны:', state.activeTab);
                        }
                    }, 150);
                });
            });
        }
    }

    _restoreGenreActiveTab(state) {
        // Восстанавливаем активный таб (mediaType) для экрана жанра
        if (state.type === 'genre' && state.activeTab) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        const screenElement = document.querySelector('genre-screen');
                        if (screenElement && state.activeTab) {
                            screenElement._mediaType = state.activeTab;
                            // Обновляем URL параметр
                            const url = new URL(window.location);
                            url.searchParams.set('type', state.activeTab);
                            window.history.replaceState(state, '', url);
                            // Перезагружаем данные и перерисовываем
                            screenElement.loadData().then(() => {
                                screenElement.render();
                            });
                            console.log('[Navigation] Восстановлен активный таб жанра:', state.activeTab);
                        }
                    }, 150);
                });
            });
        }
    }

    _saveProfileScrollPositions(state) {
        // Сохраняем позицию скролла табов для профиля
        const screenElement = document.querySelector('profile-screen');
        if (!screenElement) return;

        const tabsWrapper = screenElement.shadowRoot?.querySelector('.tabs-list-wrapper');

        if (tabsWrapper) {
            // Инициализируем объект позиций профиля, если его еще нет
            if (!state.profileScrollPositions) {
                state.profileScrollPositions = {};
            }

            // Сохраняем позицию скролла табов (горизонтальный скролл)
            state.profileScrollPositions.tabsScroll = tabsWrapper.scrollLeft || 0;

            console.log('[Navigation] Сохранена позиция скролла табов профиля:', state.profileScrollPositions.tabsScroll);
        }
    }

    _restoreProfileScrollPositions(state) {
        // Восстанавливаем позицию скролла табов для профиля
        if (state.type === 'tab' && state.name === 'profile' && state.profileScrollPositions) {
            // Используем requestAnimationFrame для восстановления после рендеринга
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        const screenElement = document.querySelector('profile-screen');
                        if (!screenElement) return;

                        // Восстанавливаем позицию скролла табов
                        const tabsWrapper = screenElement.shadowRoot.querySelector('.tabs-list-wrapper');
                        if (tabsWrapper && state.profileScrollPositions.tabsScroll !== undefined) {
                            tabsWrapper.scrollLeft = state.profileScrollPositions.tabsScroll;
                        }

                        console.log('[Navigation] Восстановлена позиция скролла табов профиля:', state.profileScrollPositions.tabsScroll);
                    }, 150);
                });
            });
        }
    }

    _popState() {
        return this._navigationStack.pop();
    }

    _dispatchNavigationEvent(state) {
        if (state.type === 'tab') {
            this._currentTab = state.name;
        }
        // Передаем сохраненную позицию скролла в событии
        const scrollPosition = state.scrollPosition;
        window.dispatchEvent(new CustomEvent('navigation-changed', {
            detail: { state, scrollPosition }
        }));
        
        // Восстанавливаем позиции скролла табов и контента для профиля при возврате назад
        if (scrollPosition !== undefined && scrollPosition !== null) {
            // Это возврат назад - восстанавливаем позиции профиля
            this._restoreProfileScrollPositions(state);
            // Восстанавливаем активные табы для персоны и жанра
            this._restorePersonActiveTab(state);
            this._restoreGenreActiveTab(state);
        }
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
        // Модальные окна имеют приоритет - закрываем их первыми
        // Они не в browser history, поэтому обрабатываем напрямую
        if (this._modalStack.length > 0) {
            const modal = this._modalStack.pop();
            modal.remove();
            return true;
        }

        // Проверяем, можем ли вернуться назад по истории
        if (this._navigationStack.length <= 1) {
            return false;
        }
        
        // Вызываем browser back - popstate обработчик сделает всю работу
        window.history.back();
        return true;
    }

    navigateToTab(tab, skipTabBar = true) {
        // Сохраняем позицию скролла текущего экрана перед переходом
        // Только если в стеке есть элементы (не первый переход)
        if (this._navigationStack.length > 0) {
            this._saveCurrentScrollPosition();
        }
        
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
        // Сохраняем позицию скролла текущего экрана перед переходом
        // ВАЖНО: сохраняем ДО добавления нового состояния в стек
        this._saveCurrentScrollPosition();
        
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
        
        // Добавляем новое состояние в стек
        this._pushState(state);
        
        this._dispatchNavigationEvent(state);
    }

    navigateToGenre(genreId, genreName, from, type) {
        // Сохраняем позицию скролла текущего экрана перед переходом
        this._saveCurrentScrollPosition();
        
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
        // Сохраняем позицию скролла текущего экрана перед переходом
        this._saveCurrentScrollPosition();
        
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
        // Модальные окна не добавляются в browser history
        // Они управляются только через _modalStack
        this._modalStack.push(element);
    }

    removeModal(element) {
        const index = this._modalStack.indexOf(element);
        if (index !== -1) {
            this._modalStack.splice(index, 1);
        }
    }
}

export const navigationManager = new NavigationManager();