export type DemoLanguage = 'es' | 'en';

export type GuidedStep = {
  id: string;
  targetSelector: string | null;
  tooltipPlacement?: 'top' | 'right' | 'bottom' | 'left' | 'auto';
  presentation?: 'default' | 'intro-modal';
  title: Record<DemoLanguage, string>;
  body: Record<DemoLanguage, string>;
};

export const DEMO_GUIDED_STEPS: GuidedStep[] = [
  {
    id: 'overall-progress',
    targetSelector: '[data-demo-anchor="overall-progress"]',
    tooltipPlacement: 'bottom',
    title: {
      es: 'Tu progreso',
      en: 'Your progress',
    },
    body: {
      es: 'Aquí ves tu GP, tu Level y cuánto te falta para subir. Cada acción suma y hace visible tu avance.',
      en: 'See your GP, your Level, and how far you are from the next one. Each action adds up and makes your progress visible.',
    },
  },
  {
    id: 'streaks-top',
    targetSelector: '[data-demo-anchor="streaks-top"]',
    tooltipPlacement: 'left',
    title: {
      es: 'Tus mejores streaks',
      en: 'Your top streaks',
    },
    body: {
      es: 'Cambia entre Body, Mind y Soul para ver dónde vienes más constante. Aquí aparecen tus rachas más fuertes.',
      en: 'Switch between Body, Mind, and Soul to see where you’ve been most consistent. Your strongest streaks appear here.',
    },
  },
  {
    id: 'streaks-bottom',
    targetSelector: '[data-demo-anchor="streaks-bottom"]',
    tooltipPlacement: 'left',
    title: {
      es: 'Todas tus tareas',
      en: 'All your tasks',
    },
    body: {
      es: 'Aquí ves el detalle por tarea y puedes cambiar el período: Week, Month o 3M. Sirve para detectar qué estás sosteniendo y qué no.',
      en: 'See the detail for each task and switch the time range: Week, Month, or 3M. It helps you spot what you’re maintaining and what you’re not.',
    },
  },
  {
    id: 'balance',
    targetSelector: '[data-demo-anchor="balance"]',
    tooltipPlacement: 'bottom',
    title: {
      es: 'Tu balance',
      en: 'Your balance',
    },
    body: {
      es: 'Este gráfico muestra cómo se reparte tu progreso entre Body, Mind y Soul. Así ves si estás creciendo de forma equilibrada o cargada a un lado.',
      en: 'This chart shows how your progress is split across Body, Mind, and Soul. It helps you see whether your growth is balanced or leaning to one side.',
    },
  },
  {
    id: 'emotion-chart',
    targetSelector: '[data-demo-anchor="emotion-chart"]',
    tooltipPlacement: 'top',
    title: {
      es: 'Tus emociones en el tiempo',
      en: 'Your emotions over time',
    },
    body: {
      es: 'Aquí ves tu historial emocional por colores. Te ayuda a detectar patrones y entender cómo te has sentido en los últimos días.',
      en: 'See your emotional history by color. It helps you spot patterns and understand how you’ve been feeling over the last days.',
    },
  },
  {
    id: 'daily-energy',
    targetSelector: '[data-demo-anchor="daily-energy"]',
    tooltipPlacement: 'right',
    title: {
      es: 'Tu energía diaria',
      en: 'Your daily energy',
    },
    body: {
      es: 'HP, Mood y Focus muestran cómo estás hoy en Body, Soul y Mind. Si tu energía está bien, es más fácil sostener tus hábitos.',
      en: 'HP, Mood, and Focus show how you are today in Body, Soul, and Mind. When your energy is solid, habits are easier to sustain.',
    },
  },
  {
    id: 'info-dot',
    targetSelector: '[data-demo-anchor="info-dot"]',
    tooltipPlacement: 'left',
    title: {
      es: 'Ayudas rápidas',
      en: 'Quick help',
    },
    body: {
      es: 'Verás estos info dots en secciones clave. Tócalos cuando quieras entender qué significa cada bloque.',
      en: 'You’ll see these info dots in key sections. Tap them anytime to understand what each block means.',
    },
  },
  {
    id: 'daily-quest-intro',
    targetSelector: '[data-demo-anchor="daily-quest-intro"]',
    tooltipPlacement: 'bottom',
    title: {
      es: 'Daily Quest',
      en: 'Daily Quest',
    },
    body: {
      es: 'Esto no es una planificación: es una retrospectiva de ayer. Primero eliges la emoción principal con la que cerraste el día.',
      en: 'This is not planning: it’s a look back at yesterday. First, you choose the main emotion you ended the day with.',
    },
  },
  {
    id: 'daily-quest-moderation',
    targetSelector: '[data-demo-anchor="daily-quest-moderation-content"]',
    tooltipPlacement: 'top',
    title: {
      es: 'Moderación',
      en: 'Moderation',
    },
    body: {
      es: 'Si activaste objetivos como alcohol, tabaco o azúcar, aquí registras si los cumpliste ayer.',
      en: 'If you activated goals like alcohol, tobacco, or sugar, this is where you log whether you met them yesterday.',
    },
  },
  {
    id: 'daily-quest-tasks',
    targetSelector: '[data-demo-anchor="daily-quest-tasks"]',
    tooltipPlacement: 'top',
    title: {
      es: 'Tareas por pilar',
      en: 'Tasks by pillar',
    },
    body: {
      es: 'Aquí marcas qué tareas completaste ayer en Body, Mind y Soul. Eso impacta tu progreso, energía y constancia.',
      en: 'Here you mark which tasks you completed yesterday in Body, Mind, and Soul. That impacts your progress, energy, and consistency.',
    },
  },
  {
    id: 'daily-quest-footer',
    targetSelector: '[data-demo-anchor="daily-quest-footer"]',
    tooltipPlacement: 'top',
    title: {
      es: 'Cierre del día',
      en: 'End of day',
    },
    body: {
      es: 'Aquí ves el resumen final, los GP ganados y el botón para confirmar tu Daily Quest.',
      en: 'Here you see the final summary, the GP earned, and the button to confirm your Daily Quest.',
    },
  },
  {
    id: 'tour-end',
    targetSelector: null,
    tooltipPlacement: 'auto',
    title: {
      es: 'Empieza tu Journey',
      en: 'Start your Journey',
    },
    body: {
      es: 'Ya viste lo esencial. Ahora entra y comienza a usar Innerbloom de verdad, con tu primer paso dentro del dashboard.',
      en: 'You’ve seen the essentials. Now step in and start using Innerbloom for real, beginning with your first step inside the dashboard.',
    },
  },
];

export const ONBOARDING_DEMO_END_STEP: GuidedStep = {
  id: 'tour-end-onboarding',
  targetSelector: null,
  tooltipPlacement: 'auto',
  title: {
    es: 'Ya estás listo',
    en: 'You’re ready',
  },
  body: {
    es: 'Tus primeras tareas ya están preparadas. Entra al dashboard y empieza tu Journey con tu primera Daily Quest.',
    en: 'Your first tasks are ready. Go to your dashboard and start your Journey with your first Daily Quest.',
  },
};

export function buildGuidedSteps(fromOnboarding: boolean): GuidedStep[] {
  if (!fromOnboarding) {
    return DEMO_GUIDED_STEPS;
  }

  return [...DEMO_GUIDED_STEPS.slice(0, -1), ONBOARDING_DEMO_END_STEP];
}
