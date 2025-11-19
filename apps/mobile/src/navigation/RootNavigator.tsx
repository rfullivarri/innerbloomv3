import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import LoginScreen from '../screens/LoginScreen';
import DashboardNavigator from './DashboardNavigator';

export type RootStackParamList = {
  Auth: undefined;
  Dashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function LoadingScreen({ message }: { message: string }) {
  return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color="#f472b6" />
      <Text style={styles.loaderText}>{message}</Text>
    </View>
  );
}

export default function RootNavigator() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <LoadingScreen message="Verificando sesión..." />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isSignedIn ? (
        <Stack.Screen name="Dashboard" component={DashboardNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#05060a',
    padding: 24,
  },
  loaderText: {
    marginTop: 12,
    color: '#f1f5f9',
    fontSize: 16,
  },
});
