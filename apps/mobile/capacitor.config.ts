import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.innerbloom.app',
  appName: 'Innerbloom',
  webDir: '../web/dist',
  ios: {
    scheme: 'innerbloom',
  },
  server: {
    hostname: 'innerbloomjourney.org',
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
};

export default config;
