import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { generateAiArtifacts } from './src/content/aiBuild';

const useMockClerk = process.env.MOCK_CLERK === 'true';
const isNativeBuild = process.env.VITE_BUILD_TARGET === 'native';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'generate-ai-artifacts',
      buildStart() {
        generateAiArtifacts();
      },
      configureServer() {
        generateAiArtifacts();
      }
    }
  ],
  resolve: {
    alias: {
      config: fileURLToPath(new URL('./src/config', import.meta.url)),
      'lucide-react': fileURLToPath(new URL('./src/lib/lucide-react.tsx', import.meta.url)),
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
    allowedHosts: [
      'innerbloomjourney.org',
      'www.innerbloomjourney.org',
      'dev.innerbloomjourney.org',
      '.up.railway.app',
      'localhost'
    ]
  },
  build: {
    sourcemap: !isNativeBuild,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        login: fileURLToPath(new URL('./login/index.html', import.meta.url)),
        onboarding: fileURLToPath(new URL('./onboarding/index.html', import.meta.url)),
        demoModeSelect: fileURLToPath(new URL('./demo-mode-select/index.html', import.meta.url)),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
    exclude: [...configDefaults.exclude, 'tests/**', '**/tests/**'],
  }
});
