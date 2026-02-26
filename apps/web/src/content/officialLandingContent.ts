export type Language = 'es' | 'en';

type NavLink = { href: string; label: string };
type Pillar = { emoji: string; title: string; copy: string };
type Mode = { id: 'low' | 'chill' | 'flow' | 'evolve'; title: string; state: string; goal: string };
type HowStep = { title: string; action: string; outcome: string; copy: string };
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
  pillars: { title: string; intro: string; highlightLeadIn: string; highlight: string; items: Pillar[] };
  modes: { title: string; intro: string; items: Mode[] };
  how: { title: string; intro: string; actionLabel: string; outcomeLabel: string; steps: HowStep[] };
  testimonials: { title: string; intro: string; items: Testimonial[]; prev: string; next: string; groupLabel: string };
  pricing: {
    title: string;
    intro: string;
    trialHighlight: string;
    taxNote: string;
    actionLabel: string;
    plans: Array<{ id: 'FREE' | 'MONTH' | 'SIX_MONTHS' | 'YEAR'; name: string; price: string; detail: string }>;
  };
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
        'Gestión de hábitos + registro emocional, gamificado. Un habit tracker con mood tracking para crear constancia con micro hábitos sostenibles.',
      note: 'En menos de 3 minutos recibís una orientación inicial para crear tu base personalizada.',
      alt: 'Niño mirando una esfera de energía violeta en el cielo nocturno — Gamification Journey'
    },
    pillars: {
      title: 'Nuestros pilares fundamentales',
      intro:
        'Tus hábitos son el mapa. Tu constancia marca el ritmo. Es tu Journey de crecimiento con equilibrio entre Cuerpo, Mente y Alma—registrando tu emoción diaria para ajustar el camino.',
      highlightLeadIn: 'Mírate con perspectiva y elegí tu próximo paso.',
      highlight: 'Obsérvate por primera vez en tercera persona y toma el control de tus acciones y hábitos.',
      items: [
        {
          emoji: '🫀',
          title: 'Cuerpo',
          copy: 'Recupera energía diaria con hábitos físicos simples y sostenibles. Tareas sugeridas: • Caminar 20 minutos • Dormir 7 horas'
        },
        {
          emoji: '🧠',
          title: 'Mente',
          copy: 'Entrena atención y enfoque para decidir mejor y sostener lo importante. Tareas sugeridas: • Leer 10 páginas • Planificar 3 prioridades'
        },
        {
          emoji: '🏵️',
          title: 'Alma',
          copy: 'Conecta con tus emociones y propósito para actuar con más calma. Tareas sugeridas: • Respirar 5 minutos • Escribir 3 gratitudes'
        }
      ]
    },
    modes: {
      title: 'Modula tu modo de juego',
      intro: 'Elegí tu modo según cómo te sentís hoy. Cada modo tiene un avatar que refleja tu estado emocional.',
      items: [
        {
          id: 'low',
          title: '🪫 LOW MOOD',
          state: 'sin energía, abrumado.',
          goal: 'activar tu mínimo vital con tareas pequeñas y sostenibles.'
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
          goal: 'sostener un ritmo desafiante con estructura y tareas diarias claras.'
        }
      ]
    },
    how: {
      title: 'Cómo funciona Innerbloom',
      intro: 'Un sistema guiado para pasar de ‘quiero estar mejor’ a hábitos reales en tu día a día.',
      actionLabel: 'Acción',
      outcomeLabel: 'Resultado',
      steps: [
        {
          title: 'Comienzas con un diagnóstico breve',
          action: 'Respondes unas preguntas sobre energía, prioridades y momento actual (2–3 min).',
          outcome: 'Un punto de partida claro + tu primer plan personalizado.',
          copy: 'Respondes unas preguntas sobre energía, prioridades y momento actual (2–3 min). Un punto de partida claro + tu primer plan personalizado.'
        },
        {
          title: 'Recibes un plan en 3 pilares',
          action: 'Revisas tareas sugeridas en Cuerpo, Mente y Alma.',
          outcome: 'Una rutina equilibrada, concreta y fácil de sostener.',
          copy: 'Revisas tareas sugeridas en Cuerpo, Mente y Alma. Una rutina equilibrada, concreta y fácil de sostener.'
        },
        {
          title: 'Lo adaptas a tu realidad',
          action: 'Editas, cambias o descartas tareas; eliges modo y avatar según cómo estés hoy.',
          outcome: 'Un plan realmente tuyo (la IA propone, tú decides).',
          copy: 'Editas, cambias o descartas tareas; eliges modo y avatar según cómo estés hoy. Un plan realmente tuyo (la IA propone, tú decides).'
        },
        {
          title: 'Lo aplicas en pocos minutos al día',
          action: 'Completas microacciones diarias (3–5 min) con enfoque simple y realista.',
          outcome: 'Constancia sin saturarte y progreso visible semana a semana.',
          copy: 'Completas microacciones diarias (3–5 min) con enfoque simple y realista. Constancia sin saturarte y progreso visible semana a semana.'
        },
        {
          title: 'Registras cómo te sientes y recalibras',
          action: 'Registras tu emoción y estado diario en segundos.',
          outcome: 'Recomendaciones ajustadas a tu momento + continuidad del proceso.',
          copy: 'Registras tu emoción y estado diario en segundos. Recomendaciones ajustadas a tu momento + continuidad del proceso.'
        }
      ]
    },
    testimonials: {
      title: 'Testimonios',
      intro: 'Lo que dicen quienes ya empezaron su Journey.',
      items: [
        { quote: '“Por primera vez sostuve hábitos varias semanas. Tener tareas diarias claras me ordenó.”', author: 'Lucía • Diseñadora' },
        { quote: '“Registrar mi emoción diaria cambió mi mirada. Ahora ajusto tareas según mi energía real.”', author: 'Diego • Dev' },
        { quote: '“Empecé en Low y pasé a Flow con objetivos claros, sin culpa.”', author: 'Caro • Estudiante' }
      ],
      prev: 'Anterior',
      next: 'Siguiente',
      groupLabel: 'Seleccionar testimonio'
    },
    pricing: {
      title: 'Planes y pricing',
      intro: 'Elige el plan que mejor acompaña tu ritmo actual.',
      trialHighlight: 'Todos los planes comienzan con 2 meses gratis.',
      taxNote: 'Precios finales para cliente (impuestos incluidos).',
      actionLabel: 'Empezar con este plan',
      plans: [
        { id: 'FREE', name: 'FREE', price: '2 meses gratis', detail: 'Ideal para explorar Innerbloom sin compromiso inicial.' },
        { id: 'MONTH', name: 'MONTH', price: '4,99 EUR/mes', detail: 'Luego de los 2 meses gratis, continúa con suscripción mensual flexible.' },
        { id: 'SIX_MONTHS', name: 'SIX_MONTHS', price: '23 EUR', detail: 'Luego de los 2 meses gratis, sigue con plan semestral para ahorrar.' },
        { id: 'YEAR', name: 'YEAR', price: '32 EUR', detail: 'Luego de los 2 meses gratis, continúa con plan anual de mayor ahorro.' }
      ]
    },
    faq: {
      title: 'Preguntas frecuentes',
      items: [
        {
          question: '¿Necesito mucha disciplina para empezar?',
          answer: 'No. Si estás con poca energía, empezás en Low con micro hábitos para activar el mínimo vital. La gestión de hábitos se adapta a tu ritmo.'
        },
        { question: '¿Puedo cambiar de modo de juego?', answer: 'Sí. Podés cambiar entre Low, Chill, Flow y Evolve según tu momento y tu energía diaria.' },
        {
          question: '¿Dónde veo mi progreso?',
          answer: 'En tu archivo y en el Dashboard: ves tus tareas, tu seguimiento de hábitos, tu registro emocional (mood tracking) y tu equilibrio general.'
        },
        {
          question: '¿Qué pasa si dejo de registrar?',
          answer: 'No perdés progreso. Retomás cuando quieras y ajustamos el plan a tu energía actual para recuperar constancia.'
        },
        {
          question: '¿Innerbloom es un habit tracker o un planificador diario?',
          answer:
            'Ambas cosas. Funciona como habit tracker (seguimiento de hábitos) y como planificador diario liviano: convertís tu energía del día en acciones simples y sostenibles.'
        },
        {
          question: '¿Cómo funciona el registro emocional (mood tracking)?',
          answer:
            'Registrás tu emoción/estado en segundos. Ese registro emocional diario ayuda a que las sugerencias y el ritmo del plan se mantengan alineados con cómo estás.'
        },
        {
          question: '¿Qué son los micro hábitos y por qué ayudan?',
          answer:
            'Son acciones pequeñas y realistas (2–10 min) que reducen fricción y aumentan constancia. Son ideales para construir hábitos sostenibles sin saturarte.'
        },
        {
          question: '¿Innerbloom es una app de productividad o de bienestar?',
          answer:
            'Está enfocada en bienestar emocional y hábitos sostenibles, pero naturalmente mejora tu productividad al darte foco, estructura y seguimiento diario.'
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
        'Habit tracking + mood tracking, gamified. Build consistency with sustainable micro-habits.',
      note: 'In under 3 minutes you get initial guidance to build your personalized base.',
      alt: 'Kid looking at a violet energy sphere in the night sky — Gamification Journey'
    },
    pillars: {
      title: 'Our core pillars',
      intro:
        'Your habits are the map. Consistency sets the rhythm. It’s your growth journey—balanced across Body, Mind, and Soul—logging your daily mood to stay aligned.',
      highlightLeadIn: 'Pause, zoom out, and choose your next move.',
      highlight: 'Observe yourself in third person for the first time and take control of your actions and habits.',
      items: [
        {
          emoji: '🫀',
          title: 'Body',
          copy: 'Build steady daily energy through simple, sustainable physical habits. Suggested tasks: • Walk 20 minutes • Sleep 7 hours'
        },
        {
          emoji: '🧠',
          title: 'Mind',
          copy: 'Train focus and attention to decide better and stay consistent. Suggested tasks: • Read 10 pages • Plan 3 priorities'
        },
        {
          emoji: '🏵️',
          title: 'Soul',
          copy: 'Reconnect with emotions and purpose to act with more calm. Suggested tasks: • Breathe 5 minutes • Write 3 gratitudes'
        }
      ]
    },
    modes: {
      title: 'Modulate your game mode',
      intro: 'Choose your mode based on how you feel today. Each mode has an avatar that mirrors your emotional state.',
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
          goal: 'maintain a challenging rhythm with structure and clear daily tasks.'
        }
      ]
    },
    how: {
      title: 'How Innerbloom works',
      intro: 'A guided system to turn ‘I want to feel better’ into real habits in your day-to-day.',
      actionLabel: 'Action',
      outcomeLabel: 'Outcome',
      steps: [
        {
          title: 'Start with a brief check-in',
          action: 'Answer a few questions about your energy, priorities, and current phase (2–3 min).',
          outcome: 'A clear starting point + your first personalized plan.',
          copy: 'Answer a few questions about your energy, priorities, and current phase (2–3 min). A clear starting point + your first personalized plan.'
        },
        {
          title: 'Get a 3-pillar plan',
          action: 'Review suggested tasks across Body, Mind, and Soul.',
          outcome: 'A balanced routine that’s concrete and easy to sustain.',
          copy: 'Review suggested tasks across Body, Mind, and Soul. A balanced routine that’s concrete and easy to sustain.'
        },
        {
          title: 'Make it yours',
          action: 'Edit, swap, or drop tasks; choose a mode and avatar based on how you feel today.',
          outcome: 'A plan that’s truly yours (AI suggests, you decide).',
          copy: 'Edit, swap, or drop tasks; choose a mode and avatar based on how you feel today. A plan that’s truly yours (AI suggests, you decide).'
        },
        {
          title: 'Apply it in minutes',
          action: 'Complete small daily actions (3–5 min) with a simple, realistic focus.',
          outcome: 'Consistency without overload and visible progress week by week.',
          copy: 'Complete small daily actions (3–5 min) with a simple, realistic focus. Consistency without overload and visible progress week by week.'
        },
        {
          title: 'Log & recalibrate',
          action: 'Log your emotion and daily state in seconds.',
          outcome: 'Guidance that adapts to your moment + continuity over time.',
          copy: 'Log your emotion and daily state in seconds. Guidance that adapts to your moment + continuity over time.'
        }
      ]
    },
    testimonials: {
      title: 'Testimonials',
      intro: 'What people say after starting their Journey.',
      items: [
        { quote: '“First time I kept habits for weeks. Clear daily tasks helped me stay on track.”', author: 'Lucía • Designer' },
        { quote: '“Logging my daily emotion changed how I plan. Now I adjust tasks to real energy.”', author: 'Diego • Dev' },
        { quote: '“Started in Low and moved to Flow with clear goals, no guilt.”', author: 'Caro • Student' }
      ],
      prev: 'Previous',
      next: 'Next',
      groupLabel: 'Select testimonial'
    },
    pricing: {
      title: 'Plans & pricing',
      intro: 'Choose the plan that best fits your current pace.',
      trialHighlight: 'All plans start with a 2-month free trial.',
      taxNote: 'Final customer prices (taxes included).',
      actionLabel: 'Start with this plan',
      plans: [
        { id: 'FREE', name: 'FREE', price: '2 months free', detail: 'Best to explore Innerbloom with zero upfront commitment.' },
        { id: 'MONTH', name: 'MONTH', price: '4.99 EUR/month', detail: 'Monthly subscription to progress with full flexibility.' },
        { id: 'SIX_MONTHS', name: 'SIX_MONTHS', price: '23 EUR', detail: '6-month plan for stronger consistency and savings.' },
        { id: 'YEAR', name: 'YEAR', price: '32 EUR', detail: 'Annual plan to commit to your full Journey.' }
      ]
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        {
          question: 'Do I need strong discipline to start?',
          answer: 'No. If your energy is low, start in Low with micro-habits to build momentum. Habit tracking adapts to your pace.'
        },
        {
          question: 'Can I switch game modes?',
          answer: 'Yes. Switch between Low, Chill, Flow, and Evolve depending on your season and daily energy.'
        },
        {
          question: 'Where can I see my progress?',
          answer: 'In your archive and Dashboard: tasks, habit tracking, mood tracking, and your overall balance.'
        },
        {
          question: 'What if I stop tracking for a while?',
          answer: 'You don’t lose progress. Come back anytime and the plan adjusts to your current energy so you can rebuild consistency.'
        },
        {
          question: 'Is Innerbloom a habit tracker or a daily planner?',
          answer:
            'Both. It works as a habit tracker and a lightweight daily planner—turning daily energy into simple, sustainable actions.'
        },
        {
          question: 'How does mood tracking work?',
          answer: 'Log your mood/state in seconds. Daily mood logging helps recommendations stay aligned with how you feel.'
        },
        {
          question: 'What are micro-habits and why do they work?',
          answer: 'Small, realistic actions (2–10 min) that reduce friction and build consistency—without burnout.'
        },
        {
          question: 'Is Innerbloom a productivity app or a wellbeing app?',
          answer:
            'It’s built for emotional wellbeing and sustainable habits, while naturally improving focus and daily consistency.'
        }
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
