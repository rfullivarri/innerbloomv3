import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useTokenProvider } from '../hooks/useTokenProvider';
import { useApiQuery } from '../hooks/useApiQuery';
import { fetchDailyReminderSettings, type DailyReminderSettingsResponse } from '../api/client';

export default function SchedulerScreen() {
  const { tokenProvider } = useTokenProvider();
  const { data, status, error, reload } = useApiQuery(
    () => fetchDailyReminderSettings(tokenProvider!),
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
        <Text style={styles.error}>No se pudo cargar el scheduler: {error?.message ?? 'desconocido'}</Text>
      )}
      {data && <ReminderCard reminder={data} />}
    </ScrollView>
  );
}

function ReminderCard({ reminder }: { reminder: DailyReminderSettingsResponse }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Recordatorio diario</Text>
      <Text style={styles.meta}>Canal: {reminder.channel ?? '—'}</Text>
      <Text style={styles.meta}>Hora local: {reminder.local_time ?? reminder.localTime ?? '—'}</Text>
      <Text style={styles.meta}>Zona horaria: {reminder.timezone ?? reminder.timeZone ?? '—'}</Text>
      <Text style={styles.meta}>Estado: {reminder.status ?? 'desconocido'}</Text>
      <Text style={styles.meta}>Último envío: {reminder.last_sent_at ?? 'nunca'}</Text>
      <Text style={styles.infoSmall}>La edición se habilitará en la próxima iteración.</Text>
    </View>
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
  infoSmall: {
    marginTop: 8,
    color: '#94a3b8',
    fontSize: 12,
  },
  error: {
    color: '#fecdd3',
  },
  card: {
    backgroundColor: '#0b0d16',
    borderRadius: 20,
    padding: 20,
    gap: 8,
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
});
