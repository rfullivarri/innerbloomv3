import type { DemoLanguage } from './demoGuidedTour';

export const DEMO_LANGUAGE_STORAGE_KEY = 'innerbloom.demo.language';

type DemoCopy = {
  title: string;
  info: string;
};

type DemoDictionary = {
  exitLabel: string;
  landingCta: string;
  openTaskDetail: string;
  closeTaskDetail: string;
  taskDetailTitle: string;
  taskDetailSections: {
    weeklyProgress: string;
    status: string;
    activity: string;
    currentStreak: string;
    bestStreak: string;
    difficulty: string;
  };
  habitStates: {
    fragile: string;
    building: string;
    strong: string;
  };
  cards: Record<string, DemoCopy>;
};

export const DEMO_COPY: Record<DemoLanguage, DemoDictionary> = {
  es: {
    exitLabel: 'Salir demo',
    landingCta: 'Ver demo',
    openTaskDetail: 'Abrir Task Detail',
    closeTaskDetail: 'Cerrar detalle',
    taskDetailTitle: 'Task Detail',
    taskDetailSections: {
      weeklyProgress: 'Progreso semanal',
      status: 'Estado del hábito',
      activity: 'Actividad',
      currentStreak: 'Racha actual',
      bestStreak: 'Mejor racha',
      difficulty: 'Dificultad',
    },
    habitStates: {
      fragile: 'Hábito frágil',
      building: 'En construcción',
      strong: 'Hábito fuerte',
    },
    cards: {
      overallProgress: {
        title: 'Overall Progress',
        info: 'Total GP, nivel y avance al próximo hito.',
      },
      balance: {
        title: 'Balance',
        info: 'Distribución de GP por pilares con predominio actual.',
      },
      dailyEnergy: {
        title: 'Daily Energy',
        info: 'HP, Mood y Focus: sube con acciones y cae con el tiempo.',
      },
      emotionChart: {
        title: 'Emotion Chart',
        info: 'Histórico emocional con leyenda por color y emoción predominante.',
      },
      streaks: {
        title: 'Streaks',
        info: 'Rachas por pilar y período. Abre tareas para ver su Task Detail demo.',
      },
      dailyQuest: {
        title: 'Daily Quest',
        info: 'Retrospección diaria para emoción, tareas y confirmación del día.',
      },
      dailyCultivation: {
        title: 'Daily Cultivation',
        info: 'Ideas breves para sostener ritmo incluso en días de baja energía.',
      },
      moderation: {
        title: 'Moderation',
        info: 'Señales de equilibrio para prevenir exceso y sostener constancia.',
      },
    },
  },
  en: {
    exitLabel: 'Exit demo',
    landingCta: 'Start demo',
    openTaskDetail: 'Open Task Detail',
    closeTaskDetail: 'Close detail',
    taskDetailTitle: 'Task Detail',
    taskDetailSections: {
      weeklyProgress: 'Weekly progress',
      status: 'Habit state',
      activity: 'Activity',
      currentStreak: 'Current streak',
      bestStreak: 'Best streak',
      difficulty: 'Difficulty',
    },
    habitStates: {
      fragile: 'Fragile habit',
      building: 'Building habit',
      strong: 'Strong habit',
    },
    cards: {
      overallProgress: {
        title: 'Overall Progress',
        info: 'Total GP, level, and next milestone progress.',
      },
      balance: {
        title: 'Balance',
        info: 'GP distribution by pillars with current dominance.',
      },
      dailyEnergy: {
        title: 'Daily Energy',
        info: 'HP, Mood, and Focus: rises with actions and drains over time.',
      },
      emotionChart: {
        title: 'Emotion Chart',
        info: 'Emotional history with color legend and most frequent mood.',
      },
      streaks: {
        title: 'Streaks',
        info: 'Streaks by pillar and period. Open tasks to explore demo Task Detail.',
      },
      dailyQuest: {
        title: 'Daily Quest',
        info: 'Daily reflection for emotion, tasks, and day confirmation.',
      },
      dailyCultivation: {
        title: 'Daily Cultivation',
        info: 'Micro-actions to keep your rhythm alive, even on low energy days.',
      },
      moderation: {
        title: 'Moderation',
        info: 'Balance signals that prevent overtraining and protect consistency.',
      },
    },
  },
};

export function resolveDemoLanguage(): DemoLanguage {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const storedLanguage = window.localStorage.getItem(DEMO_LANGUAGE_STORAGE_KEY);
  if (storedLanguage === 'es' || storedLanguage === 'en') {
    return storedLanguage;
  }

  const browserLanguage = window.navigator.language?.toLowerCase() ?? '';
  return browserLanguage.startsWith('es') ? 'es' : 'en';
}

