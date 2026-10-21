/**
 * Тест компактного формата эпизодов.
 * Запуск: node tests/episodes-format.test.mjs
 */

import assert from 'node:assert/strict';
import { formatEpisodes, parseEpisodes, countEpisodes } from '../src/services/episodes-format.js';

const range = n => Array.from({ length: n }, (_, i) => i + 1);

function roundTrip(name, episodes, expectedStored) {
    const stored = formatEpisodes(episodes);
    if (expectedStored !== undefined) {
        assert.equal(stored, expectedStored, `${name}: формат`);
    }
    // Значение проходит через JSON, как в CloudStorage/localStorage
    const restored = parseEpisodes(JSON.parse(JSON.stringify(stored)));
    assert.deepEqual(restored, [...new Set(episodes)].sort((a, b) => a - b), `${name}: round-trip`);
    // Повторный цикл не должен ничего менять
    assert.equal(formatEpisodes(restored), stored, `${name}: стабильность`);
    console.log(`✅ ${name}: ${JSON.stringify(episodes)} → ${JSON.stringify(stored)}`);
}

roundTrip('[1,5] (баг: раньше читалось как 1..5)', [1, 5], '1,5');
roundTrip('[1,3] (баг: раньше читалось как 1..3)', [1, 3], '1,3');
roundTrip('весь сезон 1..29', range(29), '1-29');
roundTrip('весь сезон 1..2', [1, 2], '1-2');
roundTrip('один эпизод [1]', [1], '1');
roundTrip('пусто', [], '');
roundTrip('несортированный набор с дублями', [7, 2, 5, 1, 3, 2, 9, 8], '1-3,5,7-9');
roundTrip('без первого эпизода', [2, 3, 4], '2-4');

// Старые данные (массивы v1)
assert.deepEqual(parseEpisodes([1, 29]), range(29), 'legacy [1,N] → диапазон');
assert.deepEqual(parseEpisodes([1, 1]), [1], 'legacy [1,1] → [1]');
assert.deepEqual(parseEpisodes([1, 2, 5, 7]), [1, 2, 5, 7], 'legacy массив');
assert.deepEqual(parseEpisodes([3, 7]), [3, 7], 'legacy пара не с 1');
assert.deepEqual(parseEpisodes([]), [], 'legacy пусто');
assert.deepEqual(parseEpisodes(undefined), [], 'нет данных');
assert.equal(formatEpisodes(parseEpisodes([1, 29])), '1-29', 'legacy диапазон → v2');
assert.equal(countEpisodes([1, 29]), 29, 'countEpisodes legacy');
assert.equal(countEpisodes('1-3,5'), 4, 'countEpisodes v2');
console.log('✅ legacy-ввод');

console.log('\nВсе тесты пройдены');
