import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useTokenProvider } from '../hooks/useTokenProvider';
import { useApiQuery } from '../hooks/useApiQuery';
import { fetchDailyQuestDefinition, type DailyQuestDefinitionResponse } from '../api/client';

export default function DailyQuestScreen() {
  const { tokenProvider } = useTokenProvider();
  const { data, status, error, reload } = useApiQuery(
    () => fetchDailyQuestDefinition(tokenProvider!),
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
        <Text style={styles.error}>Error al cargar Daily Quest: {error?.message ?? 'desconocido'}</Text>
      )}
      {data && <DailyQuestDefinition definition={data} />}
    </ScrollView>
  );
}

function DailyQuestDefinition({ definition }: { definition: DailyQuestDefinitionResponse }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Daily Quest — {definition.date}</Text>
      <Text style={styles.meta}>Estado: {definition.submitted ? 'Enviada ✅' : 'Pendiente ✍️'}</Text>
      {definition.pillars.map((pillar) => (
        <View key={pillar.pillar_code} style={styles.pillar}>
          <Text style={styles.pillarTitle}>{pillar.pillar_code.toUpperCase()}</Text>
          {pillar.tasks.map((task) => (
            <View key={task.task_id} style={styles.taskRow}>
              <Text style={styles.taskName}>{task.name}</Text>
              <Text style={styles.taskMeta}>
                {task.difficulty ?? '—'} · {task.xp} XP
              </Text>
            </View>
          ))}
        </View>
      ))}
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
  pillar: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1f2533',
    gap: 6,
  },
  pillarTitle: {
    color: '#f1f5f9',
    fontWeight: '600',
    marginBottom: 4,
  },
  taskRow: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#111729',
  },
  taskName: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  taskMeta: {
    color: '#94a3b8',
    fontSize: 13,
  },
});
