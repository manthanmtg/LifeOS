import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            // Vitest 3+ uses 'include' to decide which files to track for 'all'
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'node_modules/**',
                '.next/**',
                'public/**',
                'next.config.ts',
                'postcss.config.mjs',
                'tailwind.config.ts',
                'src/test/**',
                'src/**/*.d.ts',
                'src/**/__tests__/**',
            ],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
