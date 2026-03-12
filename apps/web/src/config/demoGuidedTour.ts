export type DemoLanguage = 'es' | 'en';

export type GuidedStep = {
  id: string;
  targetSelector: string | null;
  tooltipPlacement?: 'top' | 'right' | 'bottom' | 'left' | 'auto';
  title: Record<DemoLanguage, string>;
  body: Record<DemoLanguage, string>;
};

export const DEMO_GUIDED_STEPS: GuidedStep[] = [
  {
    id: 'overall-progress',
    targetSelector: '[data-demo-anchor="overall-progress"]',
    tooltipPlacement: 'bottom',
    title: {
      es: 'Progreso general',
      en: 'Overall progress',
    },
    body: {
      es: 'Aquí ves tu GP total, tu Level y la barra hacia el siguiente nivel. Cada día consistente suma GP, y eso se convierte en crecimiento visible en tu progreso.',
      en: 'Here you can see your total GP, your Level, and the bar to your next level. Daily consistency adds GP, and that turns into visible growth over time.',
    },
  },
  {
    id: 'streaks-top',
    targetSelector: '[data-demo-anchor="streaks-top"]',
    tooltipPlacement: 'left',
    title: {
      es: 'Streaks · parte superior',
      en: 'Streaks · top section',
    },
    body: {
      es: 'Aquí navegas por pilares (Body/Mind/Soul) y ves Top Streaks. Esta parte resume tus rachas más fuertes y te ayuda a comparar en qué dimensión vienes más consistente.',
      en: 'Here you switch across pillars (Body/Mind/Soul) and review Top Streaks. This section summarizes your strongest streaks and helps compare where your consistency is strongest.',
    },
  },
  {
    id: 'streaks-bottom',
    targetSelector: '[data-demo-anchor="streaks-bottom"]',
    tooltipPlacement: 'left',
    title: {
      es: 'Streaks · parte inferior',
      en: 'Streaks · bottom section',
    },
    body: {
      es: 'En esta zona ajustas el scope (Week/Month/3M), revisas All Tasks y su progreso detallado con mini actividad por tarea. Es la vista granular para seguimiento fino.',
      en: 'In this area you switch scope (Week/Month/3M), inspect All Tasks, and track per-task progress with mini activity bars. This is the granular tracking view.',
    },
  },
  {
    id: 'balance',
    targetSelector: '[data-demo-anchor="balance"]',
    tooltipPlacement: 'bottom',
    title: {
      es: 'Equilibrio',
      en: 'Balance',
    },
    body: {
      es: 'Este radar muestra cómo se distribuye tu GP entre pilares y qué pilar predomina. Puedes interactuarlo para entender si tu crecimiento está balanceado o dominado por una dimensión.',
      en: 'This radar chart shows how your GP is distributed across pillars and which one dominates. You can interact with it to see if your growth is balanced or led by one dimension.',
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
      es: 'Aquí tienes tu grilla histórica de emociones, con leyenda por colores, período analizado y emoción más frecuente. Te ayuda a detectar patrones emocionales a lo largo del tiempo.',
      en: 'This is your historical emotion grid, with color legend, analyzed period, and most frequent emotion. It helps you detect emotional patterns over time.',
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
      es: 'HP, Mood y Focus reflejan tu energía diaria (HP→Body, Mood→Soul, Focus→Mind). Las actividades cargan energía, se drena con el tiempo, y mantenerla alta sostiene hábitos y constancia.',
      en: 'HP, Mood, and Focus reflect your daily energy (HP→Body, Mood→Soul, Focus→Mind). Activities recharge it, it drains over time, and keeping it high supports habits and consistency.',
    },
  },
  {
    id: 'daily-quest',
    targetSelector: '[data-demo-anchor="daily-quest"]',
    tooltipPlacement: 'bottom',
    title: {
      es: 'Daily Quest',
      en: 'Daily Quest',
    },
    body: {
      es: 'Desde aquí accedes a tu retrospección diaria: registras emoción predominante, marcas tareas logradas, ganas GP, sostienes rachas y confirmas el día para cerrarlo conscientemente.',
      en: 'From here you access your daily reflection: log your main emotion, mark completed tasks, earn GP, sustain streaks, and confirm your day with intention.',
    },
  },
  {
    id: 'tour-end',
    targetSelector: null,
    tooltipPlacement: 'auto',
    title: {
      es: 'Explora por tu cuenta',
      en: 'Explore by yourself',
    },
    body: {
      es: 'Listo. Ahora puedes explorar el dashboard libremente, interactuar con las cards, usar los info dots para más detalle y salir de la demo con la X cuando quieras.',
      en: 'You are all set. Explore the dashboard freely, interact with the cards, use info dots for deeper details, and exit demo with the X anytime.',
    },
  },
];
