import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    // Базовый путь для GitHub Pages
    // Замените 'my-mini-app' на имя вашего репозитория
    base: process.env.GITHUB_PAGES === 'true' ? '/once/' : '/',
    
    root: 'src',
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
        host: true
    }
}); 