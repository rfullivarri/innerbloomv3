import type { DemoDashboardData } from './types';

export const DEMO_DASHBOARD_DATA: DemoDashboardData = {
  overallProgress: { level: 7, xp: 12480, xpToNext: 1520, completion: 74 },
  streaks: { current: 9, best: 18, weeklyTarget: 12 },
  balance: { body: 72, mind: 69, soul: 77 },
  dailyEnergy: { hp: 76, mood: 71, focus: 82 },
  dailyQuest: { title: 'Caminar 20 min al sol', reward: 120, status: 'in_progress' },
  dailyCultivation: { todayXp: 340, weekXp: 2010, consistency: 83 },
  tasks: [
    { id: 'task-1', title: 'Respirar 5 minutos', pillar: 'Soul', progress: 100, status: 'done' },
    { id: 'task-2', title: 'Planificar 3 prioridades', pillar: 'Mind', progress: 66, status: 'in_progress' },
    { id: 'task-3', title: 'Dormir 7 horas', pillar: 'Body', progress: 80, status: 'in_progress' },
  ],
  emotions: [
    { day: 'Mon', value: 68 },
    { day: 'Tue', value: 72 },
    { day: 'Wed', value: 70 },
    { day: 'Thu', value: 74 },
    { day: 'Fri', value: 78 },
    { day: 'Sat', value: 75 },
    { day: 'Sun', value: 81 },
  ],
  moderation: [
    { key: 'alcohol', status: 'ok' },
    { key: 'tobacco', status: 'ok' },
    { key: 'sugar', status: 'watch' },
  ],
};
