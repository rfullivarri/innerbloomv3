export type Language = 'es' | 'en';

type NavLink = { href: string; label: string };
type Pillar = { emoji: string; title: string; copy: string };
type Mode = { id: 'low' | 'chill' | 'flow' | 'evolve'; title: string; state: string; goal: string };
type HowStep = { title: string; copy: string };
type Testimonial = { quote: string; author: string };
type Faq = { question: string; answer: string };
type AuthCopy = {
  dashboard: string;
  signup: string;
  login: string;
  startJourney: string;
};

export type LandingCopy = {
  navLinks: NavLink[];
  hero: {
    titleLead: string;
    titleHighlight: string;
    subtitle: string;
    note: string;
    alt: string;
  };
  pillars: { title: string; intro: string; highlight: string; items: Pillar[] };
  modes: { title: string; intro: string; items: Mode[] };
  how: { title: string; intro: string; steps: HowStep[] };
  testimonials: { title: string; intro: string; items: Testimonial[]; prev: string; next: string; groupLabel: string };
  faq: { title: string; items: Faq[] };
  next: { title: string; intro: string };
  auth: AuthCopy;
  footer: { copyright: string; faq: string };
};

export const OFFICIAL_LANDING_CONTENT: Record<Language, LandingCopy> = {
  es: {
    navLinks: [],
    hero: {
      titleLead: 'Convierte la experiencia en hábitos.',
      titleHighlight: 'Convierte los hábitos en camino',
      subtitle:
        'Tus hábitos son el mapa. Tu constancia, el nivel que alcanzas. Es tu self-improvement journey con equilibrio entre Cuerpo, Mente y Alma.',
      note: 'En menos de 3 minutos generamos tu base personalizada con IA.',
      alt: 'Niño mirando una esfera de energía violeta en el cielo nocturno — Gamification Journey'
    },
    pillars: {
      title: 'Nuestros pilares fundamentales',
      intro:
        'El progreso sostenible necesita equilibrio. 🫀 Cuerpo para la energía y la salud, 🧠 Mente para el foco y el aprendizaje, y 🏵️ Alma para el bienestar emocional y el sentido. Cuando uno cae, los otros dos lo sostienen. Cuando se alinean, tu progreso se acelera.',
      highlight: 'Observate por primera vez en tercera persona y toma el control de tus acciones y hábitos.',
      items: [
        {
          emoji: '🫀',
          title: 'Cuerpo',
          copy: 'Tu cuerpo es el sustrato del hábito: sueño, nutrición y movimiento marcan tu disponibilidad de energía diaria (HP).'
        },
        {
          emoji: '🧠',
          title: 'Mente',
          copy: 'La mente filtra y prioriza. Sin foco, no hay consistencia. Diseñamos sesiones simples para sostener la atención, el aprendizaje y la creatividad.'
        },
        {
          emoji: '🏵️',
          title: 'Alma',
          copy: 'Las emociones, los vínculos y el propósito estabilizan el sistema. Sin esto, los hábitos no atraviesan semanas ni meses.'
        }
      ]
    },
    modes: {
      title: 'Modula tu modo de juego',
      intro: 'Cambia según tu momento. El sistema se adapta a tu energía.',
      items: [
        {
          id: 'low',
          title: '🪫 LOW MOOD',
          state: 'sin energía, abrumado.',
          goal: 'activar tu mínimo vital con acciones pequeñas y sostenibles.'
        },
        {
          id: 'chill',
          title: '🍃 CHILL MOOD',
          state: 'relajado y estable.',
          goal: 'sostener bienestar con rutinas suaves y balanceadas.'
        },
        {
          id: 'flow',
          title: '🌊 FLOW MOOD',
          state: 'enfocado y en movimiento.',
          goal: 'aprovechar el impulso con un plan alineado a metas concretas.'
        },
        {
          id: 'evolve',
          title: '🧬 EVOLVE MOOD',
          state: 'ambicioso y determinado.',
          goal: 'sistema retador con Hábitos Atómicos, misiones y recompensas.'
        }
      ]
    },
    how: {
      title: 'Cómo funciona',
      intro: 'Un flujo claro, de la activación a la constancia.',
      steps: [
        {
          title: 'Define tu camino',
          copy: 'Responde una serie de preguntas, setea tu modo de juego; nosotros generaremos tu base (Body/Mind/Soul) con IA.'
        },
        { title: 'Activa tu base', copy: 'Recibís tu “pergamino digital” por mail y editás/confirmás tu base.' },
        {
          title: 'Daily Quest + Emociones',
          copy: 'Con tu quest diaria vas a poder hacer una retrospectiva de tu día anterior; pensarás en qué emoción prevaleció más durante tu día.'
        },
        {
          title: 'XP, Rachas y Recompensas',
          copy: 'Seguís tu crecimiento acumulando experiencia (XP), moviendo tu constancia semanal, desafiándote a nuevas misiones y obteniendo recompensas.'
        }
      ]
    },
    testimonials: {
      title: 'Testimonios',
      intro: 'Lo que dicen quienes ya empezaron su Journey.',
      items: [
        { quote: '“Por primera vez sostuve hábitos 6 semanas. El mapa y las misiones me ordenaron.”', author: 'Lucía • Diseñadora' },
        { quote: '“El heatmap emocional me cambió la mirada. Ajusto tareas por energía real.”', author: 'Diego • Dev' },
        { quote: '“Empecé en Low y pasé a Flow con objetivos claros, sin culpa.”', author: 'Caro • Estudiante' }
      ],
      prev: 'Anterior',
      next: 'Siguiente',
      groupLabel: 'Seleccionar testimonio'
    },
    faq: {
      title: 'Preguntas frecuentes',
      items: [
        {
          question: '¿Necesito mucha disciplina para empezar?',
          answer: 'No. Si estás con poca energía, empezás en Low para activar el mínimo vital. El sistema ajusta el ritmo.'
        },
        { question: '¿Puedo cambiar de modo de juego?', answer: 'Sí. Podés cambiar entre Low, Chill, Flow y Evolve según tu momento.' },
        { question: '¿Dónde veo mis métricas?', answer: 'En tu archivo y en el Dashboard: XP, nivel, rachas y mapa emocional.' },
        {
          question: '¿Qué pasa si dejo de registrar?',
          answer: 'No perdés progreso. Retomas cuando quieras y ajustamos objetivos a tu energía actual.'
        }
      ]
    },
    next: {
      title: 'Listo para empezar',
      intro: 'Te guiamos paso a paso. Empezá ahora.'
    },
    auth: {
      dashboard: 'Ir al dashboard',
      signup: 'Crear cuenta',
      login: 'Iniciar sesión',
      startJourney: 'Comenzar mi Journey'
    },
    footer: { copyright: '©️ Gamification Journey', faq: 'FAQ' }
  },
  en: {
    navLinks: [],
    hero: {
      titleLead: 'Turn experience into habits.',
      titleHighlight: 'Turn habits into your path',
      subtitle:
        'Your habits are the map. Consistency is the level you reach. A self-improvement journey balanced between Body, Mind and Soul.',
      note: 'In under 3 minutes we generate your personalized base with AI.',
      alt: 'Kid looking at a violet energy sphere in the night sky — Gamification Journey'
    },
    pillars: {
      title: 'Our core pillars',
      intro:
        'Sustainable progress needs balance. 🫀 Body for energy and health, 🧠 Mind for focus and learning, and 🏵️ Soul for emotional well-being and meaning. When one drops, the other two support it. When they align, your progress accelerates.',
      highlight: 'See yourself in third person for the first time and take control of your actions and habits.',
      items: [
        {
          emoji: '🫀',
          title: 'Body',
          copy: 'Your body is the substrate of the habit: sleep, nutrition and movement set your daily energy (HP).'
        },
        {
          emoji: '🧠',
          title: 'Mind',
          copy: 'The mind filters and prioritizes. Without focus, there is no consistency. We design simple sessions to sustain attention, learning and creativity.'
        },
        {
          emoji: '🏵️',
          title: 'Soul',
          copy: 'Emotions, relationships and purpose stabilize the system. Without them, habits don’t last weeks or months.'
        }
      ]
    },
    modes: {
      title: 'Modulate your game mode',
      intro: 'Switch based on your moment. The system adapts to your energy.',
      items: [
        {
          id: 'low',
          title: '🪫 LOW MOOD',
          state: 'low energy, overwhelmed.',
          goal: 'activate your vital minimum with small, sustainable actions.'
        },
        {
          id: 'chill',
          title: '🍃 CHILL MOOD',
          state: 'relaxed and stable.',
          goal: 'sustain well-being with smooth, balanced routines.'
        },
        {
          id: 'flow',
          title: '🌊 FLOW MOOD',
          state: 'focused and moving.',
          goal: 'leverage momentum with a plan aligned to concrete goals.'
        },
        {
          id: 'evolve',
          title: '🧬 EVOLVE MOOD',
          state: 'ambitious and determined.',
          goal: 'challenging system with Atomic Habits, missions and rewards.'
        }
      ]
    },
    how: {
      title: 'How it works',
      intro: 'A clear flow: from activation to consistency.',
      steps: [
        {
          title: 'Define your path',
          copy: 'Answer a few questions, set your game mode; we generate your Body/Mind/Soul base with AI.'
        },
        { title: 'Activate your base', copy: 'You receive your “digital scroll” by email and edit/confirm your base.' },
        {
          title: 'Daily Quest + Emotions',
          copy: 'With your daily quest you can review yesterday and notice which emotion was most present.'
        },
        {
          title: 'XP, Streaks and Rewards',
          copy: 'Track growth by accumulating XP, moving your weekly consistency, challenging new missions and earning rewards.'
        }
      ]
    },
    testimonials: {
      title: 'Testimonials',
      intro: 'What people say after starting their Journey.',
      items: [
        { quote: '“First time keeping habits for 6 weeks. The map and missions kept me on track.”', author: 'Lucía • Designer' },
        { quote: '“The emotion heatmap changed my view. I plan tasks around real energy.”', author: 'Diego • Dev' },
        { quote: '“Started in Low and moved to Flow with clear goals, no guilt.”', author: 'Caro • Student' }
      ],
      prev: 'Previous',
      next: 'Next',
      groupLabel: 'Select testimonial'
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        {
          question: 'Do I need strong discipline to start?',
          answer: 'No. If your energy is low, start in Low to activate the vital minimum. The system adjusts the pace.'
        },
        { question: 'Can I switch game modes?', answer: 'Yes. Swap between Low, Chill, Flow and Evolve whenever you need.' },
        { question: 'Where do I see my metrics?', answer: 'In your file and dashboard: XP, level, streaks and emotion map.' },
        { question: 'What happens if I stop logging?', answer: 'You do not lose progress. Resume anytime and we adjust goals to your current energy.' }
      ]
    },
    next: {
      title: 'Ready to start',
      intro: 'We guide you step by step. Start now.'
    },
    auth: {
      dashboard: 'Go to dashboard',
      signup: 'Create account',
      login: 'Log in',
      startJourney: 'Start my Journey'
    },
    footer: { copyright: '©️ Gamification Journey', faq: 'FAQ' }
  }
};
