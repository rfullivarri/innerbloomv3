import 'react-native-gesture-handler';
import { ClerkProvider } from '@clerk/clerk-expo';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import RootNavigator from './navigation/RootNavigator';
import { tokenCache } from './lib/tokenCache';

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#05060a',
    card: '#0b0d16',
    primary: '#f472b6',
    text: '#f1f5f9',
    border: '#1f2533',
    notification: '#f97316',
  },
};

export default function App() {
  const publishableKey = (
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??
    (Constants.expoConfig?.extra as { clerkPublishableKey?: string } | undefined)?.clerkPublishableKey
  )?.trim();

  if (!publishableKey) {
    throw new Error('Clerk publishable key is not set');
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <NavigationContainer theme={AppTheme}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
