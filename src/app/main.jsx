import './styles/globals.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { bootstrap } from './bootstrap.js';
import { App } from './App.jsx';

// Как в v1, инициализация стартует по DOMContentLoaded и заканчивается до первого рендера React
window.addEventListener('DOMContentLoaded', async () => {
    const showWelcomeStories = await bootstrap();
    createRoot(document.getElementById('root')).render(
        <StrictMode>
            <App showWelcomeStories={showWelcomeStories} />
        </StrictMode>
    );
});
