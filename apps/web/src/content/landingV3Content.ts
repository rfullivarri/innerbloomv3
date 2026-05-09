import type { LandingCopy, Language } from './officialLandingContent';
import { LANDING_V2_CONTENT } from './landingV2Content';

export const LANDING_V3_CONTENT: Record<Language, LandingCopy> = {
  es: {
    ...LANDING_V2_CONTENT.es,
    how: {
      ...LANDING_V2_CONTENT.es.how,
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
          bullets: ['Registra tareas, GP, rachas y dificultad para entender cómo avanzas realmente.'],
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
      title: 'Mira tu Journey.',
      text: 'Energía, emociones, acciones, GP y rachas en una experiencia simple de seguir.',
    },
  },
  en: {
    ...LANDING_V2_CONTENT.en,
    how: {
      ...LANDING_V2_CONTENT.en.how,
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
          bullets: ['Track tasks, GP, streaks, and difficulty to understand how you are really moving.'],
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
      title: 'See your Journey.',
      text: 'Energy, emotions, actions, GP, and streaks in one experience that is easy to follow.',
    },
  },
};
