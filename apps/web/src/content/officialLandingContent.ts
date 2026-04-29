export type Language = 'es' | 'en';

type NavLink = { href: string; label: string };
type Pillar = { emoji: string; title: string; copy: string };
type Mode = { id: 'low' | 'chill' | 'flow' | 'evolve'; title: string; state: string; goal: string };
type HowTimelineStep = { title: string; badge: string; bullets: string[]; chips: string[] };
type FeatureShowcaseItem = { title: string; description: string; previewLabel: string; previewValue: string; previewMeta: string };
type Testimonial = { quote: string; author: string };
type Faq = { question: string; answer: string };
type AuthCopy = {
  dashboard: string;
  signup: string;
  login: string;
  startJourney: string;
  guidedDemo: string;
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
  problem: {
    title: string;
    leftPrimary: string;
    leftSecondary: string;
    rightPrimary: string;
    rightSecondary: string;
  };
  pillars: { kicker: string; title: string; intro: string; highlightLeadIn: string; highlight: string; items: Pillar[] };
  modes: { kicker: string; title: string; intro: string; items: Mode[] };
  how: { kicker: string; title: string; intro: string; closingLine: string; closingBody: string; steps: HowTimelineStep[] };
  featureShowcase: { kicker: string; title: string; intro: string; items: FeatureShowcaseItem[] };
  demo: { title: string; text: string; banner: string; cta: string };
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
      titleLead: 'Las apps de hábitos fallan',
      titleHighlight: 'porque no cambian contigo.',
      subtitle:
        'Innerbloom es una app de hábitos adaptativa que ajusta tu plan según tu capacidad real. Empieza desde donde estás, avanza en ciclos semanales y recalibra con el tiempo para ayudarte a construir hábitos que sí perduran.',
      note: 'Empieza desde tu nivel real y avanza semana a semana.',
      alt: 'Niño mirando una esfera de energía violeta en el cielo nocturno — Gamification Journey'
    },
    problem: {
      title: 'El problema no sos vos.',
      leftPrimary:
        'La mayoría de las apps de hábitos están diseñadas\npara una versión de vos que no existe:',
      leftSecondary:
        'siempre con la misma energía,\nel mismo foco y la misma disciplina.',
      rightPrimary:
        'Pero la vida cambia. Y cuando\nel sistema no cambia con vos,',
      rightSecondary:
        'no se siente como si el sistema hubiera fallado:\nse siente como si hubieras fallado vos.'
    },
    pillars: {
      kicker: 'PROGRESO EN EQUILIBRIO',
      title: 'Crecer en una sola dirección desequilibra.',
      intro:
        'Innerbloom organiza tus hábitos en Body, Mind y Soul para que tu progreso no dependa solo de una parte de vos.',
      highlightLeadIn: 'Mírate con perspectiva y elige tu próximo paso.',
      highlight: 'Tus hábitos crean dirección cuando sostienes energía, claridad y vínculos de forma más equilibrada.',
      items: [
        {
          emoji: '🫀',
          title: 'Body',
          copy: 'Cuida energía, movimiento y recuperación con hábitos realistas que te ayuden a sostenerte semana a semana. Tareas sugeridas: • Camina 20 minutos • Duerme 7 horas'
        },
        {
          emoji: '🧠',
          title: 'Mind',
          copy: 'Entrena foco, claridad y aprendizaje con hábitos que te ayuden a mantener dirección sin rigidez. Tareas sugeridas: • Lee 10 páginas • Planifica 3 prioridades'
        },
        {
          emoji: '🏵️',
          title: 'Soul',
          copy: 'Fortalece calma, sentido y vínculos con hábitos simples que te ayuden a sentirte más conectado y más estable. Tareas sugeridas: • Respira 5 minutos • Escribe a un amigo'
        }
      ]
    },
    modes: {
      kicker: 'AVATARES DE INNERBLOOM',
      title: 'Elige tu avatar dentro de Innerbloom',
      intro: 'Tu avatar representa cómo te ves y te expresas dentro del sistema de Innerbloom. Elige el que mejor conecte con tu identidad hoy.',
      items: [
        {
          id: 'low',
          title: '🐈 RED CAT',
          state: '',
          goal: 'Un avatar vibrante para quienes quieren mostrarse con presencia y personalidad.'
        },
        {
          id: 'chill',
          title: '🐻 GREEN BEAR',
          state: '',
          goal: 'Un avatar sereno y cercano para quienes priorizan calidez y estabilidad.'
        },
        {
          id: 'flow',
          title: '🦎 BLUE AMPHIBIAN',
          state: '',
          goal: 'Un avatar adaptable para quienes disfrutan explorar y moverse entre contextos.'
        },
        {
          id: 'evolve',
          title: '🦉 VIOLET OWL',
          state: '',
          goal: 'Un avatar con carácter y visión para quienes quieren proyectar claridad y criterio.'
        }
      ]
    },
    how: {
      kicker: 'EL SISTEMA DE INNERBLOOM',
      title: 'Cómo funciona Innerbloom',
      intro: 'Innerbloom no te da una rutina fija. Usa tus decisiones y tu progreso real para ajustar el sistema: cuándo subir la intensidad, cuándo bajarla y cómo ayudarte a sostener hábitos en el tiempo.',
      closingLine: 'No es un tracker. Es un sistema que se adapta a tu progreso.',
      closingBody: 'Innerbloom usa tu progreso para decidir cuándo subir la intensidad, cuándo bajarla y cuál debería ser tu próximo paso.',
      steps: [
        {
          title: 'Setea un inicio posible',
          badge: 'ONBOARDING PERSONALIZADO',
          bullets: [
            '🟢 Te hace las preguntas justas para entender tu punto de partida',
            '🌱 Crea tus primeras tareas según lo que elegís y podés sostener',
          ],
          chips: ['ONBOARDING · INICIO REALISTA'],
        },
        {
          title: 'Convierte tus acciones en información',
          badge: 'CICLO SEMANAL',
          bullets: [
            '📅 Registra qué tareas completás cada semana',
            '📊 Usa GP, rachas y progreso para entender tu constancia',
          ],
          chips: ['CICLO SEMANAL · PROGRESO REAL'],
        },
        {
          title: 'Ajusta dificultad e intensidad',
          badge: 'RECALIBRACIÓN MENSUAL',
          bullets: [
            '🔁 Si una tarea te está costando, el sistema lo detecta',
            '📈 Si tu progreso es sólido, puede proponerte subir de ritmo',
          ],
          chips: ['RECALIBRACIÓN · AJUSTE Y RITMO'],
        },
        {
          title: 'Reconoce hábitos consolidados',
          badge: 'HÁBITOS LOGRADOS',
          bullets: [
            '🏆 Detecta cuándo una tarea ya se volvió parte de tu rutina',
            '🌿 Podés seguir midiéndola o guardarla como un logro alcanzado',
          ],
          chips: ['HÁBITOS LOGRADOS · CONSOLIDACIÓN'],
        }
      ]
    },
    featureShowcase: {
      kicker: 'PRODUCT SHOWCASE',
      title: 'Vista rápida de lo que desbloqueas al sostener tu ritmo',
      intro: 'Estas previews muestran cómo Innerbloom transforma tu energía diaria en acciones medibles y progreso visible.',
      items: [
        {
          title: 'Daily Quest',
          description: 'Plan del día con micro-hábitos priorizados por energía para avanzar sin fricción.',
          previewLabel: 'Completado hoy',
          previewValue: '72%',
          previewMeta: '4 de 6 tareas cerradas'
        },
        {
          title: 'XP & Nivel',
          description: 'Seguimiento de experiencia semanal para mantener dirección y momentum sostenible.',
          previewLabel: 'XP semanal',
          previewValue: '+640 XP',
          previewMeta: 'Objetivo: nivel 6'
        },
        {
          title: 'Constancia semanal',
          description: 'Lectura clara de tu racha y tu estabilidad para ajustar el desafío en el momento correcto.',
          previewLabel: 'Racha activa',
          previewValue: '8 semanas',
          previewMeta: 'Tendencia: +18%'
        },
        {
          title: 'Misiones & Rewards',
          description: 'Misiones guiadas con bonus para reforzar hábitos que ya están tomando forma.',
          previewLabel: 'Misión activa',
          previewValue: '40%',
          previewMeta: 'Siguiente reward: Focus Pack'
        },
        {
          title: 'Emotion Heatmap',
          description: 'Mapa emocional para detectar patrones y decidir acciones alineadas con cómo te sientes.',
          previewLabel: 'Check-ins',
          previewValue: '26',
          previewMeta: 'Calma dominante esta semana'
        },
        {
          title: 'App & Recordatorios',
          description: 'Recordatorios contextuales para sostener tus hábitos sin saturar tu día.',
          previewLabel: 'Recordatorios útiles',
          previewValue: '3/día',
          previewMeta: 'Ajustados a tu horario'
        }
      ]
    },
    demo: {
      title: 'Haz visible el progreso que normalmente no ves.',
      text: 'Innerbloom te muestra patrones, constancia y evolución para que avanzar no se sienta como todo o nada, sino como un proceso visible y real.',
      banner: 'Explora cómo se ve tu crecimiento dentro de Innerbloom',
      cta: 'Explorar demo'
    },
    testimonials: {
      title: 'Primeras experiencias',
      intro: 'Primeras señales de cómo Innerbloom ya está ayudando a recuperar constancia y sostener hábitos con más realismo.',
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
      title: 'Planes y precios',
      intro: 'Elige el plan que mejor encaja con tu ritmo actual y tu crecimiento a largo plazo.',
      trialHighlight: 'Todos los planes empiezan con una prueba gratuita de 2 meses. Una forma segura de empezar, explorar el sistema y ver qué te funciona.',
      taxNote: 'Precios finales para cliente (impuestos incluidos).',
      actionLabel: 'Empezar con este plan',
      plans: [
        { id: 'FREE', name: 'FREE', price: '2 meses gratis', detail: 'La mejor forma de explorar Innerbloom sin compromiso inicial.' },
        { id: 'MONTH', name: 'MONTH', price: '4,99 EUR/mes', detail: 'Suscripción mensual para seguir construyendo constancia con total flexibilidad.' },
        { id: 'SIX_MONTHS', name: 'SIX MONTHS', price: '23 EUR', detail: 'Plan de 6 meses para una constancia más fuerte y mejor valor a lo largo del tiempo.' },
        { id: 'YEAR', name: 'YEAR', price: '32 EUR', detail: 'Plan anual para un compromiso más profundo, crecimiento a largo plazo y mayor ahorro.' }
      ]
    },
    faq: {
      title: 'Preguntas frecuentes',
      items: [
        {
          question: '¿Innerbloom es solo un habit tracker?',
          answer: 'No. Es una app de hábitos adaptativa que trabaja con ritmo semanal, recalibración en el tiempo y progreso visible para ayudarte a construir hábitos que sí perduran.'
        },
        {
          question: '¿Cómo se diferencia de otras apps de hábitos?',
          answer: 'En vez de exigir perfección diaria, Innerbloom ajusta tu plan a tu capacidad real y te ayuda a sostener el progreso incluso cuando la vida cambia.'
        },
        {
          question: '¿Cómo funcionan los ritmos?',
          answer: 'Funcionan como niveles de intensidad semanal. Puedes empezar con una frecuencia más liviana y avanzar hacia una carga mayor a medida que tu constancia se fortalece.'
        },
        {
          question: '¿Qué significan Body, Mind y Soul?',
          answer: 'Son tres pilares para que tu progreso no dependa solo de una dimensión: Body trabaja energía y cuidado, Mind trabaja foco y claridad, y Soul trabaja calma, sentido y vínculos.'
        },
        {
          question: '¿Cómo se ve el progreso en el tiempo?',
          answer: 'Ves patrones, constancia y evolución para reconocer qué hábitos se están volviendo parte real de tu vida.'
        },
        {
          question: '¿Qué pasa si tengo una mala semana o dejo de registrar?',
          answer: 'No pierdes tu proceso. Retomas desde tu capacidad actual, ajustas el plan y sigues construyendo sin sentir que vuelves a empezar de cero.'
        }
      ]
    },
    next: {
      title: 'Construye hábitos que crezcan con vos',
      intro: 'Empieza con un plan adaptativo en Innerbloom.'
    },
    auth: {
      dashboard: 'Ir al dashboard',
      signup: 'Crear cuenta',
      login: 'Iniciar sesión',
      startJourney: 'Crear mi plan adaptativo',
      guidedDemo: 'Demos'
    },
    footer: { copyright: '©️ Gamification Journey', faq: 'FAQ' }
  },
  en: {
    navLinks: [],
    hero: {
      titleLead: 'Habit apps fail',
      titleHighlight: 'because they don’t change with you.',
      subtitle:
        'Innerbloom is an adaptive habit app that adjusts your plan to your real capacity. Start from where you are, move through weekly cycles, and recalibrate over time so you can build habits that actually last.',
      note: 'Start from your real level and move forward week by week.',
      alt: 'Kid looking at a violet energy sphere in the night sky — Gamification Journey'
    },
    problem: {
      title: 'You’re not the problem.',
      leftPrimary:
        'Most habit apps are designed\nfor a version of you that doesn’t exist:',
      leftSecondary:
        'always with the same energy,\nthe same focus, and the same discipline.',
      rightPrimary:
        'But life changes. And when\nthe system doesn’t change with you,',
      rightSecondary:
        'it doesn’t feel like the system failed—\nit feels like you did.'
    },
    pillars: {
      kicker: 'PROGRESS IN BALANCE',
      title: 'Growing in only one direction creates imbalance.',
      intro:
        'Innerbloom organizes your habits across Body, Mind, and Soul so your progress doesn’t depend on only one part of you.',
      highlightLeadIn: 'Pause, zoom out, and choose your next move.',
      highlight: 'Your habits create direction when you sustain energy, clarity, and connection in a more balanced way.',
      items: [
        {
          emoji: '🫀',
          title: 'Body',
          copy: 'Support your energy, movement, and recovery with realistic habits that help you stay steady week after week. Suggested tasks: • Walk 20 minutes • Sleep 7 hours'
        },
        {
          emoji: '🧠',
          title: 'Mind',
          copy: 'Train focus, clarity, and learning with habits that help you keep direction without rigidity. Suggested tasks: • Read 10 pages • Plan 3 priorities'
        },
        {
          emoji: '🏵️',
          title: 'Soul',
          copy: 'Strengthen calm, meaning, and relationships with simple habits that help you feel more connected and more stable. Suggested tasks: • Breathe for 5 minutes • Message a friend'
        }
      ]
    },
    modes: {
      kicker: 'INNERBLOOM AVATARS',
      title: 'Choose your Innerbloom avatar',
      intro: 'Your avatar represents how you show up inside the Innerbloom system. Pick the one that best reflects your identity right now.',
      items: [
        {
          id: 'low',
          title: '🐈 RED CAT',
          state: '',
          goal: 'A vibrant avatar for people who want to show up with presence and personality.'
        },
        {
          id: 'chill',
          title: '🐻 GREEN BEAR',
          state: '',
          goal: 'A calm, friendly avatar for people who value warmth and steadiness.'
        },
        {
          id: 'flow',
          title: '🦎 BLUE AMPHIBIAN',
          state: '',
          goal: 'An adaptable avatar for people who like moving across contexts with ease.'
        },
        {
          id: 'evolve',
          title: '🦉 VIOLET OWL',
          state: '',
          goal: 'A thoughtful avatar for people who want to project clarity and perspective.'
        }
      ]
    },
    how: {
      kicker: 'THE INNERBLOOM SYSTEM',
      title: 'How Innerbloom works',
      intro: 'Start from your real level, move through weekly cycles, recalibrate over time, and build habits that actually last.',
      closingLine: 'An achieved habit isn’t just a pretty streak. It’s something that has become part of you.',
      closingBody: 'Innerbloom uses your progress to decide when to increase intensity, when to reduce it, and what your next step should be.',
      steps: [
        {
          title: 'Start realistic, not perfect',
          badge: 'PERSONALIZED ONBOARDING',
          bullets: [
            '🟢 Start from your real level',
            '🌱 Build a base you can sustain',
          ],
          chips: ['ONBOARDING · REALISTIC BASE'],
        },
        {
          title: 'Move through weekly cycles',
          badge: 'WEEKLY CYCLE',
          bullets: [
            '📅 Move through weeks, not isolated days',
            '🧭 Spot real patterns and adjust your plan',
          ],
          chips: ['WEEKLY CYCLE · PROGRESS AND PATTERNS'],
        },
        {
          title: 'Adjust the system as you grow',
          badge: 'MONTHLY RECALIBRATION',
          bullets: [
            '🔄 Recalibrate task difficulty as you evolve',
            '📈 It suggests a higher intensity when your consistency gets stronger',
          ],
          chips: ['RECALIBRATION · DIFFICULTY AND EVOLUTION'],
        },
        {
          title: 'Turn consistency into real habits',
          badge: 'ACHIEVED HABITS',
          bullets: [
            '🏆 Turn consistency into lasting habits',
            '🌿 Build habits that stay with you beyond one good week',
          ],
          chips: ['ACHIEVED HABITS · CONSOLIDATION'],
        }
      ]
    },
    featureShowcase: {
      kicker: 'PRODUCT SHOWCASE',
      title: 'A quick preview of what unlocks when you stay consistent',
      intro: 'These previews show how Innerbloom turns your daily energy into measurable actions and visible progress.',
      items: [
        {
          title: 'Daily Quest',
          description: 'A daily plan with energy-aware micro-habits so you can move forward with less friction.',
          previewLabel: 'Completed today',
          previewValue: '72%',
          previewMeta: '4 of 6 tasks done'
        },
        {
          title: 'XP & Level',
          description: 'Weekly XP tracking that keeps your direction and momentum sustainable.',
          previewLabel: 'Weekly XP',
          previewValue: '+640 XP',
          previewMeta: 'Goal: level 6'
        },
        {
          title: 'Weekly consistency',
          description: 'A clear view of streak and stability so challenge can adapt at the right moment.',
          previewLabel: 'Active streak',
          previewValue: '8 weeks',
          previewMeta: 'Trend: +18%'
        },
        {
          title: 'Missions & Rewards',
          description: 'Guided missions and bonuses that reinforce habits already taking root.',
          previewLabel: 'Active mission',
          previewValue: '40%',
          previewMeta: 'Next reward: Focus Pack'
        },
        {
          title: 'Emotion Heatmap',
          description: 'An emotional map to detect patterns and choose actions aligned with how you feel.',
          previewLabel: 'Check-ins',
          previewValue: '26',
          previewMeta: 'Calm was dominant this week'
        },
        {
          title: 'App & Reminders',
          description: 'Context-aware reminders that support consistency without overloading your day.',
          previewLabel: 'Useful reminders',
          previewValue: '3/day',
          previewMeta: 'Matched to your schedule'
        }
      ]
    },
    demo: {
      title: 'Make visible the progress you normally don’t see.',
      text: 'Innerbloom shows you patterns, consistency, and evolution so progress doesn’t feel all-or-nothing, but visible and real.',
      banner: 'Explore what your growth looks like inside Innerbloom',
      cta: 'Explore demo'
    },
    testimonials: {
      title: 'Early experiences',
      intro: 'Early signs of how Innerbloom is already helping people recover consistency and sustain habits more realistically.',
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
      intro: 'Choose the plan that best supports your current rhythm and long-term growth.',
      trialHighlight: 'All plans start with a 2-month free trial. A safe way to start, explore the system, and see what works for you.',
      taxNote: 'Final customer prices (taxes included).',
      actionLabel: 'Start with this plan',
      plans: [
        { id: 'FREE', name: 'FREE', price: '2 months free', detail: 'Best to explore Innerbloom with zero upfront commitment.' },
        { id: 'MONTH', name: 'MONTH', price: '4.99 EUR/month', detail: 'Monthly subscription to keep building consistency with full flexibility.' },
        { id: 'SIX_MONTHS', name: 'SIX MONTHS', price: '23 EUR', detail: 'A 6-month plan for stronger consistency and better value over time.' },
        { id: 'YEAR', name: 'YEAR', price: '32 EUR', detail: 'Annual plan for deeper commitment, long-term growth, and the best savings.' }
      ]
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        {
          question: 'Is Innerbloom just a habit tracker?',
          answer: 'No. It’s an adaptive habit app built around weekly rhythm, recalibration over time, and visible progress so you can build habits that actually last.'
        },
        {
          question: 'How is it different from other habit apps?',
          answer: 'Instead of demanding daily perfection, Innerbloom adjusts your plan to your real capacity and helps you stay consistent even when life changes.'
        },
        {
          question: 'How do the rhythms work?',
          answer: 'They work as weekly intensity levels. You can start with a lighter frequency and move toward a higher load as your consistency gets stronger.'
        },
        {
          question: 'What do Body, Mind, and Soul mean?',
          answer: 'They are three growth pillars so your progress does not depend on only one dimension: Body supports energy and care, Mind supports focus and clarity, and Soul supports calm, meaning, and relationships.'
        },
        {
          question: 'How does progress work over time?',
          answer: 'You see patterns, consistency, and evolution so you can recognize which habits are becoming a real part of your life.'
        },
        {
          question: 'What if I have a hard week or stop tracking?',
          answer: 'You do not lose your process. You resume from your current capacity, adjust the plan, and keep building without feeling like you are starting from zero.'
        }
      ]
    },
    next: {
      title: 'Build habits that grow with you',
      intro: 'Start with an adaptive plan in Innerbloom.'
    },
    auth: {
      dashboard: 'Go to dashboard',
      signup: 'Create account',
      login: 'Log in',
      startJourney: 'Create my adaptive plan',
      guidedDemo: 'Demos'
    },
    footer: { copyright: '©️ Gamification Journey', faq: 'FAQ' }
  }
};
