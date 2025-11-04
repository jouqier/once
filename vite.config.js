import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
    // Загружаем env из корня проекта, а не из src/
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    
    return {
        base: process.env.GITHUB_PAGES === 'true' ? '/once/' : '/',
        root: 'src',
        envDir: '../',  // Указываем Vite искать .env в корне проекта
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
            host: 'localhost'
        }
    };
}); 