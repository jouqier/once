// Скрипт для очистки кеша рекомендаций
// Запусти в консоли браузера для очистки старого кеша

console.log('Clearing cache...');

// Очистка localStorage для сериалов
localStorage.removeItem('tvShowsData');
console.log('✓ Cleared tvShowsData from localStorage');

// Очистка in-memory кеша для фильмов (если страница загружена)
if (window.customElements.get('movies-screen')) {
    const MoviesScreen = window.customElements.get('movies-screen');
    if (MoviesScreen._cache) {
        MoviesScreen._cache = null;
        console.log('✓ Cleared MoviesScreen._cache');
    }
}

console.log('Cache cleared! Reload the page to see recommendations.');
console.log('Make sure you have movies/shows in your Want or Watched lists.');
