import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/db': path.resolve(__dirname, './src/db'),
      '@/modules': path.resolve(__dirname, './src/modules'),
      '@/common': path.resolve(__dirname, './src/common'),
    },
  },
});
