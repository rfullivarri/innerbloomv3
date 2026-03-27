export type Language = 'es' | 'en';

type NavLink = { href: string; label: string };
type Pillar = { emoji: string; title: string; copy: string };
type Mode = { id: 'low' | 'chill' | 'flow' | 'evolve'; title: string; state: string; goal: string };
type HowStep = { title: string; action: string; outcome: string; copy: string };
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
  problem: { title: string; body: string };
  pillars: { title: string; intro: string; highlightLeadIn: string; highlight: string; items: Pillar[] };
  modes: { title: string; intro: string; items: Mode[] };
  how: { kicker: string; title: string; intro: string; actionLabel: string; outcomeLabel: string; steps: HowStep[] };
  featureShowcase: { kicker: string; title: string; intro: string; items: FeatureShowcaseItem[] };
  demo: { title: string; text: string; cta: string };
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
      titleLead: 'Construye hábitos que respeten tu',
      titleHighlight: 'ritmo de vida real',
      subtitle:
        'La mayoría de las apps de hábitos asumen que te sientes igual cada día, pero la vida real no funciona así. Innerbloom te ayuda a construir hábitos duraderos con ritmo semanal, calibración mensual, reflexión emocional y progreso visible.',
      note: 'Empieza en minutos. Crece a través de ciclos reales.',
      alt: 'Niño mirando una esfera de energía violeta en el cielo nocturno — Gamification Journey'
    },
    problem: {
      title: 'La mayoría de apps de hábitos fallan cuando la vida real pasa',
      body:
        'Hay días con foco y días con agotamiento. Hay semanas fluidas y semanas más pesadas. Muchas apps tratan todos esos momentos igual. Innerbloom no.'
    },
    pillars: {
      title: 'Una forma simple de crecer en equilibrio',
      intro:
        'Innerbloom organiza tus hábitos en Body, Mind y Soul para que tu crecimiento no sea unidimensional.',
      highlightLeadIn: 'Mírate con perspectiva y elige tu próximo paso.',
      highlight: 'Tus hábitos crean dirección cuando sostienes ritmo, reflexión y constancia.',
      items: [
        {
          emoji: '🫀',
          title: 'Body',
          copy: 'Cuida energía, movimiento y recuperación con hábitos realistas para sostenerte semana a semana. Tareas sugeridas: • Camina 20 minutos • Duerme 7 horas'
        },
        {
          emoji: '🧠',
          title: 'Mind',
          copy: 'Entrena foco, claridad y aprendizaje con hábitos que te ayuden a mantener dirección sin rigidez. Tareas sugeridas: • Lee 10 páginas • Planifica 3 prioridades'
        },
        {
          emoji: '🏵️',
          title: 'Soul',
          copy: 'Cultiva calma, sentido y conexión emocional con prácticas simples que te ayuden a sostener el proceso. Tareas sugeridas: • Respira 5 minutos • Escribe 3 gratitudes'
        }
      ]
    },
    modes: {
      title: 'Elige el ritmo que encaje con tu temporada',
      intro: 'No todas las personas pueden construir al mismo ritmo. Los modos de Innerbloom ajustan la intensidad y la carga según tu capacidad actual, desde recomponer tu base hasta avanzar con más intención.',
      items: [
        {
          id: 'low',
          title: '🪫 LOW MOOD',
          state: 'sin energía, sobrecargado.',
          goal: 'reconstruir tu base con hábitos mínimos, claros y sostenibles.'
        },
        {
          id: 'chill',
          title: '🍃 CHILL MOOD',
          state: 'relajado y estable.',
          goal: 'mantener una constancia suave y equilibrada cuando necesitas estabilidad.'
        },
        {
          id: 'flow',
          title: '🌊 FLOW MOOD',
          state: 'enfocado y en movimiento.',
          goal: 'aprovechar el impulso con una carga sostenible y dirección clara.'
        },
        {
          id: 'evolve',
          title: '🧬 EVOLVE MOOD',
          state: 'ambicioso y determinado.',
          goal: 'subir intensidad con estructura, sin romper la consistencia que ya construiste.'
        }
      ]
    },
    how: {
      kicker: 'THE INNERBLOOM JOURNEY',
      title: 'Start, Grow and Bloom',
      intro: 'Un sistema de hábitos para empezar sin presión, sostener constancia en ciclos reales y convertir progreso en hábitos que de verdad puedes mantener.',
      actionLabel: 'Acción',
      outcomeLabel: 'Resultado',
      steps: [
        {
          title: 'Empieza con claridad ✨',
          action: 'Elige tu game mode y responde unas pocas preguntas sobre tu energía, tus prioridades y tu momento actual.',
          outcome: 'Innerbloom usa eso para darte un punto de partida que realmente puedas sostener.',
          copy: 'Elige tu game mode y responde unas pocas preguntas sobre tu energía, tus prioridades y tu momento actual. Innerbloom usa eso para darte un punto de partida que realmente puedas sostener.'
        },
        {
          title: 'Empieza con tu primer plan equilibrado ⚖️',
          action: 'Recibe un plan realista en Body, Mind y Soul, con micro-hábitos simples adaptados a tu ritmo.',
          outcome: 'El objetivo no es la intensidad. Es una constancia que puedas sostener.',
          copy: 'Recibe un plan realista en Body, Mind y Soul, con micro-hábitos simples adaptados a tu ritmo. El objetivo no es la intensidad. Es una constancia que puedas sostener.'
        },
        {
          title: 'Crece con progreso diario 📅📈',
          action: 'Completa micro-hábitos, registra cómo te sientes y convierte tu emoción diaria en progreso visible.',
          outcome: 'Descubre qué te ayuda a mantener la constancia.',
          copy: 'Completa micro-hábitos, registra cómo te sientes y convierte tu emoción diaria en progreso visible. Descubre qué te ayuda a mantener la constancia.'
        },
        {
          title: 'Crece con un sistema que se adapta 🌱',
          action: 'A medida que cambia tu constancia, Innerbloom ajusta el desafío para que tu plan siga siendo realista.',
          outcome: 'Growth Calibration y Next Mode te ayudan a avanzar en el momento adecuado.',
          copy: 'A medida que cambia tu constancia, Innerbloom ajusta el desafío para que tu plan siga siendo realista. Growth Calibration y Next Mode te ayudan a avanzar en el momento adecuado.'
        },
        {
          title: 'Florece en hábitos que perduran 🌸',
          action: 'Cuando un hábito se vuelve estable con el tiempo, Innerbloom puede reconocerlo como parte de tu base.',
          outcome: 'Habit Bloomed marca el momento en que la constancia se convierte en cambio duradero.',
          copy: 'Cuando un hábito se vuelve estable con el tiempo, Innerbloom puede reconocerlo como parte de tu base. Habit Bloomed marca el momento en que la constancia se convierte en cambio duradero.'
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
      title: 'Progreso visible, no solo checkmarks',
      text: 'Haz seguimiento de tus semanas, registra tu estado emocional y revisa patrones para entender qué sí te funciona en el largo plazo.',
      cta: 'Ver cómo funciona'
    },
    testimonials: {
      title: 'Testimonials',
      intro: 'Historias de personas que recuperaron consistencia y construyeron hábitos que sí lograron sostener.',
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
        { id: 'SIX_MONTHS', name: 'SIX_MONTHS', price: '23 EUR', detail: 'Plan de 6 meses para una constancia más fuerte y mejor valor a lo largo del tiempo.' },
        { id: 'YEAR', name: 'YEAR', price: '32 EUR', detail: 'Plan anual para un compromiso más profundo, crecimiento a largo plazo y mayor ahorro.' }
      ]
    },
    faq: {
      title: 'Preguntas frecuentes',
      items: [
        {
          question: '¿Innerbloom es solo un habit tracker?',
          answer: 'No. Te ayuda a construir hábitos con una estructura semanal, revisión mensual y reflexión emocional para que el progreso sea sostenible.'
        },
        {
          question: '¿Cómo se diferencia de otras apps de hábitos?',
          answer: 'En vez de exigir perfección diaria, Innerbloom trabaja con ritmo semanal, calibración mensual y ajustes según tus ciclos reales.'
        },
        {
          question: '¿Cómo funcionan los modos?',
          answer: 'Funcionan como ajustes de ritmo e intensidad. Puedes moverte entre Low, Chill, Flow y Evolve según tu capacidad de la semana.'
        },
        {
          question: '¿Qué significan Body, Mind y Soul?',
          answer: 'Son tres pilares para equilibrar crecimiento: Body (energía y cuidado), Mind (foco y claridad), Soul (calma, sentido y conexión).'
        },
        {
          question: '¿Cómo se ve el progreso en el tiempo?',
          answer: 'Ves consistencia semanal, revisas patrones emocionales y reconoces qué hábitos realmente se volvieron parte de tu base.'
        },
        {
          question: '¿Qué pasa si tengo una mala semana o dejo de registrar?',
          answer: 'No pierdes tu proceso. Retomas desde tu ritmo actual, revisas el patrón semanal y vuelves a construir sin culpa.'
        }
      ]
    },
    next: {
      title: 'Construye hábitos que crezcan contigo',
      intro: 'Empieza tu ritmo con Innerbloom.'
    },
    auth: {
      dashboard: 'Ir al dashboard',
      signup: 'Crear cuenta',
      login: 'Iniciar sesión',
      startJourney: 'Empieza mi Journey',
      guidedDemo: 'Ver cómo funciona'
    },
    footer: { copyright: '©️ Gamification Journey', faq: 'FAQ' }
  },
  en: {
    navLinks: [],
    hero: {
      titleLead: 'Build habits that respect your',
      titleHighlight: 'real-life rhythm',
      subtitle:
        'Most habit apps assume you feel the same every day, but real life does not work that way. Innerbloom helps you build lasting habits through weekly rhythm, monthly calibration, emotional reflection, and visible progress.',
      note: 'Start in minutes. Grow through real cycles.',
      alt: 'Kid looking at a violet energy sphere in the night sky — Gamification Journey'
    },
    problem: {
      title: 'Most habit apps break when real life happens',
      body:
        'Some days you feel focused. Some days you feel drained. Some weeks flow easily. Others feel heavier. Most habit apps treat all those moments the same. Innerbloom doesn’t.'
    },
    pillars: {
      title: 'A simple way to grow in balance',
      intro:
        'Innerbloom organizes your habits across Body, Mind, and Soul so growth does not become one-dimensional.',
      highlightLeadIn: 'Pause, zoom out, and choose your next move.',
      highlight: 'Habits become lasting when rhythm, reflection, and consistency work together.',
      items: [
        {
          emoji: '🫀',
          title: 'Body',
          copy: 'Support your energy, movement, and care through realistic habits you can sustain week after week. Suggested tasks: • Walk 20 minutes • Sleep 7 hours'
        },
        {
          emoji: '🧠',
          title: 'Mind',
          copy: 'Build focus, clarity, and learning with habits that help you move forward without rigid pressure. Suggested tasks: • Read 10 pages • Plan 3 priorities'
        },
        {
          emoji: '🏵️',
          title: 'Soul',
          copy: 'Nurture meaning, calm, and connection with simple emotional practices that support your consistency. Suggested tasks: • Breathe 5 minutes • Write 3 gratitudes'
        }
      ]
    },
    modes: {
      title: 'Choose the pace that fits your season',
      intro: 'Not everyone can build at the same speed. Innerbloom modes match your current capacity, from rebuilding your base to pushing further with intention.',
      items: [
        {
          id: 'low',
          title: '🪫 LOW MOOD',
          state: 'low energy, overwhelmed.',
          goal: 'rebuild your baseline with the smallest sustainable actions.'
        },
        {
          id: 'chill',
          title: '🍃 CHILL MOOD',
          state: 'relaxed and stable.',
          goal: 'maintain steady consistency with balanced routines that feel light and doable.'
        },
        {
          id: 'flow',
          title: '🌊 FLOW MOOD',
          state: 'focused and moving.',
          goal: 'use your momentum with a clear plan and sustainable intensity.'
        },
        {
          id: 'evolve',
          title: '🧬 EVOLVE MOOD',
          state: 'ambitious and determined.',
          goal: 'increase challenge with structure while protecting the consistency you already built.'
        }
      ]
    },
    how: {
      kicker: 'THE INNERBLOOM JOURNEY',
      title: 'Start, Grow and Bloom',
      intro: 'A habit system designed to help you begin without pressure, stay consistent through real-life cycles, and turn progress into habits you can actually keep.',
      actionLabel: 'Action',
      outcomeLabel: 'Outcome',
      steps: [
        {
          title: 'Start with clarity ✨',
          action: 'Choose your game mode and answer a few quick questions about your energy, priorities, and current moment.',
          outcome: 'Innerbloom uses that to create a starting point you can actually sustain.',
          copy: 'Choose your game mode and answer a few quick questions about your energy, priorities, and current moment. Innerbloom uses that to create a starting point you can actually sustain.'
        },
        {
          title: 'Start with your first balanced plan ⚖️',
          action: 'Get a realistic plan across Body, Mind, and Soul, built around simple micro-habits that match your pace.',
          outcome: 'The goal is not intensity. It is consistency you can keep.',
          copy: 'Get a realistic plan across Body, Mind, and Soul, built around simple micro-habits that match your pace. The goal is not intensity. It is consistency you can keep.'
        },
        {
          title: 'Grow with daily progress 📅📈',
          action: 'Complete small habits, log how you feel, and turn daily emotion into visible progress.',
          outcome: 'See what helps you stay consistent.',
          copy: 'Complete small habits, log how you feel, and turn daily emotion into visible progress. See what helps you stay consistent.'
        },
        {
          title: 'Grow with a system that adapts 🌱',
          action: 'As your consistency changes, Innerbloom adjusts the challenge to keep your plan realistic.',
          outcome: 'Growth Calibration and Next Mode help you move forward at the right time.',
          copy: 'As your consistency changes, Innerbloom adjusts the challenge to keep your plan realistic. Growth Calibration and Next Mode help you move forward at the right time.'
        },
        {
          title: 'Bloom into habits that last 🌸',
          action: 'When a habit becomes stable over time, Innerbloom can recognize it as part of your foundation.',
          outcome: 'Habit Bloomed marks the moment consistency becomes lasting change.',
          copy: 'When a habit becomes stable over time, Innerbloom can recognize it as part of your foundation. Habit Bloomed marks the moment consistency becomes lasting change.'
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
      title: 'Visible progress, not just checkmarks',
      text: 'Follow your weeks, reflect on your emotional patterns, and see what truly helps your habits stick over time.',
      cta: 'See how it works'
    },
    testimonials: {
      title: 'Testimonials',
      intro: 'What people say after building sustainable consistency with Innerbloom.',
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
        { id: 'SIX_MONTHS', name: 'SIX_MONTHS', price: '23 EUR', detail: 'A 6-month plan for stronger consistency and better value over time.' },
        { id: 'YEAR', name: 'YEAR', price: '32 EUR', detail: 'Annual plan for deeper commitment, long-term growth, and the best savings.' }
      ]
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        {
          question: 'Is Innerbloom just a habit tracker?',
          answer: 'No. It is a habit growth system built around weekly rhythm, monthly calibration, emotional reflection, and visible progress.'
        },
        {
          question: 'How is it different from other habit apps?',
          answer: 'Most habit apps push daily perfection. Innerbloom helps you stay consistent through real-life cycles and recover after harder weeks.'
        },
        {
          question: 'How do the modes work?',
          answer: 'Modes are pace and intensity settings. You can move across Low, Chill, Flow, and Evolve based on your current capacity.'
        },
        {
          question: 'What do Body, Mind, and Soul mean?',
          answer: 'They are three practical growth pillars: Body (energy and care), Mind (focus and clarity), and Soul (meaning, calm, and connection).'
        },
        {
          question: 'How does progress work over time?',
          answer: 'You track weekly consistency, review emotional patterns, and see when habits become stable enough to feel truly yours.'
        },
        {
          question: 'What if I have a hard week or stop tracking?',
          answer: 'You do not lose your process. Resume from your current rhythm, review the pattern, and rebuild consistency without guilt.'
        }
      ]
    },
    next: {
      title: 'Build habits that grow with you',
      intro: 'Start your rhythm with Innerbloom.'
    },
    auth: {
      dashboard: 'Go to dashboard',
      signup: 'Create account',
      login: 'Log in',
      startJourney: 'Start my Journey',
      guidedDemo: 'See how it works'
    },
    footer: { copyright: '©️ Gamification Journey', faq: 'FAQ' }
  }
};
