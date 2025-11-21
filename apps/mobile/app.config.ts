import { ConfigContext, ExpoConfig } from 'expo/config';

const projectId = 'a069a65b-a9b9-42a8-a756-07551e2bc094';
const bundleIdentifier = 'com.innerbloom.mobile';

export default ({ config }: ConfigContext): ExpoConfig => {
  const isDevOrPreview =
    process.env.EAS_BUILD_PROFILE === 'development' ||
    process.env.EAS_BUILD_PROFILE === 'preview' ||
    process.env.NODE_ENV !== 'production';

  const baseConfig: ExpoConfig = {
    ...config,
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
      bundleIdentifier,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: bundleIdentifier,
    },
    web: {
      bundler: 'metro',
    },
    plugins: ['expo-secure-store', 'expo-dev-client'],
    extra: {
      eas: {
        projectId,
      },
    },
    owner: 'rfullivarri',
  };

  if (isDevOrPreview) {
    baseConfig.ios = {
      ...baseConfig.ios,
      infoPlist: {
        ...baseConfig.ios?.infoPlist,
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
          NSAllowsLocalNetworking: true,
          NSExceptionDomains: {
            localhost: {
              NSExceptionAllowsInsecureHTTPLoads: true,
              NSIncludesSubdomains: true,
            },
            '127.0.0.1': {
              NSExceptionAllowsInsecureHTTPLoads: true,
              NSIncludesSubdomains: true,
            },
          },
        },
      },
    };
  }

  return baseConfig;
};
