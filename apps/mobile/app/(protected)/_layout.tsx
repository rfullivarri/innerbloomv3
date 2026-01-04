import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleDot, Flame, Route, Sparkles, Sprout } from 'lucide-react-native';

import { NativeTabBar, getNativeTabBarHeight } from '@/components/native-tab-bar';

export default function ProtectedLayout() {
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
  const insets = useSafeAreaInsets();
  const scenePaddingBottom = isNative ? getNativeTabBarHeight(insets.bottom) : 0;

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      sceneContainerStyle={isNative ? { paddingBottom: scenePaddingBottom } : undefined}
      tabBar={(props) =>
        isNative ? <NativeTabBar {...props} safeAreaBottom={insets.bottom} /> : null
      }
    >
      <Tabs.Screen
        name="missions"
        options={{
          tabBarLabel: 'Misiones',
          tabBarIcon: ({ color = '#fff', size = 22 }) => (
            <Route size={size} color={color} strokeWidth={2.25} />
          ),
        }}
      />
      <Tabs.Screen
        name="dquest"
        options={{
          tabBarLabel: 'Daily',
          tabBarIcon: ({ color = '#fff', size = 22 }) => (
            <Flame size={size} color={color} strokeWidth={2.25} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color = '#fff', size = 26 }) => (
            <CircleDot size={size} color={color} strokeWidth={2.25} />
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          tabBarLabel: 'Rewards',
          tabBarIcon: ({ color = '#fff', size = 22 }) => (
            <Sparkles size={size} color={color} strokeWidth={2.25} />
          ),
        }}
      />
      <Tabs.Screen
        name="editor"
        options={{
          tabBarLabel: 'Editor',
          tabBarIcon: ({ color = '#fff', size = 22 }) => (
            <Sprout size={size} color={color} strokeWidth={2.25} />
          ),
        }}
      />
    </Tabs>
  );
}
