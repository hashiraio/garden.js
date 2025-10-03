/// <reference types='vitest' />
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import pkg from './package.json';
import eslint from 'vite-plugin-eslint';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  cacheDir: '../node_modules/.vite/swap',

  plugins: [
    wasm(),
    eslint(),
    dts({
      outDir: './dist',
      pathsToAliases: false,
      entryRoot: '.',
    }),
  ],

  build: {
    commonjsOptions: {
      include: [],
    },
    lib: {
      entry: 'src/index.ts',
      name: 'swap',
      fileName: 'index',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.peerDependencies || {}),
        'src/test/**/*',
      ],
      output: {
        preserveModules: true,
      },
    },
  },
});
