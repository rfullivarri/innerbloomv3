import type { LandingCopy, Language } from './officialLandingContent';

export const LANDING_V2_CONTENT: Record<Language, LandingCopy> = {
  es: {
    navLinks: [],
    hero: {
      titleLead: 'Hábitos sostenibles para',
      titleHighlight: 'gente real.',
      subtitle:
        'Construí una rutina que cambia con vos: más simple cuando cuesta, más desafiante cuando avanzás.',
      note: 'Progreso real, sin empezar de cero.',
      alt: 'Mockup del dashboard real de Innerbloom en móvil.',
    },
    problem: {
      title: 'Si tu vida cambia, tu rutina debería acompañarte.',
      leftPrimary: 'Cuando arrancás',
      leftSecondary: 'Te ayuda a empezar con hábitos posibles.',
      rightPrimary: 'Cuando cuesta',
      rightSecondary: 'Baja la carga para que puedas retomar.',
    },
    pillars: {
      kicker: 'PILARES',
      title: 'Hábitos para cuerpo, mente y vida interior.',
      intro:
        'Body, Mind y Soul organizan tu progreso sin convertir tu rutina en una lista infinita.',
      highlightLeadIn: 'Cuando avanzás',
      highlight: 'Sube el desafío para que sigas creciendo.',
      items: [
        { emoji: '🫀', title: 'BODY', copy: 'Movimiento, descanso y recuperación.' },
        { emoji: '🧠', title: 'MIND', copy: 'Foco, claridad y aprendizaje.' },
        { emoji: '🏵️', title: 'SOUL', copy: 'Calma, sentido y vínculos.' },
      ],
    },
    modes: {
      kicker: 'RITMOS',
      title: 'No todos necesitan el mismo ritmo.',
      intro: 'Elegí una intensidad sostenible y cambiala cuando tu Journey lo pida.',
      items: [
        { id: 'low', title: 'Low', state: '1x semana', goal: 'Empezar liviano.' },
        { id: 'chill', title: 'Chill', state: '2x semana', goal: 'Crear constancia.' },
        { id: 'flow', title: 'Flow', state: '3x semana', goal: 'Sostener impulso.' },
        { id: 'evolve', title: 'Evolve', state: '4x semana', goal: 'Subir estructura.' },
      ],
    },
    how: {
      kicker: '',
      title: 'Un método que cambia contigo.',
      intro:
        'Tus acciones se convierten en señales para ajustar el ritmo, sostener tu progreso y reconocer cuándo un hábito ya forma parte de tu vida.',
      closingLine: '',
      closingBody: '',
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
          bullets: ['Reduce la carga cuando cuesta y sube el desafío cuando estás listo para avanzar.'],
          chips: [],
        },
        {
          title: 'Convierte acciones en hábitos.',
          badge: 'Paso 4',
          bullets: ['Reconoce qué acciones ya forman parte de tu rutina y guárdalas como logros reales.'],
          chips: [],
        },
      ],
    },
    featureShowcase: { kicker: '', title: '', intro: '', items: [] },
    demo: {
      title: 'Mirá cómo crece tu Journey.',
      text: 'Tareas, GP, rachas, emociones y balance en una experiencia simple de seguir.',
      banner: 'Producto real, progreso real.',
      cta: 'Ver demo',
    },
    testimonials: {
      title: 'Un habit tracker te muestra si cumpliste. Innerbloom te ayuda a seguir.',
      intro: 'Checklists vs Journey adaptativo · Rachas rígidas vs Progreso que permite retomar · Rutina fija vs Ritmo ajustable.',
      items: [
        { quote: '“Fallar se siente como perder” en trackers comunes.', author: 'Habit tracker común' },
        { quote: '“Fallar también da información” dentro de Innerbloom.', author: 'Innerbloom' },
        { quote: 'No solo mide hábitos: ayuda a sostenerlos.', author: 'Innerbloom' },
      ],
      prev: 'Anterior',
      next: 'Siguiente',
      groupLabel: 'Seleccionar testimonio',
    },
    pricing: { title: '', intro: '', trialHighlight: '', taxNote: '', actionLabel: '', plans: [] },
    faq: {
      title: 'Preguntas frecuentes',
      items: [
        { question: '¿Innerbloom es solo un habit tracker?', answer: 'No solo marca hábitos. Te ayuda a sostenerlos adaptando ritmo, dificultad y próximos pasos.' },
        { question: '¿Qué pasa si me cuesta sostener una semana?', answer: 'El sistema baja la carga para que puedas retomar sin empezar de cero.' },
        { question: '¿Cómo se ajusta la experiencia?', answer: 'Tu progreso deja señales (ritmo, GP, rachas, dificultad) que se usan para recalibrar.' },
        { question: '¿Qué son Low, Chill, Flow y Evolve?', answer: 'Son ritmos semanales para elegir intensidad sostenible y cambiarla cuando lo necesites.' },
        { question: '¿Necesito usarla todos los días?', answer: 'No. Está diseñada para ayudarte a seguir, no para exigirte perfección.' },
        { question: '¿Qué incluye el demo?', answer: 'Ves tareas, GP, rachas, emociones y balance en la experiencia real.' },
      ],
    },
    next: {
      title: 'Tu vida cambia. Tu rutina puede cambiar con vos.',
      intro: 'Comenzá con hábitos posibles y ajustá el Journey con el tiempo.',
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
    ...({} as LandingCopy),
    navLinks: [],
    hero: {
      titleLead: 'Sustainable habits for',
      titleHighlight: 'real people.',
      subtitle:
        'Build a routine that changes with you: simpler when life gets hard, more challenging when you’re ready to grow.',
      note: 'Real progress, without starting over.',
      alt: 'Innerbloom real dashboard phone mockup.',
    },
    problem: {
      title: 'When your life changes, your routine should keep up.',
      leftPrimary: 'When you begin',
      leftSecondary: 'It helps you start with habits you can actually sustain.',
      rightPrimary: 'When life gets hard',
      rightSecondary: 'It lowers the load so you can get back on track.',
    },
    pillars: {
      kicker: 'PILLARS',
      title: 'Habits for body, mind, and inner life.',
      intro:
        'Body, Mind, and Soul organize your progress without turning your routine into an endless list.',
      highlightLeadIn: 'When you’re growing',
      highlight: 'It raises the challenge so you can keep moving forward.',
      items: [
        { emoji: '🫀', title: 'BODY', copy: 'Movement, rest, and recovery.' },
        { emoji: '🧠', title: 'MIND', copy: 'Focus, clarity, and learning.' },
        { emoji: '🏵️', title: 'SOUL', copy: 'Calm, meaning, and connection.' },
      ],
    },
    modes: {
      kicker: 'PACE',
      title: 'Not everyone needs the same pace.',
      intro: 'Choose a sustainable intensity and change it when your Journey asks for it.',
      items: [
        { id: 'low', title: 'Low', state: '1x week', goal: 'Start light.' },
        { id: 'chill', title: 'Chill', state: '2x week', goal: 'Build consistency.' },
        { id: 'flow', title: 'Flow', state: '3x week', goal: 'Sustain momentum.' },
        { id: 'evolve', title: 'Evolve', state: '4x week', goal: 'Add structure.' },
      ],
    },
    how: {
      kicker: '',
      title: 'A method that changes with you.',
      intro:
        'Your actions become signals to adjust your pace, sustain your progress, and recognize when a habit has become part of your life.',
      closingLine: '',
      closingBody: '',
      steps: [
        { title: 'Start possible, not perfect.', badge: 'Step 1', bullets: ['Define a real starting point and create habits you can sustain today.'], chips: [] },
        { title: 'Every action leaves a signal.', badge: 'Step 2', bullets: ['Track tasks, GP, streaks, and difficulty to understand how you’re really progressing.'], chips: [] },
        { title: 'Adjust as you go.', badge: 'Step 3', bullets: ['Lower the load when it gets hard and raise the challenge when you’re ready to move forward.'], chips: [] },
        { title: 'Turn actions into habits.', badge: 'Step 4', bullets: ['Recognize which actions are already part of your routine and save them as real achievements.'], chips: [] },
      ],
    },
    featureShowcase: { kicker: '', title: '', intro: '', items: [] },
    demo: {
      title: 'See how your Journey grows.',
      text: 'Tasks, GP, streaks, emotions, and balance in one experience that’s easy to follow.',
      banner: 'Real product, real progress.',
      cta: 'View demo',
    },
    testimonials: {
      title: 'A habit tracker shows whether you did it. Innerbloom helps you keep going.',
      intro: 'Checklists vs Adaptive Journey · Rigid streaks vs Progress that helps you restart · Fixed routine vs Adjustable pace.',
      items: [
        { quote: '“Missing a week feels like losing” in common trackers.', author: 'Common habit tracker' },
        { quote: '“A missed week still becomes information” in Innerbloom.', author: 'Innerbloom' },
        { quote: 'It tracks habits and helps you sustain them.', author: 'Innerbloom' },
      ],
      prev: 'Previous',
      next: 'Next',
      groupLabel: 'Select testimonial',
    },
    pricing: { title: '', intro: '', trialHighlight: '', taxNote: '', actionLabel: '', plans: [] },
    faq: {
      title: 'Frequently asked questions',
      items: [
        { question: 'Is Innerbloom only a habit tracker?', answer: 'It doesn’t just track habits. It helps you sustain them by adjusting pace, difficulty, and next steps.' },
        { question: 'What happens when life gets hard?', answer: 'The system lowers the load so you can restart without going back to zero.' },
        { question: 'How does it adjust the experience?', answer: 'Your progress creates signals (pace, GP, streaks, and difficulty) used to recalibrate.' },
        { question: 'What are Low, Chill, Flow, and Evolve?', answer: 'Weekly paces so you can choose sustainable intensity and change it when needed.' },
        { question: 'Do I need to use it daily?', answer: 'No. It is designed to help you keep going, not demand perfection.' },
        { question: 'What can I see in the demo?', answer: 'Tasks, GP, streaks, emotions, and balance in the real product flow.' },
      ],
    },
    next: {
      title: 'Your life changes. Your routine can change with you.',
      intro: 'Start with possible habits and adjust your Journey over time.',
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
