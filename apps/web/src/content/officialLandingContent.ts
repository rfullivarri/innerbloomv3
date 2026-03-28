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
      titleLead: 'Los sistemas de hábitos fallan',
      titleHighlight: 'porque esperan que te sientas igual siempre.',
      subtitle:
        'Innerbloom es un sistema de hábitos adaptado a la vida real. Tu energía cambia, tu estado influye y tu progreso debería seguir contando.',
      note: 'Empieza desde tu nivel real y crece en ciclos semanales.',
      alt: 'Niño mirando una esfera de energía violeta en el cielo nocturno — Gamification Journey'
    },
    problem: {
      title: 'El problema no sos vos.',
      body:
        'Las apps de hábitos suelen asumir una versión irreal de vos:\n\n- misma energía\n- mismo foco\n- misma motivación\n- misma disciplina\n\nsiempre\n\nPero la vida cambia.\nY cuando el sistema no lo reconoce, no solo pierdes constancia:\nempiezas a sentir que fallaste tú.'
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
      kicker: 'EL SISTEMA DE INNERBLOOM',
      title: 'Cómo funciona Innerbloom',
      intro: 'Empieza desde tu nivel real, avanza en ciclos semanales, recalibra con el tiempo y construye hábitos que sí perduran.',
      actionLabel: 'Acción',
      outcomeLabel: 'Resultado',
      steps: [
        {
          title: 'Empieza pequeño, no perfecto ✨',
          action: 'Empieza desde tu capacidad actual con una base simple y sostenible.',
          outcome: 'Sostener importa más que empezar fuerte.',
          copy: 'Empieza desde tu capacidad actual con una base simple y sostenible. Sostener importa más que empezar fuerte.'
        },
        {
          title: 'Crece en ciclos reales ⚖️',
          action: 'Mira tus semanas, no un solo día.',
          outcome: 'Registra tu estado emocional y detecta patrones.',
          copy: 'Mira tus semanas, no un solo día. Registra tu estado emocional y detecta patrones.'
        },
        {
          title: 'Calibra con perspectiva 📅',
          action: 'Revisa tu progreso por ciclos mensuales.',
          outcome: 'Ajusta el ritmo sin romper la constancia.',
          copy: 'Revisa tu progreso por ciclos mensuales. Ajusta el ritmo sin romper la constancia.'
        },
        {
          title: 'Haz visible tu progreso 🌱',
          action: 'Haz visible tu evolución en constancia, emoción y balance.',
          outcome: 'Así entiendes mejor lo que sí te funciona.',
          copy: 'Haz visible tu evolución en constancia, emoción y balance. Así entiendes mejor lo que sí te funciona.'
        },
        {
          title: 'Florece en hábitos duraderos 🌸',
          action: 'Con el tiempo, los hábitos estables pasan a formar parte de tu base.',
          outcome: 'Ahí el progreso deja de sentirse temporal.',
          copy: 'Con el tiempo, los hábitos estables pasan a formar parte de tu base. Ahí el progreso deja de sentirse temporal.'
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
      title: 'Haz visible el progreso que estás construyendo.',
      text: 'Innerbloom te ayuda a ver cómo tu constancia crece y cuándo el progreso ya es real.\n\nPorque avanzar no debería sentirse como todo o nada.\nDebería sentirse visible y honesto.',
      banner: 'Explora cómo se ve tu crecimiento dentro de Innerbloom',
      cta: 'Explorar demo'
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
      startJourney: 'Empieza tu Journey',
      guidedDemo: 'Ver demo guiada'
    },
    footer: { copyright: '©️ Gamification Journey', faq: 'FAQ' }
  },
  en: {
    navLinks: [],
    hero: {
      titleLead: 'Habit systems fail',
      titleHighlight: 'because they expect you to feel the same all the time.',
      subtitle:
        'Innerbloom is a habit system built for real life. Your energy changes, your state matters, and your progress should still count.',
      note: 'Start from your real level and grow through weekly cycles.',
      alt: 'Kid looking at a violet energy sphere in the night sky — Gamification Journey'
    },
    problem: {
      title: 'You’re not the problem.',
      body:
        'Habit apps often assume an unrealistic version of you:\n\n- same energy\n- same focus\n- same motivation\n- same discipline\n\nall the time\n\nBut life changes.\nAnd when the system doesn’t account for that, you don’t just lose consistency:\nyou start feeling like you failed.'
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
      kicker: 'THE INNERBLOOM SYSTEM',
      title: 'How Innerbloom works',
      intro: 'Start from your real level, move through weekly cycles, recalibrate over time, and build habits that actually last.',
      actionLabel: 'Action',
      outcomeLabel: 'Outcome',
      steps: [
        {
          title: 'Start small, not perfect ✨',
          action: 'Start from your current capacity with a simple, sustainable base.',
          outcome: 'Consistency matters more than a strong start.',
          copy: 'Start from your current capacity with a simple, sustainable base. Consistency matters more than a strong start.'
        },
        {
          title: 'Grow through real cycles ⚖️',
          action: 'Track your weeks, not one single day.',
          outcome: 'Log your emotional state and spot patterns.',
          copy: 'Track your weeks, not one single day. Log your emotional state and spot patterns.'
        },
        {
          title: 'Calibrate with perspective 📅',
          action: 'Review progress in monthly cycles.',
          outcome: 'Adjust pace without breaking consistency.',
          copy: 'Review progress in monthly cycles. Adjust pace without breaking consistency.'
        },
        {
          title: 'Make progress visible 🌱',
          action: 'Make your progress visible across consistency, emotion, and balance.',
          outcome: 'That clarity shows what truly works for you.',
          copy: 'Make your progress visible across consistency, emotion, and balance. That clarity shows what truly works for you.'
        },
        {
          title: 'Bloom into lasting habits 🌸',
          action: 'Over time, stable habits become part of your foundation.',
          outcome: 'That is when progress stops feeling temporary.',
          copy: 'Over time, stable habits become part of your foundation. That is when progress stops feeling temporary.'
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
      title: 'Make the progress you’re building visible.',
      text: 'Innerbloom helps you see how your consistency grows and when progress becomes real.\n\nBecause moving forward shouldn’t feel all-or-nothing.\nIt should feel visible and honest.',
      banner: 'Explore how your growth looks inside Innerbloom',
      cta: 'Explore demo'
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
      startJourney: 'Start your Journey',
      guidedDemo: 'See guided demo'
    },
    footer: { copyright: '©️ Gamification Journey', faq: 'FAQ' }
  }
};
