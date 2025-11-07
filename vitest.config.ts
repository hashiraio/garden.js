import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

config();

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',

        projects: [
            './packages/core/vite.config.ts',
            './packages/orderbook/vite.config.ts',
            './packages/utils/vite.config.ts',
            './packages/react-hooks/vite.config.ts',
            './packages/swap/vite.config.ts',
        ],

        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            exclude: [
                'node_modules/',
                'dist/',
                '**/*.spec.ts',
                '**/*.d.ts',
                'test-config-loader.ts',
                'scripts/',
                'vitest.config.ts',
            ],
            thresholds: {
                lines: 60,
                functions: 60,
                branches: 60,
                statements: 60,
            },
        },

        reporters: ['verbose', 'html', 'json', 'junit'],

        outputFile: {
            html: './test-results/html/index.html',
            json: './test-results/results.json',
            junit: './test-results/junit.xml',
        },

        testTimeout: 30000,
        hookTimeout: 30000,

        include: ['**/*.spec.ts', '**/*.test.ts'],

        exclude: [
            'node_modules',
            'dist',
            '.git',
            'packages/test/**',
        ],

        maxConcurrency: 5,

        retry: 1,
    },
});

