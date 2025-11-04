import { i18n } from '../services/i18n.js';

export const API_CONFIG = {
    API_KEY: import.meta.env.VITE_TMDB_API_KEY,
    BASE_URL: 'https://tmdb-proxy-xi.vercel.app/3',
    IMAGE_BASE_URL: 'https://tmdb-proxy-xi.vercel.app/t/p/w500',
    get LANGUAGE() {
        return i18n.getApiLanguage();
    }
}; 