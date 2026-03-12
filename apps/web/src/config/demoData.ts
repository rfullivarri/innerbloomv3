import type { DemoLanguage } from './demoGuidedTour';

export type DemoTask = {
  id: string;
  pillar: 'Body' | 'Mind' | 'Soul';
  name: string;
  weeklyProgress: number;
  streakCurrent: number;
  streakBest: number;
  status: 'fragile' | 'building' | 'strong';
  difficulty: 1 | 2 | 3;
  activity: number[];
};

export const DEMO_TASKS: DemoTask[] = [
  {
    id: 'task-breathing',
    pillar: 'Mind',
    name: 'Mindful breathing · 8 min',
    weeklyProgress: 71,
    streakCurrent: 9,
    streakBest: 21,
    status: 'building',
    difficulty: 2,
    activity: [1, 0, 1, 1, 1, 0, 1],
  },
  {
    id: 'task-walk',
    pillar: 'Body',
    name: 'Walk outside · 20 min',
    weeklyProgress: 86,
    streakCurrent: 13,
    streakBest: 18,
    status: 'strong',
    difficulty: 2,
    activity: [1, 1, 1, 1, 1, 0, 1],
  },
  {
    id: 'task-journal',
    pillar: 'Soul',
    name: 'Gratitude journal',
    weeklyProgress: 42,
    streakCurrent: 3,
    streakBest: 14,
    status: 'fragile',
    difficulty: 1,
    activity: [0, 1, 0, 1, 0, 0, 1],
  },
];

export const DEMO_PILLAR_LABELS: Record<DemoLanguage, Record<DemoTask['pillar'], string>> = {
  es: { Body: 'Body', Mind: 'Mind', Soul: 'Soul' },
  en: { Body: 'Body', Mind: 'Mind', Soul: 'Soul' },
};
