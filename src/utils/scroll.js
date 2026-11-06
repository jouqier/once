// Прокручивается body (у html overflow: hidden), поэтому одного window.scrollTo мало
export function scrollToTop() {
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
}

const RESTORE_TIMEOUT_MS = 3000;
const USER_SCROLL_EVENTS = ['wheel', 'touchstart', 'keydown'];

// Возвращает body на сохранённую позицию. Экран при «Назад» монтируется заново и грузит
// данные асинхронно, поэтому сразу прокрутить нельзя: страница ещё короткая.
// Ждём, пока контент дорастёт до нужной высоты. Если пользователь сам начал листать
// или данные так и не пришли, сдаёмся. Возвращает функцию отмены.
export function restoreScrollPosition(target) {
    const body = document.body;
    const app = document.getElementById('app');

    const tryRestore = () => {
        if (body.scrollHeight - body.clientHeight < target) return false;
        body.scrollTop = target;
        return true;
    };

    if (tryRestore() || !app) return () => {};

    // Пока ждём, экран стоит сверху, а не на случайной позиции прошлого экрана
    scrollToTop();

    const observer = new ResizeObserver(() => {
        if (tryRestore()) stop();
    });
    const timer = setTimeout(() => {
        // Данные пришли не все: прокручиваем, насколько хватает высоты
        body.scrollTop = target;
        stop();
    }, RESTORE_TIMEOUT_MS);

    function stop() {
        observer.disconnect();
        clearTimeout(timer);
        USER_SCROLL_EVENTS.forEach((type) => window.removeEventListener(type, stop, true));
    }

    observer.observe(app);
    USER_SCROLL_EVENTS.forEach((type) =>
        window.addEventListener(type, stop, { capture: true, passive: true })
    );
    return stop;
}

export const scrollLock = {
    enable() {
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.top = `-${window.scrollY}px`;
    },

    disable() {
        const scrollY = document.body.style.top;
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.top = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
}; 