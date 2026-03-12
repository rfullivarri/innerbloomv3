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
    id: 'info-dot',
    targetSelector: '[data-demo-anchor="info-dot"]',
    tooltipPlacement: 'left',
    title: {
      es: 'Info Dots',
      en: 'Info Dots',
    },
    body: {
      es: 'Cada sección importante tiene un info dot como este. Ahí puedes revisar qué significa cada bloque y cómo leer cada card. Si tienes dudas, vuelve a consultar ese botón.',
      en: 'Each key section has an info dot like this one. Use it to understand what each block means and how to read each card. If you have doubts, return to this button anytime.',
    },
  },
  {
    id: 'daily-quest-intro',
    targetSelector: '[data-demo-anchor="daily-quest-intro"]',
    tooltipPlacement: 'bottom',
    title: {
      es: 'Daily Quest · retrospectiva y emoción',
      en: 'Daily Quest · retrospective and emotion',
    },
    body: {
      es: 'Daily Quest es una retrospectiva de ayer: no cargas lo que harás hoy, registras lo que lograste. El primer paso obligatorio es elegir la emoción predominante (Innerbloom trabaja con 7 emociones base).',
      en: 'Daily Quest is a retrospective for yesterday: you are not planning today, you are logging what you achieved. The required first step is selecting your dominant emotion (Innerbloom uses 7 core emotions).',
    },
  },
  {
    id: 'daily-quest-moderation',
    targetSelector: '[data-demo-anchor="daily-quest-moderation"]',
    tooltipPlacement: 'top',
    title: {
      es: 'Daily Quest · moderación',
      en: 'Daily Quest · moderation',
    },
    body: {
      es: 'Si tienes widgets de moderación activos (como alcohol, tabaco o azúcar), aquí registras si cumpliste o no. Esta sección refleja tus objetivos diarios de moderación.',
      en: 'If you have moderation widgets active (such as alcohol, tobacco, or sugar), you log compliance here. This section reflects your daily moderation goals.',
    },
  },
  {
    id: 'daily-quest-tasks',
    targetSelector: '[data-demo-anchor="daily-quest-tasks"]',
    tooltipPlacement: 'top',
    title: {
      es: 'Daily Quest · tareas por pilar',
      en: 'Daily Quest · tasks by pillar',
    },
    body: {
      es: 'Las tareas se organizan por pilares (Body / Mind / Soul). Aquí marcas qué completaste ayer, y eso conecta con tu progreso, energía, constancia y evolución en el sistema.',
      en: 'Tasks are organized by pillars (Body / Mind / Soul). Here you mark what you completed yesterday, connecting directly to your progress, energy, consistency, and system evolution.',
    },
  },
  {
    id: 'daily-quest-footer',
    targetSelector: '[data-demo-anchor="daily-quest-footer"]',
    tooltipPlacement: 'top',
    title: {
      es: 'Daily Quest · cierre',
      en: 'Daily Quest · close-out',
    },
    body: {
      es: 'En el footer ves el resumen final: GP ganados en la retrospectiva y botón Confirmar para cerrar la Daily Quest del día.',
      en: 'In the footer you see the final summary: GP gained from the retrospective and the Confirm button to close that day’s Daily Quest.',
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

export const ONBOARDING_DEMO_END_STEP: GuidedStep = {
  id: 'tour-end-onboarding',
  targetSelector: null,
  tooltipPlacement: 'auto',
  title: {
    es: 'Tu demo guiada terminó',
    en: 'Your guided demo is complete',
  },
  body: {
    es: '¡Buen comienzo! Tus primeras tareas ya están listas (o casi listas). Ahora entra a tu dashboard para iniciar tu Journey y avanzar con tu primer Daily Quest.',
    en: 'Great start! Your first tasks are ready (or almost ready). Now jump into your dashboard to begin your Journey and move forward with your first Daily Quest.',
  },
};

export function buildGuidedSteps(fromOnboarding: boolean): GuidedStep[] {
  if (!fromOnboarding) {
    return DEMO_GUIDED_STEPS;
  }

  return [...DEMO_GUIDED_STEPS.slice(0, -1), ONBOARDING_DEMO_END_STEP];
}
