import type { LandingCopy, Language } from './officialLandingContent';

export const LANDING_V3_CONTENT: Record<Language, LandingCopy> = {
  es: {
    navLinks: [],
    hero: {
      titleLead: 'Las apps de hábitos fallan',
      titleHighlight: 'porque no cambian contigo.',
      subtitle:
        'Innerbloom crea un Journey adaptativo: empieza desde tu capacidad real, ajusta la intensidad cuando tu vida cambia y convierte acciones pequeñas en progreso visible.',
      note: 'Empieza simple. Ajusta el ritmo. Sigue avanzando.',
      alt: 'Mockup del dashboard real de Innerbloom en móvil.',
    },
    problem: {
      title: 'No te falta disciplina. Te falta un sistema que se adapte.',
      leftPrimary: 'Una rutina fija funciona solo en días ideales.',
      leftSecondary: 'Cuando baja tu energía, se rompe la racha y aparece la culpa.',
      rightPrimary: 'Innerbloom cambia el plan contigo.',
      rightSecondary: 'Baja la carga cuando cuesta, sube el desafío cuando avanzas y te ayuda a retomar sin empezar de cero.',
    },
    pillars: {
      kicker: 'EQUILIBRIO REAL',
      title: 'Hábitos para cuerpo, mente y vida interior.',
      intro:
        'Body, Mind y Soul ordenan tu progreso sin convertir tu día en una lista infinita.',
      highlightLeadIn: 'Tu progreso se vuelve más claro cuando no depende de una sola parte de vos.',
      highlight: 'Innerbloom te ayuda a sostener energía, foco y calma con acciones posibles.',
      items: [
        { emoji: '🫀', title: 'BODY', copy: 'Movimiento, descanso y recuperación. Tareas sugeridas: • Camina 20 minutos • Duerme mejor' },
        { emoji: '🧠', title: 'MIND', copy: 'Foco, claridad y aprendizaje. Tareas sugeridas: • Lee 10 páginas • Planifica 3 prioridades' },
        { emoji: '🏵️', title: 'SOUL', copy: 'Calma, sentido y vínculos. Tareas sugeridas: • Respira 5 minutos • Escribe a alguien' },
      ],
    },
    modes: {
      kicker: 'AVATAR + RITMO',
      title: 'Tu avatar es identidad. Tu ritmo es intensidad.',
      intro:
        'Red Cat, Green Bear, Blue Amphibian o Violet Owl definen cómo te ves dentro de Innerbloom. Low, Chill, Flow y Evolve definen cuánto puede sostener tu semana.',
      items: [
        { id: 'low', title: 'Red Cat', state: '', goal: 'Avatar visual: podés usarlo con cualquier ritmo.' },
        { id: 'chill', title: 'Green Bear', state: '', goal: 'Avatar visual: identidad sin cambiar dificultad.' },
        { id: 'flow', title: 'Blue Amphibian', state: '', goal: 'Avatar visual: expresión independiente del plan.' },
        { id: 'evolve', title: 'Violet Owl', state: '', goal: 'Avatar visual: presencia sin fijar intensidad.' },
      ],
    },
    how: {
      kicker: 'MÉTODO ADAPTATIVO',
      title: 'Un Journey que empieza simple y aprende de tu progreso.',
      intro:
        'No necesitas llegar con una rutina perfecta. Innerbloom entiende tu punto de partida, propone un ritmo posible y recalibra con señales reales.',
      closingLine: '',
      closingBody: '',
      steps: [
        {
          title: 'Empieza desde tu contexto real.',
          badge: 'Paso 1',
          bullets: ['Un onboarding corto entiende energía, objetivos y fricciones antes de proponerte un plan.'],
          chips: [],
        },
        {
          title: 'Recibe un ritmo sostenible.',
          badge: 'Paso 2',
          bullets: ['Low, Chill, Flow o Evolve definen la intensidad semanal sin depender del avatar que elijas.'],
          chips: [],
        },
        {
          title: 'Avanza con acciones pequeñas.',
          badge: 'Paso 3',
          bullets: ['Body, Mind y Soul convierten intención en acciones concretas, simples de seguir.'],
          chips: [],
        },
        {
          title: 'Recalibra sin volver a empezar.',
          badge: 'Paso 4',
          bullets: ['Tu progreso, ánimo y rachas ayudan a ajustar el siguiente paso cuando tu vida cambia.'],
          chips: [],
        },
      ],
    },
    featureShowcase: { kicker: '', title: '', intro: '', items: [] },
    demo: {
      title: 'Visualiza tu Journey antes de empezarlo.',
      text: 'Tareas, emociones, GP, rachas y balance en una experiencia diseñada para mostrar progreso sin exigirte perfección.',
      banner: 'Mira el producto real antes de iniciar tu onboarding.',
      cta: 'Ver demo',
    },
    testimonials: {
      title: 'Diseñado para seguir, no para castigarte por fallar.',
      intro:
        'Un tracker te muestra si cumpliste. Innerbloom usa lo que pasó para ayudarte a ajustar el ritmo y continuar.',
      items: [
        { quote: '“No necesito empezar perfecto: necesito saber cuál es el siguiente paso posible.”', author: 'Usuario nuevo' },
        { quote: '“Si una semana cuesta, el sistema baja la carga en vez de hacerme sentir que perdí todo.”', author: 'Innerbloom Journey' },
        { quote: '“El avatar es mío, pero el ritmo cambia con mi energía.”', author: 'Ritmo adaptativo' },
      ],
      prev: 'Anterior',
      next: 'Siguiente',
      groupLabel: 'Seleccionar testimonio',
    },
    pricing: { title: '', intro: '', trialHighlight: '', taxNote: '', actionLabel: '', plans: [] },
    faq: {
      title: 'Preguntas frecuentes',
      items: [
        { question: '¿Innerbloom es solo otra app de hábitos?', answer: 'No. Además de registrar hábitos, ajusta ritmo, dificultad y próximos pasos según tu progreso real.' },
        { question: '¿Necesito tener disciplina todos los días?', answer: 'No. La idea es empezar con una carga posible y recalibrar cuando tu energía cambia.' },
        { question: '¿Qué son Low, Chill, Flow y Evolve?', answer: 'Son ritmos semanales de intensidad. Definen cuánto intenta sostener tu semana y pueden cambiar con el tiempo.' },
        { question: '¿El avatar define mi dificultad?', answer: 'No. El avatar define identidad visual. El ritmo define comportamiento, frecuencia y adaptación.' },
        { question: '¿Qué pasa si abandono una semana?', answer: 'Innerbloom usa esa señal para ayudarte a retomar con una carga más realista, sin volver a cero.' },
        { question: '¿A dónde me lleva el CTA principal?', answer: 'Al onboarding, para crear tu punto de partida y comenzar tu Journey.' },
      ],
    },
    next: {
      title: 'Crea un Journey que pueda cambiar contigo.',
      intro: 'Empieza con un ritmo posible y deja que Innerbloom ajuste el camino mientras avanzas.',
    },
    auth: {
      dashboard: 'Dashboard',
      signup: 'Crear cuenta',
      login: 'Iniciar sesión',
      startJourney: 'Comenzar mi Journey',
      guidedDemo: 'Ver demo',
    },
    footer: { copyright: '© Innerbloom. Todos los derechos reservados.', faq: 'FAQ' },
  },
  en: {
    navLinks: [],
    hero: {
      titleLead: 'Habit apps fail',
      titleHighlight: 'because they do not change with you.',
      subtitle:
        'Innerbloom creates an adaptive Journey: it starts from your real capacity, adjusts intensity when life changes, and turns small actions into visible progress.',
      note: 'Start simple. Adjust the rhythm. Keep moving.',
      alt: 'Innerbloom real dashboard phone mockup.',
    },
    problem: {
      title: 'You do not need more guilt. You need a system that adapts.',
      leftPrimary: 'A fixed routine only works on ideal days.',
      leftSecondary: 'When your energy drops, the streak breaks and the app makes it feel like you failed.',
      rightPrimary: 'Innerbloom changes the plan with you.',
      rightSecondary: 'It lowers the load when life gets hard, raises the challenge when you grow, and helps you restart without going back to zero.',
    },
    pillars: {
      kicker: 'REAL BALANCE',
      title: 'Habits for body, mind, and inner life.',
      intro:
        'Body, Mind, and Soul organize your progress without turning your day into an endless list.',
      highlightLeadIn: 'Progress is clearer when it does not depend on one part of you.',
      highlight: 'Innerbloom helps you sustain energy, focus, and calm through doable actions.',
      items: [
        { emoji: '🫀', title: 'BODY', copy: 'Movement, rest, and recovery. Suggested tasks: • Walk 20 minutes • Sleep better' },
        { emoji: '🧠', title: 'MIND', copy: 'Focus, clarity, and learning. Suggested tasks: • Read 10 pages • Plan 3 priorities' },
        { emoji: '🏵️', title: 'SOUL', copy: 'Calm, meaning, and connection. Suggested tasks: • Breathe 5 minutes • Message someone' },
      ],
    },
    modes: {
      kicker: 'AVATAR + RHYTHM',
      title: 'Your avatar is identity. Your rhythm is intensity.',
      intro:
        'Red Cat, Green Bear, Blue Amphibian, and Violet Owl define how you look inside Innerbloom. Low, Chill, Flow, and Evolve define what your week can sustain.',
      items: [
        { id: 'low', title: 'Red Cat', state: '', goal: 'Visual avatar: you can use it with any rhythm.' },
        { id: 'chill', title: 'Green Bear', state: '', goal: 'Visual avatar: identity without changing difficulty.' },
        { id: 'flow', title: 'Blue Amphibian', state: '', goal: 'Visual avatar: expression independent from your plan.' },
        { id: 'evolve', title: 'Violet Owl', state: '', goal: 'Visual avatar: presence without fixed intensity.' },
      ],
    },
    how: {
      kicker: 'ADAPTIVE METHOD',
      title: 'A Journey that starts simple and learns from your progress.',
      intro:
        'No perfect routine required. Innerbloom understands your starting point, gives you a sustainable rhythm, and recalibrates from real signals.',
      closingLine: '',
      closingBody: '',
      steps: [
        { title: 'Start from your real context.', badge: 'Step 1', bullets: ['A short onboarding captures your energy, goals, and friction before suggesting a plan.'], chips: [] },
        { title: 'Get a sustainable rhythm.', badge: 'Step 2', bullets: ['Low, Chill, Flow, or Evolve define weekly intensity without depending on your avatar.'], chips: [] },
        { title: 'Move through small actions.', badge: 'Step 3', bullets: ['Body, Mind, and Soul turn intention into concrete actions that are simple to follow.'], chips: [] },
        { title: 'Recalibrate without restarting.', badge: 'Step 4', bullets: ['Progress, mood, and streaks help adjust the next step when life changes.'], chips: [] },
      ],
    },
    featureShowcase: { kicker: '', title: '', intro: '', items: [] },
    demo: {
      title: 'Visualize your Journey before you start.',
      text: 'Tasks, emotions, GP, streaks, and balance in an experience designed to show progress without demanding perfection.',
      banner: 'See the real product before starting onboarding.',
      cta: 'View demo',
    },
    testimonials: {
      title: 'Built to help you continue, not punish you for missing days.',
      intro:
        'A tracker shows whether you did it. Innerbloom uses what happened to help adjust the rhythm and keep going.',
      items: [
        { quote: '“I do not need to start perfect. I need to know the next possible step.”', author: 'New user' },
        { quote: '“When a week gets hard, the system lowers the load instead of making me feel like I lost everything.”', author: 'Innerbloom Journey' },
        { quote: '“The avatar is mine, but the rhythm changes with my energy.”', author: 'Adaptive rhythm' },
      ],
      prev: 'Previous',
      next: 'Next',
      groupLabel: 'Select testimonial',
    },
    pricing: { title: '', intro: '', trialHighlight: '', taxNote: '', actionLabel: '', plans: [] },
    faq: {
      title: 'Frequently asked questions',
      items: [
        { question: 'Is Innerbloom just another habit app?', answer: 'No. Beyond tracking habits, it adjusts rhythm, difficulty, and next steps from your real progress.' },
        { question: 'Do I need discipline every day?', answer: 'No. The point is to start with a possible load and recalibrate when your energy changes.' },
        { question: 'What are Low, Chill, Flow, and Evolve?', answer: 'They are weekly intensity rhythms. They define what your week tries to sustain and can change over time.' },
        { question: 'Does the avatar define my difficulty?', answer: 'No. The avatar defines visual identity. The rhythm defines behavior, frequency, and adaptation.' },
        { question: 'What happens if I miss a week?', answer: 'Innerbloom uses that signal to help you restart with a more realistic load, without going back to zero.' },
        { question: 'Where does the main CTA take me?', answer: 'To onboarding, so you can create your starting point and begin your Journey.' },
      ],
    },
    next: {
      title: 'Create a Journey that can change with you.',
      intro: 'Start with a possible rhythm and let Innerbloom adjust the path as you progress.',
    },
    auth: {
      dashboard: 'Dashboard',
      signup: 'Create account',
      login: 'Log in',
      startJourney: 'Start my Journey',
      guidedDemo: 'View demo',
    },
    footer: { copyright: '© Innerbloom. All rights reserved.', faq: 'FAQ' },
  },
};
