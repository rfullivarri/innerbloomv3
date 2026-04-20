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
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_innerbloom',
      iconColor: '#A855F7',
    },
  },
};

export default config;
