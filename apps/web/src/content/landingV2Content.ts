import type { LandingCopy, Language } from './officialLandingContent';

export const LANDING_V2_CONTENT: Record<Language, LandingCopy> = {
  es: {
    navLinks: [],
    hero: {
      titleLead: 'Hábitos sostenibles para',
      titleHighlight: 'gente real.',
      subtitle:
        'Construí un Journey adaptativo: más simple cuando cuesta, más desafiante cuando avanzás.',
      note: 'Ritmo adaptable, progreso visible.',
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
      title: 'Tu avatar no define tu ritmo.',
      intro: 'Red Cat, Green Bear, Blue Amphibian o Violet Owl son identidad visual. Low, Chill, Flow y Evolve son intensidad adaptable.',
      items: [
        { id: 'low', title: 'Low', state: '1x semana', goal: 'Empezar liviano.' },
        { id: 'chill', title: 'Chill', state: '2x semana', goal: 'Crear constancia.' },
        { id: 'flow', title: 'Flow', state: '3x semana', goal: 'Sostener impulso.' },
        { id: 'evolve', title: 'Evolve', state: '4x semana', goal: 'Subir estructura.' },
      ],
    },
    how: {
      kicker: '',
      title: 'Un método simple para días que no siempre son simples.',
      intro:
        'No necesitás una rutina perfecta. Empezás desde donde estás, recibís un ritmo posible y el sistema se ajusta cuando tu vida cambia.',
      closingLine: '',
      closingBody: '',
      steps: [
        {
          title: 'Contás dónde estás.',
          badge: 'Paso 1',
          bullets: ['Un onboarding corto entiende tu energía, objetivos y puntos de fricción.'],
          chips: [],
        },
        {
          title: 'Recibís tu ritmo inicial.',
          badge: 'Paso 2',
          bullets: ['Innerbloom define una intensidad acorde a tu capacidad actual: Low, Chill, Flow o Evolve.'],
          chips: [],
        },
        {
          title: 'Avanzás con misiones pequeñas.',
          badge: 'Paso 3',
          bullets: ['Tu plan se transforma en acciones claras para Body, Mind y Soul.'],
          chips: [],
        },
        {
          title: 'Ajustás sin volver a empezar.',
          badge: 'Paso 4',
          bullets: ['Progreso, ánimo y rachas ayudan al sistema a recalibrar contigo.'],
          chips: [],
        },
      ],
    },
    featureShowcase: { kicker: '', title: '', intro: '', items: [] },
    demo: {
      title: 'Visualizá tu Journey antes de empezarlo.',
      text: 'Energía, emociones, misiones, GP y rachas en una experiencia simple de seguir.',
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
        'Build an adaptive Journey: simpler when life gets hard, more challenging when you’re ready to grow.',
      note: 'Adaptive rhythm, visible progress.',
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
      title: 'Your avatar does not define your rhythm.',
      intro: 'Red Cat, Green Bear, Blue Amphibian, and Violet Owl are visual identity. Low, Chill, Flow, and Evolve are adaptive intensity.',
      items: [
        { id: 'low', title: 'Low', state: '1x week', goal: 'Start light.' },
        { id: 'chill', title: 'Chill', state: '2x week', goal: 'Build consistency.' },
        { id: 'flow', title: 'Flow', state: '3x week', goal: 'Sustain momentum.' },
        { id: 'evolve', title: 'Evolve', state: '4x week', goal: 'Add structure.' },
      ],
    },
    how: {
      kicker: '',
      title: 'A simple method for days that are not always simple.',
      intro:
        'No perfect routine required. Start where you are, get a rhythm that fits, and let the system adjust as life changes.',
      closingLine: '',
      closingBody: '',
      steps: [
        { title: 'Tell us where you are.', badge: 'Step 1', bullets: ['A short onboarding captures your energy, goals, and friction points.'], chips: [] },
        { title: 'Get your starting rhythm.', badge: 'Step 2', bullets: ['Innerbloom defines an intensity that matches your current capacity: Low, Chill, Flow, or Evolve.'], chips: [] },
        { title: 'Move through tiny missions.', badge: 'Step 3', bullets: ['Your plan becomes clear actions across Body, Mind, and Soul.'], chips: [] },
        { title: 'Adjust without restarting.', badge: 'Step 4', bullets: ['Progress, mood, and streaks help the system recalibrate with you.'], chips: [] },
      ],
    },
    featureShowcase: { kicker: '', title: '', intro: '', items: [] },
    demo: {
      title: 'Visualize your Journey before you start.',
      text: 'Energy, emotions, missions, GP, and streaks in one experience that’s easy to follow.',
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
