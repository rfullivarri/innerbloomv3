import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { NativeTabBar } from '@/components/native-tab-bar';

export default function ProtectedLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (Platform.OS !== 'web' ? <NativeTabBar {...props} /> : null)}
    >
      <Tabs.Screen name="missions" />
      <Tabs.Screen name="dquest" />
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="rewards" />
      <Tabs.Screen name="editor" />
    </Tabs>
  );
}
