import type { LandingCopy, Language } from './officialLandingContent';
import { LANDING_V2_CONTENT } from './landingV2Content';

export const LANDING_V3_CONTENT: Record<Language, LandingCopy> = {
  es: {
    ...LANDING_V2_CONTENT.es,
    how: {
      ...LANDING_V2_CONTENT.es.how,
      kicker: 'EL SISTEMA',
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
    testimonials: {
      ...LANDING_V2_CONTENT.es.testimonials,
      title: 'Primeras experiencias',
    },
  },
  en: {
    ...LANDING_V2_CONTENT.en,
    how: {
      ...LANDING_V2_CONTENT.en.how,
      kicker: 'THE SYSTEM',
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
    testimonials: {
      ...LANDING_V2_CONTENT.en.testimonials,
      title: 'Early experience',
    },
  },
};
