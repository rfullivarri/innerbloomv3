import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useBackendUserContext } from '../hooks/useBackendUser';
import { useTokenProvider } from '../hooks/useTokenProvider';
import { useApiQuery } from '../hooks/useApiQuery';
import { fetchUserTasks, type UserTask } from '../api/client';

export default function TasksScreen() {
  const { backendUserId } = useBackendUserContext();
  const { tokenProvider } = useTokenProvider();
  const enabled = Boolean(tokenProvider && backendUserId);
  const { data, status, error, reload } = useApiQuery(
    () => fetchUserTasks(tokenProvider!, backendUserId!),
    [tokenProvider, backendUserId],
    { enabled },
  );

  const isLoading = status === 'loading' && enabled;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={Boolean(isLoading)} onRefresh={reload} tintColor="#f472b6" />}
    >
      {!backendUserId && <Text style={styles.info}>Necesitamos tu perfil antes de mostrar las tareas.</Text>}
      {status === 'error' && enabled && (
        <Text style={styles.error}>Error al cargar tareas: {error?.message ?? 'desconocido'}</Text>
      )}
      {data && data.length === 0 && enabled && <Text style={styles.info}>No tienes tareas activas aún.</Text>}
      {data && data.length > 0 && (
        <View style={styles.list}>
          {data.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function TaskRow({ task }: { task: UserTask }) {
  const inactive = !task.isActive || Boolean(task.archivedAt);
  return (
    <View style={[styles.taskRow, inactive && styles.taskRowInactive]}>
      <Text style={styles.taskTitle}>{task.title}</Text>
      <Text style={styles.taskMeta}>
        Pilar: {task.pillarId ?? '—'} · Rasgo: {task.traitId ?? '—'}
      </Text>
      <Text style={styles.taskMeta}>
        Dificultad: {task.difficultyId ?? '—'} · XP: {task.xp ?? 0}
      </Text>
      {inactive && <Text style={styles.badge}>Inactiva</Text>}
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
  list: {
    gap: 12,
  },
  taskRow: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1f2533',
  },
  taskRowInactive: {
    opacity: 0.7,
    borderColor: '#4b5563',
  },
  taskTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  taskMeta: {
    color: '#cbd5f5',
    fontSize: 13,
  },
  badge: {
    marginTop: 8,
    color: '#f472b6',
    fontWeight: '700',
    fontSize: 12,
  },
});
