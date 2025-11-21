import type { ExpoConfig } from 'expo/config';
import { config as loadEnv } from 'dotenv';
import path from 'path';

loadEnv({ path: path.resolve(__dirname, '.env') });

const DEFAULT_API_BASE_URL = 'https://api.innerbloom.dev';

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  process.env.EXPO_EXTRA_API_BASE_URL ??
  DEFAULT_API_BASE_URL;

const clerkPublishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??
  process.env.EXPO_EXTRA_CLERK_PUBLISHABLE_KEY ??
  '';

const clerkTokenTemplate =
  process.env.EXPO_PUBLIC_CLERK_TOKEN_TEMPLATE ??
  process.env.EXPO_EXTRA_CLERK_TOKEN_TEMPLATE ??
  '';

const config: ExpoConfig = {
  name: 'Innerbloom Mobile',
  slug: 'innerbloom-mobile',
  scheme: 'innerbloom',
  version: '1.0.0',
  orientation: 'portrait',
  sdkVersion: '54.0.0',
  userInterfaceStyle: 'light',
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.innerbloom.mobile',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.innerbloom.mobile',
  },
  web: {
    bundler: 'metro',
  },
  plugins: ['expo-secure-store', 'expo-dev-client'],
  extra: {
    apiBaseUrl: apiBaseUrl || DEFAULT_API_BASE_URL,
    clerkPublishableKey,
    clerkTokenTemplate,
    eas: {
      projectId: 'a069a65b-a9b9-42a8-a756-07551e2bc094',
    },
  },
  owner: 'rfullivarri',
};

export default config;
