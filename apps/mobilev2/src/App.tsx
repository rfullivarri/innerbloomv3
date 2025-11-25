import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text } from 'react-native';

function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Hello World 👋</Text>
        <Text style={styles.subtitle}>
          Si ves este mensaje en el simulador de iOS, la app base nativa está funcionando.
        </Text>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555555',
  },
});

export default App;
