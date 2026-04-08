import type { GuidedStep } from './demoGuidedTour';

export const LABS_LOGROS_GUIDED_STEPS: GuidedStep[] = [
  {
    id: 'logros-intro',
    targetSelector: '[data-demo-anchor="logros-intro"]',
    tooltipPlacement: 'bottom',
    title: { es: 'Logros', en: 'Achievements' },
    body: {
      es: 'Aquí ves hábitos que ya lograste, y el progreso repetido que te acerca a consolidar los próximos.',
      en: 'Here you see habits you already achieved and repeated progress that gets you closer to consolidating the next ones.',
    },
  },
  {
    id: 'logros-shelves',
    targetSelector: '[data-demo-anchor="logros-shelves"]',
    tooltipPlacement: 'bottom',
    title: { es: 'Estantes de Logros', en: 'Achievement shelves' },
    body: {
      es: 'Se divide en Cuerpo, Mente y Alma. Cada tarea puede convertirse en un sello: algunas ya están logradas y otras siguen en camino.',
      en: 'It is divided into Body, Mind, and Soul. Every task can become a seal: some are achieved and others are still in progress.',
    },
  },
  {
    id: 'logros-achieved-card',
    targetSelector: '[data-demo-anchor="logros-achieved-card"]',
    tooltipPlacement: 'top',
    title: { es: 'Sello desbloqueado', en: 'Unlocked seal' },
    body: {
      es: 'Cuando sostienes una tarea con suficiente constancia, se desbloquea su sello.',
      en: 'When you keep a task consistent enough, its seal gets unlocked.',
    },
  },
  {
    id: 'logros-achievement-front',
    targetSelector: '[data-demo-anchor="logros-achievement-front"]',
    tooltipPlacement: 'bottom',
    title: { es: 'Vista frontal', en: 'Front face' },
    body: {
      es: 'Esta carta se abre automáticamente para mostrarte el sello logrado en grande.',
      en: 'This card opens automatically so you can see the achieved seal up close.',
    },
  },
  {
    id: 'logros-achievement-back',
    targetSelector: '[data-demo-anchor="logros-achievement-back"]',
    tooltipPlacement: 'bottom',
    title: { es: 'Reverso del logro', en: 'Achievement back side' },
    body: {
      es: 'Aquí ves fecha de logro, rasgo asociado, GP de referencia y el control de mantener activo.',
      en: 'Here you see achieved date, associated trait, reference GP, and keep-active control.',
    },
  },
  {
    id: 'logros-blocked-card',
    targetSelector: '[data-demo-anchor="logros-blocked-card"]',
    tooltipPlacement: 'bottom',
    title: { es: 'Sello bloqueado', en: 'Locked seal' },
    body: {
      es: 'Este hábito todavía no alcanzó criterio de hábito logrado. Sigue en construcción.',
      en: 'This habit has not reached achieved-habit criteria yet. It is still under construction.',
    },
  },
  {
    id: 'logros-seal-path',
    targetSelector: '[data-demo-anchor="logros-seal-path"]',
    tooltipPlacement: 'bottom',
    title: { es: 'Ruta del sello', en: 'Seal path' },
    body: {
      es: 'Abrimos automáticamente la ruta del sello para ver cómo evoluciona un hábito bloqueado.',
      en: 'We auto-open the seal path so you can inspect how a locked habit evolves.',
    },
  },
  {
    id: 'logros-seal-concept',
    targetSelector: '[data-demo-anchor="logros-seal-path"]',
    tooltipPlacement: 'top',
    title: { es: 'Cómo se consolida', en: 'How consolidation works' },
    body: {
      es: 'No alcanza con hacerlo pocas veces: se consolida sosteniendo repetición en el tiempo. En Innerbloom se trata como logrado cuando mantienes cumplimiento alto durante tres meses.',
      en: 'Doing it a few times is not enough: consolidation comes from sustained repetition. In Innerbloom it is considered achieved when high compliance is maintained for three months.',
    },
  },
  {
    id: 'logros-seal-score',
    targetSelector: '[data-demo-anchor="logros-seal-path"] [data-testid="score-block"]',
    tooltipPlacement: 'left',
    title: { es: 'Score', en: 'Score' },
    body: {
      es: 'Resume qué tan consolidado está el hábito. No es GP: es lectura de progreso del hábito.',
      en: 'It summarizes how consolidated the habit is. It is not GP: it is the habit progress readout.',
    },
  },
  {
    id: 'logros-seal-scale',
    targetSelector: '[data-demo-anchor="logros-seal-path"] [data-testid="score-range-rail"]',
    tooltipPlacement: 'top',
    title: { es: 'Escala de solidez', en: 'Strength scale' },
    body: {
      es: 'Frágil / en construcción / fuerte muestra el nivel actual de solidez según consistencia acumulada, no por un día aislado.',
      en: 'Fragile / building / strong shows current strength based on accumulated consistency, not a single day.',
    },
  },
  {
    id: 'logros-seal-months',
    targetSelector: '[data-demo-anchor="logros-seal-path"] [data-testid="recent-timeline"]',
    tooltipPlacement: 'top',
    title: { es: 'Últimos meses', en: 'Recent months' },
    body: {
      es: 'Aquí se ve si mes a mes alcanzaste el umbral necesario. Importa sostener varios meses buenos, no solo uno.',
      en: 'Here you see whether each month reached the required threshold. Sustaining several good months matters more than one.',
    },
  },
  {
    id: 'logros-weekly',
    targetSelector: '[data-demo-anchor="logros-weekly"]',
    tooltipPlacement: 'top',
    title: { es: 'Weekly Wrap-Up', en: 'Weekly Wrap-Up' },
    body: {
      es: 'Resume la semana anterior e incluye contador hacia el próximo weekly.',
      en: 'It summarizes the previous week and includes a countdown to the next weekly.',
    },
  },
  {
    id: 'logros-monthly',
    targetSelector: '[data-demo-anchor="logros-monthly"]',
    tooltipPlacement: 'top',
    title: { es: 'Monthly Wrap-Up', en: 'Monthly Wrap-Up' },
    body: {
      es: 'Resume el mes anterior e incluye contador hacia el próximo monthly.',
      en: 'It summarizes the previous month and includes a countdown to the next monthly.',
    },
  },
  {
    id: 'logros-end',
    targetSelector: null,
    tooltipPlacement: 'auto',
    title: { es: 'Cierre', en: 'Wrap-up' },
    body: {
      es: 'Logros muestra lo que ya consolidaste, y también el camino para consolidar lo siguiente.',
      en: 'Achievements show what you already consolidated and the path to consolidate what comes next.',
    },
  },
];
