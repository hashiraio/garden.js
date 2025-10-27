import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  './packages/core/vite.config.ts',
  './packages/orderbook/vite.config.ts',
  './packages/utils/vite.config.ts',
  './packages/react-hooks/vite.config.ts',
  './packages/swap/vite.config.ts',
  './packages/test/vite.config.ts',
]);
