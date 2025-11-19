import { useState } from 'react';
import { ClerkLoaded, ClerkLoading, useSignIn } from '@clerk/clerk-expo';
import { View, StyleSheet, Text, TextInput, Pressable } from 'react-native';

export default function LoginScreen() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!signIn || !identifier || !password) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await signIn.create({ identifier: identifier.trim(), password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
      } else {
        setError('Completa el segundo factor en la web.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo iniciar sesión';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ClerkLoaded>
        <View style={styles.card}>
          <Text style={styles.title}>Innerbloom</Text>
          <Text style={styles.subtitle}>Inicia sesión con tus credenciales de dashboard</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            keyboardType="email-address"
            value={identifier}
            onChangeText={setIdentifier}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              (submitting || !isLoaded || !signIn) && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            disabled={submitting || !isLoaded || !signIn}
            onPress={handleSubmit}
          >
            <Text style={styles.buttonLabel}>{submitting ? 'Ingresando…' : 'Continuar'}</Text>
          </Pressable>
          <Text style={styles.helpText}>
            Si usas login social o 2FA, termina el flujo desde la web y la sesión aparecerá automáticamente aquí.
          </Text>
        </View>
      </ClerkLoaded>
      <ClerkLoading>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Preparando login...</Text>
        </View>
      </ClerkLoading>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05060a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#0b0d16',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    textAlign: 'center',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#cbd5f5',
    textAlign: 'center',
    fontSize: 14,
  },
  input: {
    backgroundColor: '#111729',
    borderRadius: 10,
    padding: 14,
    color: '#f8fafc',
  },
  button: {
    backgroundColor: '#f472b6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    color: '#05060a',
    fontWeight: '700',
    fontSize: 16,
  },
  errorText: {
    color: '#fecdd3',
    fontSize: 13,
  },
  helpText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  loading: {
    marginTop: 16,
  },
  loadingText: {
    color: '#cbd5f5',
    textAlign: 'center',
  },
});
