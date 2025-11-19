import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBackendUserContext } from '../hooks/useBackendUser';
import type { DashboardStackParamList } from '../navigation/DashboardNavigator';

const sections = [
  { label: 'Daily Quest', route: 'DailyQuest' },
  { label: 'Misiones v2', route: 'Missions' },
  { label: 'Tareas activas', route: 'Tasks' },
  { label: 'Scheduler', route: 'Scheduler' },
] as const;

type Props = NativeStackScreenProps<DashboardStackParamList, 'DashboardHome'>;

export default function DashboardHomeScreen({ navigation }: Props) {
  const { profile, status, error, reload } = useBackendUserContext();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.greeting}>Hola, {profile?.full_name ?? 'Innerbloomer'} ✨</Text>
        <Text style={styles.meta}>Game mode: {profile?.game_mode ?? 'Pendiente'}</Text>
        <Text style={styles.meta}>Timezone: {profile?.timezone ?? 'Desconocido'}</Text>
        <Text style={styles.meta}>Email: {profile?.email_primary ?? 'Sin email'}</Text>
      </View>

      {status === 'loading' && <Text style={styles.info}>Cargando perfil...</Text>}
      {status === 'error' && (
        <Pressable style={styles.errorCard} onPress={reload}>
          <Text style={styles.errorTitle}>No pudimos cargar tu perfil</Text>
          <Text style={styles.errorBody}>{error?.message ?? 'Error desconocido'}</Text>
          <Text style={styles.errorLink}>Toca para reintentar</Text>
        </Pressable>
      )}

      <View style={styles.sectionList}>
        {sections.map((section) => (
          <Pressable
            key={section.route}
            style={({ pressed }) => [styles.sectionButton, pressed && styles.sectionButtonPressed]}
            onPress={() => navigation.navigate(section.route)}
          >
            <Text style={styles.sectionLabel}>{section.label}</Text>
            <Text style={styles.sectionHint}>Abrir</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
  },
  card: {
    backgroundColor: '#0b0d16',
    borderRadius: 20,
    padding: 20,
    gap: 6,
  },
  greeting: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
  },
  meta: {
    color: '#cbd5f5',
    fontSize: 15,
  },
  info: {
    color: '#cbd5f5',
    fontSize: 14,
  },
  errorCard: {
    backgroundColor: '#33141a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fb7185',
  },
  errorTitle: {
    color: '#fecdd3',
    fontWeight: '700',
    marginBottom: 4,
  },
  errorBody: {
    color: '#fecdd3',
  },
  errorLink: {
    marginTop: 8,
    color: '#f472b6',
    fontWeight: '600',
  },
  sectionList: {
    gap: 12,
  },
  sectionButton: {
    backgroundColor: '#111729',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1f2533',
  },
  sectionButtonPressed: {
    opacity: 0.7,
  },
  sectionLabel: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '600',
  },
  sectionHint: {
    color: '#94a3b8',
    marginTop: 4,
  },
});
