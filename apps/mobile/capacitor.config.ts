import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.innerbloom.app',
  appName: 'Innerbloom',
  webDir: '../web/dist',
  ios: {
    scheme: 'innerbloom',
  },
  server: {
    iosScheme: 'capacitor',
  },
};

export default config;
