import { defineConfig } from 'vite';

export default defineConfig({
    base: '/3D-viewer/',  // S3サブフォルダ用のベースパス
    server: {
        port: 3000,
        open: true
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: true
    }
});
