import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { generateAiArtifacts } from './src/content/aiBuild';

const useMockClerk = process.env.MOCK_CLERK === 'true';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['IB-COLOR-LOGO.png'],
      manifest: {
        name: 'Innerbloom',
        short_name: 'Innerbloom',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#000c40',
        theme_color: '#000c40',
        icons: [
          // Íconos esperados en public/. Si aún no existen, agregar: /pwa-192.png y /pwa-512.png
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,ttf}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ request }) =>
              request.headers.has('authorization') || request.credentials === 'include',
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
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
    sourcemap: true,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        login: fileURLToPath(new URL('./login/index.html', import.meta.url)),
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
