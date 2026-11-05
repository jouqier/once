import { useLayoutEffect, useRef } from 'react';

function syncProps(element, props, applied) {
    for (const [name, value] of Object.entries(props)) {
        if (applied[name] !== value) {
            element[name] = value;
            applied[name] = value;
        }
    }
}

// undefined и null означают «атрибута нет», как проверки в v1 перед setAttribute
function syncAttrs(element, attrs, applied) {
    for (const [name, value] of Object.entries(attrs)) {
        if (applied[name] === value) continue;
        if (value === undefined || value === null) {
            element.removeAttribute(name);
        } else {
            element.setAttribute(name, String(value));
        }
        applied[name] = value;
    }
}

/**
 * Показывает старый custom element внутри React-дерева.
 * Свойства и атрибуты ставятся до вставки в DOM, чтобы connectedCallback их уже видел.
 */
export function LegacyScreen({ tag, props = {}, attrs = {} }) {
    const hostRef = useRef(null);
    const elementRef = useRef(null);
    const appliedRef = useRef(null);
    const pendingRemovalRef = useRef(null);

    useLayoutEffect(() => {
        // StrictMode сразу после монтирования вызывает cleanup и эффект повторно.
        // Удаление откладывается на микротаск и отменяется повторным запуском,
        // поэтому элемент создаётся и подключается один раз.
        pendingRemovalRef.current = null;

        if (elementRef.current && elementRef.current.localName !== tag) {
            elementRef.current.remove();
            elementRef.current = null;
        }
        if (!elementRef.current) {
            const element = document.createElement(tag);
            appliedRef.current = { props: {}, attrs: {} };
            syncProps(element, props, appliedRef.current.props);
            syncAttrs(element, attrs, appliedRef.current.attrs);
            elementRef.current = element;
        }
        if (elementRef.current.parentNode !== hostRef.current) {
            hostRef.current.appendChild(elementRef.current);
        }

        return () => {
            const element = elementRef.current;
            const token = {};
            pendingRemovalRef.current = token;
            queueMicrotask(() => {
                if (pendingRemovalRef.current !== token) return;
                pendingRemovalRef.current = null;
                element.remove();
                elementRef.current = null;
            });
        };
    }, [tag]);

    // Если тот же экран получил новые значения, обновляем только изменившиеся
    useLayoutEffect(() => {
        const element = elementRef.current;
        if (!element) return;
        syncProps(element, props, appliedRef.current.props);
        syncAttrs(element, attrs, appliedRef.current.attrs);
    });

    return <div ref={hostRef} className="contents" />;
}
