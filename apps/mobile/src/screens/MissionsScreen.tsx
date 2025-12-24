import { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTokenProvider } from '../hooks/useTokenProvider';
import { useApiQuery } from '../hooks/useApiQuery';
import { fetchMissionsBoard } from '../api/client';

export default function MissionsScreen() {
  const [showWip, setShowWip] = useState(true);
  const navigation = useNavigation();
  const { tokenProvider } = useTokenProvider();
  const { data, status, error, reload } = useApiQuery(
    () => fetchMissionsBoard(tokenProvider!),
    [tokenProvider],
    { enabled: Boolean(tokenProvider) },
  );

  const isLoading = status === 'loading' || !tokenProvider;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={reload} tintColor="#f472b6" />}
        pointerEvents={showWip ? 'none' : 'auto'}
      >
        {!tokenProvider && <Text style={styles.info}>Esperando sesión...</Text>}
        {status === 'error' && tokenProvider && (
          <Text style={styles.error}>Error al cargar misiones: {error?.message ?? 'desconocido'}</Text>
        )}
        {data && (
          <View style={styles.card}>
            <Text style={styles.title}>Temporada {data.season_id}</Text>
            <Text style={styles.meta}>Actualizado: {new Date(data.generated_at).toLocaleString()}</Text>
            {data.slots.map((slot) => (
              <View key={slot.id} style={styles.slot}>
                <Text style={styles.slotTitle}>
                  {slot.slot.toUpperCase()} — {slot.state.toUpperCase()}
                </Text>
                <Text style={styles.slotMeta}>{slot.mission?.name ?? 'Sin misión activa'}</Text>
                <Text style={styles.slotMeta}>
                  Progreso: {slot.progress.current}/{slot.progress.target} ({Math.round(slot.progress.percent * 100)}%)
                </Text>
                <Text style={styles.slotMeta}>Acciones disponibles: {slot.actions.filter((a) => a.enabled).length}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      {showWip && (
        <View style={styles.wipOverlay}>
          <Text style={styles.wipEmoji}>🚧</Text>
          <Text style={styles.wipTitle}>work in progress</Text>
          <View style={styles.wipActions}>
            <Pressable style={[styles.wipButton, styles.wipButtonSecondary]} onPress={() => setShowWip(false)}>
              <Text style={styles.wipButtonText}>let see</Text>
            </Pressable>
            <Pressable
              style={[styles.wipButton, styles.wipButtonPrimary]}
              onPress={() => navigation.navigate('DashboardHome' as never)}
            >
              <Text style={styles.wipButtonTextPrimary}>let them cook</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    padding: 24,
    gap: 16,
  },
  info: {
    color: '#cbd5f5',
  },
  error: {
    color: '#fecdd3',
  },
  card: {
    backgroundColor: '#0b0d16',
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  title: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
  },
  meta: {
    color: '#cbd5f5',
    fontSize: 14,
  },
  slot: {
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#111729',
    gap: 4,
  },
  slotTitle: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  slotMeta: {
    color: '#cbd5f5',
    fontSize: 13,
  },
  wipOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(3, 7, 18, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 20,
  },
  wipEmoji: {
    fontSize: 72,
  },
  wipTitle: {
    marginTop: 12,
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  wipActions: {
    marginTop: 32,
    flexDirection: 'row',
    gap: 16,
    alignSelf: 'stretch',
    justifyContent: 'space-between',
  },
  wipButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    borderWidth: 1,
  },
  wipButtonPrimary: {
    backgroundColor: '#f472b6',
    borderColor: '#f472b6',
  },
  wipButtonSecondary: {
    backgroundColor: '#0b0d16',
    borderColor: '#334155',
  },
  wipButtonText: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  wipButtonTextPrimary: {
    color: '#0f172a',
    fontWeight: '700',
  },
});
