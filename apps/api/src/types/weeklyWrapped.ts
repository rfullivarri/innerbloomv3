export type WeeklyWrappedSection = {
  key: string;
  title: string;
  body: string;
  accent?: string;
  items?: {
    title: string;
    body: string;
    badge?: string;
    pillar?: string | null;
    daysActive?: number;
    weeksActive?: number;
    weeksSample?: number;
  }[];
};

export type WeeklyWrappedPayload = {
  mode: 'final' | 'preview';
  dataSource: 'real' | 'mock';
  variant: 'full' | 'light';
  weekRange: { start: string; end: string };
  summary: {
    pillarDominant: string | null;
    highlight: string | null;
    completions: number;
    xpTotal: number;
    energyHighlight?: { metric: 'HP' | 'FOCUS' | 'MOOD'; value: number };
    effortBalance?: {
      easy: number;
      medium: number;
      hard: number;
      total: number;
      topTask?: { title: string; completions: number; difficulty: string } | null;
      topHardTask?: { title: string; completions: number } | null;
    } | null;
  };
  emotions: EmotionHighlight;
  levelUp: LevelUpHighlight;
  sections: WeeklyWrappedSection[];
};

export type WeeklyWrappedEntry = {
  id: string;
  userId: string;
  weekStart: string;
  weekEnd: string;
  payload: WeeklyWrappedPayload;
  summary: unknown | null;
  createdAt: string;
  updatedAt: string;
};

export type EmotionHighlightEntry = {
  key: EmotionMessageKey;
  label: string;
  tone: string;
  color: string;
  weeklyMessage: string;
  biweeklyContext: string;
};

export type EmotionHighlight = {
  weekly: EmotionHighlightEntry | null;
  biweekly: EmotionHighlightEntry | null;
};

export type EmotionMessageKey =
  | 'felicidad'
  | 'motivacion'
  | 'calma'
  | 'cansancio'
  | 'ansiedad'
  | 'tristeza'
  | 'frustracion';

export type LevelUpHighlight = {
  happened: boolean;
  currentLevel: number | null;
  previousLevel: number | null;
  xpGained: number;
  forced: boolean;
};
