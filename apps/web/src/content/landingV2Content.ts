import { OFFICIAL_LANDING_CONTENT, type Language, type LandingCopy } from './officialLandingContent';

export const LANDING_V2_CONTENT: Record<Language, LandingCopy> = {
  es: {
    ...OFFICIAL_LANDING_CONTENT.es,
    hero: {
      ...OFFICIAL_LANDING_CONTENT.es.hero,
      titleLead: 'Tu plan',
      titleHighlight: 'se adapta a vos.',
      subtitle: 'Innerbloom crea hábitos según tu nivel real y ajusta el ritmo a medida que avanzas.',
      note: 'Empieza simple. Avanza semana a semana.',
    },
    problem: {
      title: 'No fallas vos. Falla el plan.',
      leftPrimary: 'Las apps comunes te miden.',
      leftSecondary: 'Rachas, checklists y recordatorios.',
      rightPrimary: 'Innerbloom te ajusta.',
      rightSecondary: 'Ritmo, dificultad y próximos pasos.',
    },
    how: {
      ...OFFICIAL_LANDING_CONTENT.es.how,
      kicker: 'CÓMO FUNCIONA',
      title: 'Un sistema semanal, no una rutina fija.',
      intro: 'Empiezas con un plan posible. Innerbloom aprende de tu progreso y recalibra el camino.',
      closingLine: 'Tu plan se adapta a vos.',
      closingBody: 'No es una rutina rígida: el sistema ajusta ritmo e intensidad según tu progreso real.',
      steps: [
        { title: 'Empieza posible', badge: 'PASO 1', bullets: ['Crea hábitos desde tu punto de partida.'], chips: [] },
        { title: 'Registra progreso', badge: 'PASO 2', bullets: ['Completa tareas, suma GP y ve tus rachas.'], chips: [] },
        { title: 'Ajusta el ritmo', badge: 'PASO 3', bullets: ['Sube o baja la intensidad según cómo avanzas.'], chips: [] },
        { title: 'Consolida hábitos', badge: 'PASO 4', bullets: ['Detecta qué ya forma parte de tu rutina.'], chips: [] },
      ],
    },
    demo: {
      title: 'Ve tu progreso tomar forma.',
      text: 'Rachas, balance, emociones y evolución en un solo lugar.',
      banner: 'Producto real, progreso visible.',
      cta: 'Explorar demo',
    },
    modes: {
      ...OFFICIAL_LANDING_CONTENT.es.modes,
      kicker: 'SISTEMA DE RITMO SEMANAL',
      title: 'Elegí un ritmo sostenible.',
      intro: 'Cuatro intensidades para avanzar sin romperte.',
      items: [
        { id: 'low', title: 'LOW', state: '1× semana', goal: 'Empieza liviano.' },
        { id: 'chill', title: 'CHILL', state: '2× semana', goal: 'Crea constancia.' },
        { id: 'flow', title: 'FLOW', state: '3× semana', goal: 'Sostén impulso.' },
        { id: 'evolve', title: 'EVOLVE', state: '4× semana', goal: 'Sube estructura.' },
      ],
    },
    pillars: {
      ...OFFICIAL_LANDING_CONTENT.es.pillars,
      title: 'Hábitos para todo tu sistema.',
      intro: 'Body, Mind y Soul organizan tu progreso sin convertirlo en una lista infinita.',
      items: [
        { emoji: '🫀', title: 'BODY', copy: 'Movimiento, descanso y recuperación.' },
        { emoji: '🧠', title: 'MIND', copy: 'Foco, claridad y aprendizaje.' },
        { emoji: '🏵️', title: 'SOUL', copy: 'Calma, sentido y vínculos.' },
      ],
    },
    testimonials: {
      ...OFFICIAL_LANDING_CONTENT.es.testimonials,
      title: 'Primeras experiencias',
      intro: 'Personas usando Innerbloom para sostener hábitos con más realismo.',
    },
    faq: {
      title: 'Preguntas frecuentes',
      items: [
        { question: '¿Innerbloom es una app de hábitos o un habit tracker?', answer: 'Sí. Pero no se queda solo en registrar hábitos: usa tu progreso para ajustar el plan.' },
        { question: '¿Qué la hace diferente de otras apps de hábitos?', answer: 'No te da una rutina fija. Recalibra ritmo, dificultad y próximos pasos según cómo avanzas.' },
        { question: '¿Cómo funciona el plan adaptativo?', answer: 'Empiezas con hábitos posibles, registras tu progreso y el sistema ajusta la intensidad con el tiempo.' },
        { question: '¿Qué son los ritmos Low, Chill, Flow y Evolve?', answer: 'Son cuatro intensidades semanales para elegir cuánto quieres sostener: de 1 a 4 veces por semana.' },
        { question: '¿Qué pasa si dejo de registrar una semana?', answer: 'No empiezas de cero. Innerbloom puede ayudarte a retomar con una carga más realista.' },
        { question: '¿Necesito usarla todos los días?', answer: 'No necesariamente. El objetivo es sostener un ritmo realista, no llenar la app de checks vacíos.' },
      ],
    },
    next: {
      title: 'Construye hábitos que crezcan con vos.',
      intro: 'Empieza con un plan adaptativo en Innerbloom.',
    },
    auth: {
      ...OFFICIAL_LANDING_CONTENT.es.auth,
      startJourney: 'Crear mi plan adaptativo',
      guidedDemo: 'Ver demo',
    },
  },
  en: {
    ...OFFICIAL_LANDING_CONTENT.en,
    hero: {
      ...OFFICIAL_LANDING_CONTENT.en.hero,
      titleLead: 'Your plan',
      titleHighlight: 'adapts to you.',
      subtitle: 'Innerbloom creates habits from your real starting point and adjusts the pace as you progress.',
      note: 'Start simple. Grow week by week.',
    },
    auth: {
      ...OFFICIAL_LANDING_CONTENT.en.auth,
      startJourney: 'Create my adaptive plan',
      guidedDemo: 'View demo',
    },
    next: {
      title: 'Build habits that grow with you.',
      intro: 'Start with an adaptive plan in Innerbloom.',
    },
  },
};
