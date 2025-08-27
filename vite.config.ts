import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    root: 'src/web',
    base: '/jsq/', // GitHub Pagesのリポジトリ名
    build: {
        outDir: '../../dist-web',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'src/web/index.html'),
            },
        },
    },
    server: {
        port: 3000,
        open: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src/web'),
        },
    },
});