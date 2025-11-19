import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardHomeScreen from '../screens/DashboardHomeScreen';
import DailyQuestScreen from '../screens/DailyQuestScreen';
import MissionsScreen from '../screens/MissionsScreen';
import TasksScreen from '../screens/TasksScreen';
import SchedulerScreen from '../screens/SchedulerScreen';
import { BackendUserProvider } from '../hooks/useBackendUser';

export type DashboardStackParamList = {
  DashboardHome: undefined;
  DailyQuest: undefined;
  Missions: undefined;
  Tasks: undefined;
  Scheduler: undefined;
};

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export default function DashboardNavigator() {
  return (
    <BackendUserProvider>
      <Stack.Navigator>
        <Stack.Screen
          name="DashboardHome"
          component={DashboardHomeScreen}
          options={{ title: 'Dashboard' }}
        />
        <Stack.Screen name="DailyQuest" component={DailyQuestScreen} options={{ title: 'Daily Quest' }} />
        <Stack.Screen name="Missions" component={MissionsScreen} options={{ title: 'Misiones v2' }} />
        <Stack.Screen name="Tasks" component={TasksScreen} options={{ title: 'Tareas' }} />
        <Stack.Screen name="Scheduler" component={SchedulerScreen} options={{ title: 'Scheduler' }} />
      </Stack.Navigator>
    </BackendUserProvider>
  );
}
