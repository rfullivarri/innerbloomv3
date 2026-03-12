export type DemoLanguage = 'es' | 'en';

export type GuidedStep = {
  id: string;
  targetSelector: string | null;
  tooltipPlacement?: 'top' | 'right' | 'bottom' | 'left' | 'auto';
  title: Record<DemoLanguage, string>;
  body: Record<DemoLanguage, string>;
  ctaLabel?: Record<DemoLanguage, string>;
};

export const DEMO_GUIDED_STEPS: GuidedStep[] = [
  {
    id: 'overall-progress',
    targetSelector: '[data-demo-anchor="overall-progress"]',
    tooltipPlacement: 'bottom',
    title: {
      es: 'Overall Progress',
      en: 'Overall Progress',
    },
    body: {
      es: 'Aquí ves tu Total GP, Level y barra de progreso al próximo nivel. La consistencia diaria suma GP y ese avance se convierte en crecimiento visible.',
      en: 'Here you see your Total GP, Level, and progress bar to the next level. Daily consistency adds GP, and that momentum turns into visible growth.',
    },
  },
  {
    id: 'streaks',
    targetSelector: '[data-demo-anchor="streaks"]',
    tooltipPlacement: 'left',
    title: {
      es: 'Streaks',
      en: 'Streaks',
    },
    body: {
      es: 'Explora tabs por pilar (Body/Mind/Soul), scopes (Week/Month/3M), Top streaks y All tasks. Cada tarea muestra progreso y mini actividad, y puedes entrar a Task Detail como segundo nivel de profundidad.',
      en: 'Explore pillar tabs (Body/Mind/Soul), scopes (Week/Month/3M), Top streaks, and All tasks. Each task shows progress and mini activity bars, and you can open Task Detail as a second depth level.',
    },
  },
  {
    id: 'balance',
    targetSelector: '[data-demo-anchor="balance"]',
    tooltipPlacement: 'bottom',
    title: {
      es: 'Balance',
      en: 'Balance',
    },
    body: {
      es: 'Este radar muestra cómo se distribuye tu GP entre pilares y cuál predomina. Es interactivo y te ayuda a leer tu crecimiento: no busca perfección, sino conciencia y equilibrio.',
      en: 'This radar shows how your GP is distributed across pillars and which one is dominant. It is interactive and helps you read your growth: not about perfection, but awareness and balance.',
    },
  },
  {
    id: 'emotion-chart',
    targetSelector: '[data-demo-anchor="emotion-chart"]',
    tooltipPlacement: 'top',
    title: {
      es: 'Emotion Chart',
      en: 'Emotion Chart',
    },
    body: {
      es: 'Aquí tienes la grilla histórica de emociones con su leyenda por color, período analizado y emoción más frecuente. Te permite leer patrones en el tiempo y entender mejor tu journey.',
      en: 'Here you get the historical emotion grid with color legend, analyzed period, and most frequent emotion. It helps you read patterns over time and better understand your journey.',
    },
  },
  {
    id: 'daily-energy',
    targetSelector: '[data-demo-anchor="daily-energy"]',
    tooltipPlacement: 'right',
    title: {
      es: 'Daily Energy',
      en: 'Daily Energy',
    },
    body: {
      es: 'Daily Energy resume HP, Mood y Focus y su correlación con Body/Soul/Mind. Las actividades cargan energía, se drena con el tiempo, y mantenerla alta sostiene hábitos y constancia.',
      en: 'Daily Energy summarizes HP, Mood, and Focus and how they correlate with Body/Soul/Mind. Activities recharge it, it drains over time, and keeping it high sustains habits and consistency.',
    },
  },
  {
    id: 'daily-quest',
    targetSelector: '[data-demo-anchor="daily-quest"]',
    tooltipPlacement: 'top',
    title: {
      es: 'Daily Quest',
      en: 'Daily Quest',
    },
    body: {
      es: 'Esta es tu retrospección diaria: registras emoción predominante, marcas tareas logradas, ganas GP, sostienes rachas y confirmas el día para cerrar la retrospectiva.',
      en: 'This is your daily reflection: log your dominant emotion, mark completed tasks, earn GP, sustain streaks, and confirm the day to close the retrospective.',
    },
  },
  {
    id: 'tour-end',
    targetSelector: null,
    tooltipPlacement: 'auto',
    title: {
      es: 'Ya puedes explorar libremente',
      en: 'You can now explore freely',
    },
    body: {
      es: 'Perfecto. Ahora puedes seguir explorando el dashboard demo, usar los info dots para más contexto y salir de la demo con la X cuando quieras.',
      en: 'Great. You can now keep exploring the demo dashboard, use info dots for extra context, and exit demo with the X anytime.',
    },
    ctaLabel: {
      es: 'Start my journey',
      en: 'Start my journey',
    },
  },
];
