/**
 * Компактный формат просмотренных эпизодов сезона.
 *
 * Новый формат (v2) — строка из отрезков через запятую:
 *   "1-29"        → 1..29 (весь сезон)
 *   "1,5"         → 1 и 5
 *   "1-3,5,7-9"   → 1,2,3,5,7,8,9
 *   ""            → ничего
 *
 * Почему строка: по типу значения (string vs array) формат однозначно
 * отличается от старого, поэтому старые данные читаются без догадок,
 * а новые никогда не попадают под старое правило «[1, N] = диапазон».
 *
 * Старый формат (v1) — массив:
 *   [1, N]         → диапазон 1..N
 *   [a, b, c, ...] → набор эпизодов
 * Старое значение [1, N] неоднозначно: _formatEpisodes писал так и весь
 * сезон 1..N, и набор из двух эпизодов {1, N}. Почти все такие записи —
 * диапазоны (полный сезон — самый частый случай), поэтому читаем [1, N]
 * как диапазон, как и раньше. Наборы {1, N}, уже испорченные старым
 * кодом, восстановить нельзя.
 */

/**
 * Набор эпизодов → строка формата v2
 * @param {number[]} episodes
 * @returns {string}
 */
export function formatEpisodes(episodes) {
    if (!Array.isArray(episodes) || episodes.length === 0) {
        return '';
    }

    const sorted = [...new Set(episodes.map(Number))]
        .filter(n => Number.isInteger(n) && n > 0)
        .sort((a, b) => a - b);

    const parts = [];
    let start = sorted[0];
    let prev = sorted[0];

    for (let i = 1; i <= sorted.length; i++) {
        const current = sorted[i];
        if (current === prev + 1) {
            prev = current;
            continue;
        }
        parts.push(start === prev ? String(start) : `${start}-${prev}`);
        start = current;
        prev = current;
    }

    return parts.join(',');
}

/**
 * Значение из хранилища (v2-строка или v1-массив) → отсортированный массив эпизодов
 * @param {string|number[]} data
 * @returns {number[]}
 */
export function parseEpisodes(data) {
    if (typeof data === 'string') {
        const episodes = [];
        data.split(',').forEach(part => {
            if (!part) return;
            const [start, end = start] = part.split('-').map(Number);
            if (!Number.isInteger(start) || !Number.isInteger(end)) return;
            for (let n = start; n <= end; n++) {
                episodes.push(n);
            }
        });
        return episodes;
    }

    if (!Array.isArray(data)) {
        return [];
    }

    // v1: [1, N] читаем как диапазон (см. комментарий в начале файла)
    if (data.length === 2 && data[0] === 1 && typeof data[1] === 'number' && data[1] >= 1) {
        return Array.from({ length: data[1] }, (_, i) => i + 1);
    }

    // v1: набор эпизодов
    return [...data].sort((a, b) => a - b);
}

/**
 * Количество эпизодов в сохранённом значении
 * @param {string|number[]} data
 * @returns {number}
 */
export function countEpisodes(data) {
    return parseEpisodes(data).length;
}
