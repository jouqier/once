import { defineConfig, loadEnv } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import mkcert from 'vite-plugin-mkcert';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    // Загружаем env из корня проекта, а не из src/
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    
    return {
        base: process.env.GITHUB_PAGES === 'true' ? '/once/' : '/',
        root: 'src',
        envDir: '../',  // Указываем Vite искать .env в корне проекта
        plugins: [react(), tailwindcss(), mkcert()],
        resolve: {
            alias: { '@': resolve(__dirname, 'src/app') }
        },
        build: {
            outDir: '../dist',
            emptyOutDir: true,
            sourcemap: true,
            assetsInclude: ['**/*.jpg', '**/*.png'],
            rollupOptions: {
                input: {
                    main: resolve(__dirname, 'src/index.html'),
                },
                output: {
                    entryFileNames: `assets/[name].js`,
                    chunkFileNames: `assets/[name].js`,
                    assetFileNames: `assets/[name].[ext]`
                }
            }
        },
        server: {
            port: 3000,
            host: '0.0.0.0', // Слушаем на всех интерфейсах для доступа по сети
            strictPort: false,
            https: true // Включаем HTTPS для Telegram Mini App
        }
    };
}); 