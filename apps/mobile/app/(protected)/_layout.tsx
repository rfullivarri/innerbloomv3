import { Tabs } from 'expo-router';

export default function ProtectedLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={() => null}>
      <Tabs.Screen name="dashboard" />
    </Tabs>
  );
}
