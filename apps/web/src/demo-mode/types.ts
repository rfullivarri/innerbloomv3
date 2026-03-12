export type DemoLanguage = 'es' | 'en';

export type DemoTask = {
  id: string;
  title: string;
  pillar: 'Body' | 'Mind' | 'Soul';
  progress: number;
  status: 'in_progress' | 'done';
};

export type DemoEmotionDay = {
  day: string;
  value: number;
};

export type DemoModerationItem = {
  key: 'alcohol' | 'tobacco' | 'sugar';
  status: 'ok' | 'watch';
};

export type DemoDashboardData = {
  overallProgress: { level: number; xp: number; xpToNext: number; completion: number };
  streaks: { current: number; best: number; weeklyTarget: number };
  balance: { body: number; mind: number; soul: number };
  dailyEnergy: { hp: number; mood: number; focus: number };
  dailyQuest: { title: string; reward: number; status: 'in_progress' | 'done' };
  dailyCultivation: { todayXp: number; weekXp: number; consistency: number };
  tasks: DemoTask[];
  emotions: DemoEmotionDay[];
  moderation: DemoModerationItem[];
};
