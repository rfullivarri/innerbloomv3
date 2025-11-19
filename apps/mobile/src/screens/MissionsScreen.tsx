import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useTokenProvider } from '../hooks/useTokenProvider';
import { useApiQuery } from '../hooks/useApiQuery';
import { fetchMissionsBoard } from '../api/client';

export default function MissionsScreen() {
  const { tokenProvider } = useTokenProvider();
  const { data, status, error, reload } = useApiQuery(
    () => fetchMissionsBoard(tokenProvider!),
    [tokenProvider],
    { enabled: Boolean(tokenProvider) },
  );

  const isLoading = status === 'loading' || !tokenProvider;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={reload} tintColor="#f472b6" />}
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
  );
}

const styles = StyleSheet.create({
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
});
