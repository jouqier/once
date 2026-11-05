import { useEffect, useRef } from 'react';
import { navigationManager } from '../../config/navigation.js';
import { hideBackButton, showBackButton } from '../../config/telegram.js';
import { scrollLock } from '../../utils/scroll.js';

// scrollLock не считает вызовы: второй enable перезапишет сохранённую позицию,
// первый disable снимет блокировку под ещё открытым окном. Счётчик держит
// блокировку, пока открыто хотя бы одно окно.
let lockCount = 0;

function lockScroll() {
    if (lockCount++ === 0) scrollLock.enable();
}

function unlockScroll() {
    if (--lockCount === 0) scrollLock.disable();
}

// telegram.js обновляет кнопку «Назад» только по navigation-changed,
// а pushModal и removeModal этого события не шлют.
function syncBackButton() {
    if (navigationManager.canGoBack()) {
        showBackButton();
    } else {
        hideBackButton();
    }
}

export function useModal(open, onOpenChange) {
    const onOpenChangeRef = useRef(onOpenChange);
    useEffect(() => {
        onOpenChangeRef.current = onOpenChange;
    });

    useEffect(() => {
        if (!open) return;

        // Один объект на всё время, пока окно открыто: его же снимает removeModal.
        // navigationManager.goBack() сам вынимает его из стека и вызывает remove(),
        // тогда removeModal ниже ничего не найдёт и ничего не сделает.
        const modal = { remove: () => onOpenChangeRef.current(false) };
        navigationManager.pushModal(modal);
        lockScroll();
        syncBackButton();

        return () => {
            navigationManager.removeModal(modal);
            unlockScroll();
            syncBackButton();
        };
    }, [open]);
}
