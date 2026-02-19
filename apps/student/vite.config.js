import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import path from 'path';
export default defineConfig({
    plugins: [
        react(),
        sentryVitePlugin({
            org: 'rcnr-ai-solutions',
            project: 'rcnr-student',
            authToken: process.env.SENTRY_AUTH_TOKEN,
            sourcemaps: {
                filesToDeleteAfterUpload: ['./dist/**/*.map'],
            },
            disable: !process.env.SENTRY_AUTH_TOKEN,
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5174,
    },
    build: {
        minify: 'esbuild',
        sourcemap: true,
    },
    esbuild: {
        drop: ['console', 'debugger'],
    },
});
