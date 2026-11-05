import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { navigationManager } from '../../config/navigation.js';

function createSnapshot(state) {
    return { state };
}

// Один слушатель на уровне модуля: он ставится при импорте, то есть до bootstrap(),
// и не пропускает навигацию, которая случилась до первого рендера React.
// Снимок меняется только здесь, поэтому getSnapshot между событиями возвращает тот же объект.
let snapshot = createSnapshot(navigationManager.getCurrentState());
const listeners = new Set();

window.addEventListener('navigation-changed', (event) => {
    // Как в v1 рисуем состояние из события. Оно совпадает с getCurrentState(),
    // кроме popstate в запись, которой уже нет в стеке (браузерное «Назад» после смены таба).
    snapshot = createSnapshot(event.detail?.state ?? navigationManager.getCurrentState());
    // v1 менял экран синхронно внутри события. flushSync сохраняет это: новый экран уже в DOM,
    // когда navigateTo*/goBack и остальные слушатели navigation-changed продолжают работу.
    // Скролл здесь ни при чём: прокручивается body, и браузер его позицию не восстанавливает.
    flushSync(() => listeners.forEach((listener) => listener()));
});

function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot() {
    return snapshot;
}

export function useNavigation() {
    return useSyncExternalStore(subscribe, getSnapshot);
}
