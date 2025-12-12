import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

const useMockClerk = process.env.MOCK_CLERK === 'true';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      config: fileURLToPath(new URL('../config', import.meta.url)),
      ...(useMockClerk
        ? {
            '@clerk/clerk-react': fileURLToPath(
              new URL('./src/testSupport/mockClerk.tsx', import.meta.url),
            ),
          }
        : {}),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['.railway.app']
  },
  build: {
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
    exclude: [...configDefaults.exclude, 'tests/**', '**/tests/**'],
  }
});
