import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['./server/__tests__/**/*.{test,spec}.{js,ts}'],
  },
  resolve: {
    alias: {
      '@db': path.resolve(__dirname, './db'),
    },
  },
});
