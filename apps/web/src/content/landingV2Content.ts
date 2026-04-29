import type { LandingCopy, Language } from './officialLandingContent';

export const LANDING_V2_CONTENT: Record<Language, LandingCopy> = {
  es: {
    navLinks: [],
    hero: {
      titleLead: 'Tu plan se adapta',
      titleHighlight: 'a vos.',
      subtitle: 'Innerbloom crea hábitos según tu nivel real y ajusta el ritmo a medida que avanzas.',
      note: 'Empieza simple. Avanza semana a semana.',
      alt: 'Mockup del dashboard real de Innerbloom en móvil.',
    },
    problem: {
      title: 'No fallas vos. Falla el plan.',
      leftPrimary: 'Las apps comunes te miden.',
      leftSecondary: 'Rachas, checklists y recordatorios.',
      rightPrimary: 'Innerbloom te ajusta.',
      rightSecondary: 'Ritmo, dificultad y próximos pasos.',
    },
    pillars: {
      kicker: 'PROGRESO EN EQUILIBRIO',
      title: 'Hábitos para todo tu sistema.',
      intro: 'Body, Mind y Soul organizan tu progreso sin convertirlo en una lista infinita.',
      highlightLeadIn: 'Constancia con equilibrio.',
      highlight: 'Tu rutina y tus objetivos avanzan mejor cuando sostienes hábitos diarios en balance.',
      items: [
        { emoji: '🫀', title: 'BODY', copy: 'Movimiento, descanso y recuperación.' },
        { emoji: '🧠', title: 'MIND', copy: 'Foco, claridad y aprendizaje.' },
        { emoji: '🏵️', title: 'SOUL', copy: 'Calma, sentido y vínculos.' },
      ],
    },
    modes: {
      kicker: 'AVATARES DE INNERBLOOM',
      title: 'Elige cómo quieres verte dentro del sistema.',
      intro: 'Tu avatar acompaña tu experiencia, pero el centro sigue siendo tu progreso.',
      items: [
        { id: 'low', title: '🐈 RED CAT', state: '', goal: 'Presencia vibrante.' },
        { id: 'chill', title: '🐻 GREEN BEAR', state: '', goal: 'Energía serena.' },
        { id: 'flow', title: '🦎 BLUE AMPHIBIAN', state: '', goal: 'Perfil adaptable.' },
        { id: 'evolve', title: '🦉 VIOLET OWL', state: '', goal: 'Visión y estructura.' },
      ],
    },
    how: {
      kicker: 'CÓMO FUNCIONA',
      title: 'Un sistema semanal, no una rutina fija.',
      intro: 'Empiezas con un plan posible. Innerbloom aprende de tu progreso y recalibra el camino.',
      closingLine: 'Tu plan semanal evoluciona con tu progreso.',
      closingBody: 'No se trata de checks vacíos: se trata de sostener constancia con un ritmo realista.',
      steps: [
        { title: 'Empieza posible', badge: 'PASO 1', bullets: ['Crea hábitos desde tu punto de partida.'], chips: [] },
        { title: 'Registra progreso', badge: 'PASO 2', bullets: ['Completa tareas, suma GP y ve tus rachas.'], chips: [] },
        { title: 'Ajusta el ritmo', badge: 'PASO 3', bullets: ['Sube o baja la intensidad según cómo avanzas.'], chips: [] },
        { title: 'Consolida hábitos', badge: 'PASO 4', bullets: ['Detecta qué ya forma parte de tu rutina.'], chips: [] },
      ],
    },
    featureShowcase: { kicker: '', title: '', intro: '', items: [] },
    demo: {
      title: 'Ve tu progreso tomar forma.',
      text: 'Rachas, balance, emociones y evolución en un solo lugar.',
      banner: 'Producto real, progreso real.',
      cta: 'Explorar demo',
    },
    testimonials: {
      title: 'Primeras experiencias',
      intro: 'Personas usando Innerbloom para sostener hábitos con más realismo.',
      items: [
        { quote: '“Empecé simple y hoy sostengo una rutina real.”', author: 'Usuario beta' },
        { quote: '“Me ayudó a retomar cuando perdí ritmo.”', author: 'Usuario beta' },
        { quote: '“Se siente más humano que un habit tracker fijo.”', author: 'Usuario beta' },
      ], prev: 'Anterior', next: 'Siguiente', groupLabel: 'Seleccionar testimonio',
    },
    pricing: { title: '', intro: '', trialHighlight: '', taxNote: '', actionLabel: '', plans: [] },
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
    next: { title: 'Construye hábitos que crezcan con vos.', intro: 'Empieza con un plan adaptativo en Innerbloom.' },
    auth: { dashboard: 'Dashboard', signup: 'Crear cuenta', login: 'Iniciar sesión', startJourney: 'Crear mi plan adaptativo', guidedDemo: 'Ver demo' },
    footer: { copyright: '© Innerbloom. Todos los derechos reservados.', faq: 'FAQ' },
  },
  en: {
    ...{} as LandingCopy,
    navLinks: [],
    hero: { titleLead: 'Your plan adapts', titleHighlight: 'to you.', subtitle: 'Innerbloom creates habits from your real starting point and adjusts the pace as you progress.', note: 'Start simple. Grow week by week.', alt: 'Innerbloom real dashboard phone mockup.' },
    problem: { title: 'You are not failing. The plan is.', leftPrimary: 'Most apps measure you.', leftSecondary: 'Streaks, checklists, reminders.', rightPrimary: 'Innerbloom adjusts you.', rightSecondary: 'Pace, difficulty, next steps.' },
    pillars: { kicker: 'BALANCED PROGRESS', title: 'Habits for your whole system.', intro: 'Body, Mind, and Soul organize your progress without becoming an endless list.', highlightLeadIn: 'Consistency with balance.', highlight: 'Your weekly plan improves when habits stay realistic.', items: [{ emoji: '🫀', title: 'BODY', copy: 'Movement, rest, and recovery.' },{ emoji: '🧠', title: 'MIND', copy: 'Focus, clarity, and learning.' },{ emoji: '🏵️', title: 'SOUL', copy: 'Calm, meaning, and relationships.' }] },
    modes: { kicker: 'INNERBLOOM AVATARS', title: 'Choose how you want to look in the system.', intro: 'Your avatar supports your experience, but progress remains the center.', items: [{id:'low',title:'🐈 RED CAT',state:'',goal:'Vibrant presence.'},{id:'chill',title:'🐻 GREEN BEAR',state:'',goal:'Calm energy.'},{id:'flow',title:'🦎 BLUE AMPHIBIAN',state:'',goal:'Adaptive profile.'},{id:'evolve',title:'🦉 VIOLET OWL',state:'',goal:'Vision and structure.'}] },
    how: { kicker: 'HOW IT WORKS', title: 'A weekly system, not a fixed routine.', intro: 'Start with a possible plan. Innerbloom learns from progress and recalibrates.', closingLine: 'Your weekly plan evolves with you.', closingBody: 'Build consistency at a sustainable pace.', steps: [{title:'Start possible',badge:'STEP 1',bullets:['Create habits from your starting point.'],chips:[]},{title:'Track progress',badge:'STEP 2',bullets:['Complete tasks, earn GP, and see streaks.'],chips:[]},{title:'Adjust pace',badge:'STEP 3',bullets:['Increase or reduce intensity as you move.'],chips:[]},{title:'Consolidate habits',badge:'STEP 4',bullets:['Detect what is already part of your routine.'],chips:[]}] },
    featureShowcase:{kicker:'',title:'',intro:'',items:[]}, demo:{title:'Watch your progress take shape.',text:'Streaks, balance, emotions, and evolution in one place.',banner:'Real product.',cta:'Explore demo'}, testimonials:{title:'Early experiences',intro:'People using Innerbloom to sustain habits realistically.',items:[{quote:'“Simple start, steady routine now.”',author:'Beta user'},{quote:'“It helped me restart after a rough week.”',author:'Beta user'},{quote:'“More than a fixed habit tracker.”',author:'Beta user'}],prev:'Previous',next:'Next',groupLabel:'Select testimonial'}, pricing:{title:'',intro:'',trialHighlight:'',taxNote:'',actionLabel:'',plans:[]}, faq:{title:'Frequently asked questions',items:[{question:'Is Innerbloom a habit app or a habit tracker?',answer:'Both. But it goes beyond tracking by using progress to adjust your plan.'},{question:'What makes it different?',answer:'It does not lock you into a fixed routine. It recalibrates pace, difficulty, and next steps.'},{question:'How does the adaptive plan work?',answer:'Start with possible habits, track progress, then the system adjusts intensity over time.'},{question:'What are Low, Chill, Flow, and Evolve rhythms?',answer:'Four weekly intensities: from 1 to 4 times per week.'},{question:'What if I skip a week?',answer:'You do not restart from zero. Innerbloom helps you return with a realistic load.'},{question:'Do I need to use it daily?',answer:'Not necessarily. The goal is sustainable consistency.'}]}, next:{title:'Build habits that grow with you.',intro:'Start with an adaptive plan in Innerbloom.'}, auth:{dashboard:'Dashboard',signup:'Create account',login:'Log in',startJourney:'Create my adaptive plan',guidedDemo:'View demo'}, footer:{copyright:'© Innerbloom. All rights reserved.',faq:'FAQ'}
  }
};
