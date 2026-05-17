import type { LandingCopy, Language } from './officialLandingContent';
import { LANDING_V2_CONTENT } from './landingV2Content';

export const LANDING_V3_CONTENT: Record<Language, LandingCopy> = {
  es: {
    ...LANDING_V2_CONTENT.es,
    hero: {
      titleLead: 'Hábitos sostenibles para',
      titleHighlight: 'personas reales.',
      subtitle:
        'Construí un Journey adaptativo: más simple cuando la vida se pone difícil, más desafiante cuando estás listo para crecer.',
      note: 'Ritmo adaptativo, progreso visible.',
      alt: 'Innerbloom adaptive habit dashboard shown on a mobile mockup.',
    },
    problem: {
      title: 'No te falta disciplina. Te falta un sistema que se adapte.',
      leftPrimary: 'Una rutina fija funciona solo en días ideales.',
      leftSecondary: 'Cuando baja tu energía, se rompe la racha y aparece la culpa.',
      rightPrimary: 'Innerbloom cambia el plan contigo.',
      rightSecondary:
        'Baja la carga cuando cuesta, sube el desafío cuando avanzas y te ayuda a retomar sin empezar de cero.',
    },
    how: {
      ...LANDING_V2_CONTENT.es.how,
      kicker: 'MÉTODO ADAPTATIVO',
      title: 'Un Journey que empieza simple y aprende de tu progreso.',
      intro:
        'No necesitas llegar con una rutina perfecta. Innerbloom entiende tu punto de partida, propone un ritmo posible y recalibra con señales reales.',
      steps: [
        {
          title: 'Empieza posible, no perfecto.',
          badge: 'Paso 1',
          bullets: ['Define un punto de partida real y crea hábitos que puedas sostener hoy.'],
          chips: [],
        },
        {
          title: 'Cada acción deja una señal.',
          badge: 'Paso 2',
          bullets: ['Registra tus acciones y emociones diarias para entender cómo avanzas a través de tus rachas y progreso.'],
          chips: [],
        },
        {
          title: 'Ajusta sobre la marcha.',
          badge: 'Paso 3',
          bullets: ['Innerbloom usa tu progreso para adaptar la dificultad y el ritmo sin obligarte a empezar de cero.'],
          chips: [],
        },
        {
          title: 'Crece cuando estás listo.',
          badge: 'Paso 4',
          bullets: ['Cuando sostienes tus hábitos, el sistema te ayuda a subir el ritmo y reconocer tu evolución.'],
          chips: [],
        },
      ],
    },
    demo: {
      ...LANDING_V2_CONTENT.es.demo,
      title: 'Haz visible tu progreso',
      text: 'Energía, emociones, acciones, GP y rachas en una experiencia simple de seguir.',
      banner: 'Explora cómo se ve tu crecimiento',
      cta: 'Explorar demo',
    },
    auth: {
      ...LANDING_V2_CONTENT.es.auth,
      startJourney: 'Comenzar mi Journey',
      guidedDemo: 'Demos',
    },
    testimonials: {
      ...LANDING_V2_CONTENT.es.testimonials,
      title: 'Primeras experiencias',
    },
  },
  en: {
    ...LANDING_V2_CONTENT.en,
    hero: {
      titleLead: 'Sustainable habits for',
      titleHighlight: 'real people.',
      subtitle:
        'Build an adaptive Journey: simpler when life gets hard, more challenging when you’re ready to grow.',
      note: 'Adaptive rhythm, visible progress.',
      alt: 'Innerbloom adaptive habit dashboard shown on a mobile mockup.',
    },
    problem: {
      title: 'You do not need more guilt. You need a system that adapts.',
      leftPrimary: 'A fixed routine only works on ideal days.',
      leftSecondary: 'When your energy drops, the streak breaks and the app makes it feel like you failed.',
      rightPrimary: 'Innerbloom changes the plan with you.',
      rightSecondary:
        'It lowers the load when life gets hard, raises the challenge when you grow, and helps you restart without going back to zero.',
    },
    how: {
      ...LANDING_V2_CONTENT.en.how,
      kicker: 'ADAPTIVE METHOD',
      title: 'A Journey that starts simple and learns from your progress.',
      intro:
        'No perfect routine required. Innerbloom understands your starting point, gives you a sustainable rhythm, and recalibrates from real signals.',
      steps: [
        {
          title: 'Start possible, not perfect.',
          badge: 'Step 1',
          bullets: ['Define a real starting point and create habits you can sustain today.'],
          chips: [],
        },
        {
          title: 'Every action leaves a signal.',
          badge: 'Step 2',
          bullets: ['Log your daily actions and emotions to see how your streaks and progress evolve.'],
          chips: [],
        },
        {
          title: 'Adjust as you go.',
          badge: 'Step 3',
          bullets: ['Innerbloom uses your progress to adapt difficulty and rhythm without forcing you to start over.'],
          chips: [],
        },
        {
          title: 'Grow when you are ready.',
          badge: 'Step 4',
          bullets: ['When you sustain your habits, the system helps you raise the rhythm and recognize your evolution.'],
          chips: [],
        },
      ],
    },
    demo: {
      ...LANDING_V2_CONTENT.en.demo,
      title: 'Make visible your progress',
      text: 'Energy, emotions, actions, GP, and streaks in one experience that is easy to follow.',
      banner: 'Explore what your growth looks like',
      cta: 'Explore demo',
    },
    auth: {
      ...LANDING_V2_CONTENT.en.auth,
      startJourney: 'Start my Journey',
      guidedDemo: 'Demos',
    },
    testimonials: {
      ...LANDING_V2_CONTENT.en.testimonials,
      title: 'Early experience',
    },
  },
};
