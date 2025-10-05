import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const fallbackClerkKey =
    env.VITE_CLERK_PUBLISHABLE_KEY || env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || env.CLERK_PUBLISHABLE_KEY || '';

  return {
    plugins: [react()],
    define: {
      __NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY__: JSON.stringify(fallbackClerkKey)
    },
    server: {
      host: '0.0.0.0',
      port: 5173
    },
    preview: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: ['.railway.app']
    }
  };
});
