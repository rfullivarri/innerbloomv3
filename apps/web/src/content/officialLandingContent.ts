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
      titleLead: 'Construye hábitos con un sistema',
      titleHighlight: 'que se adapta a tu energía',
      subtitle:
        'Un sistema de hábitos gamificado que se adapta a tu energía, refleja tus emociones y recompensa tu progreso.',
      note: 'En menos de 3 minutos obtienes un punto de partida personalizado según tu energía, tus prioridades y tu ritmo actual.',
      alt: 'Niño mirando una esfera de energía violeta en el cielo nocturno — Gamification Journey'
    },
    pillars: {
      title: 'Nuestros pilares centrales',
      intro:
        'Innerbloom te ayuda a construir equilibrio a través de tres pilares centrales: Body, Mind y Soul. Cada uno sostiene un tipo distinto de energía que necesitas para mantener constancia, sentirte alineado y crecer de forma realista.',
      highlightLeadIn: 'Mírate con perspectiva y elegí tu próximo paso.',
      highlight: 'Tus hábitos crean dirección. Tu conciencia emocional te ayuda a sostenerla.',
      items: [
        {
          emoji: '🫀',
          title: 'Body',
          copy: 'Construye energía física estable con hábitos simples y sostenibles que acompañan tu ritmo diario. Tareas sugeridas: • Camina 20 minutos • Duerme 7 horas'
        },
        {
          emoji: '🧠',
          title: 'Mind',
          copy: 'Entrena foco y claridad mental con hábitos que te ayudan a pensar mejor, decidir mejor y mantener el rumbo. Tareas sugeridas: • Lee 10 páginas • Planifica 3 prioridades'
        },
        {
          emoji: '🏵️',
          title: 'Soul',
          copy: 'Reconecta con tus emociones y tu equilibrio interno a través de hábitos que aportan calma, sentido y conciencia emocional. Tareas sugeridas: • Respira 5 minutos • Escribe 3 gratitudes'
        }
      ]
    },
    modes: {
      title: 'Elige el modo que mejor se adapta a tu energía hoy',
      intro: 'Tu plan no debería exigirte lo mismo todos los días. Innerbloom adapta tu experiencia a través de cuatro game modes según cómo te sientes, para que puedas seguir avanzando sin culpa ni sobrecarga.',
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
          goal: 'sostener el bienestar con rutinas suaves, equilibradas y alcanzables en la vida real.'
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
      kicker: 'THE INNERBLOOM JOURNEY',
      title: 'Start, Grow & Bloom',
      intro: 'Del primer paso a hábitos que perduran.',
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
      title: 'Demo',
      text: '¿Quieres verlo en acción? Recorre la demo interactiva para entender el flujo completo antes de empezar tu journey.',
      cta: 'Explorar demo'
    },
    testimonials: {
      title: 'Testimonials',
      intro: 'Lo que dice la gente después de empezar su journey.',
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
      intro: 'Elige el plan que mejor se ajusta a tu ritmo actual.',
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
        },
        {
          question: '¿Cómo se adapta la dificultad de los hábitos con el tiempo?',
          answer:
            'Innerbloom está diseñado para evolucionar con tu constancia. A medida que cambia tu rendimiento, el sistema puede ajustar la dificultad de las tareas para que tu plan siga siendo realista, equilibrado y lo bastante desafiante como para impulsar tu crecimiento sin sobrecargarte.'
        },
        {
          question: '¿Qué pasa cuando un hábito se vuelve estable?',
          answer:
            'Cuando un hábito se mantiene con constancia a lo largo del tiempo, Innerbloom puede reconocerlo como parte de tu base. Esto te ayuda a ver qué rutinas ya no son solo una intención, sino hábitos reales que has empezado a sostener.'
        },
        {
          question: '¿Puede cambiar mi game mode a medida que progreso?',
          answer:
            'Sí. A medida que tu ritmo se vuelve más estable, Innerbloom puede sugerirte un modo superior que encaje mejor con tu capacidad actual. La idea es ayudarte a crecer en el momento correcto, no empujarte antes de que estés listo.'
        }
      ]
    },
    next: {
      title: 'Listo para empezar',
      intro: 'Empieza con claridad. Crece a tu ritmo.'
    },
    auth: {
      dashboard: 'Ir al dashboard',
      signup: 'Crear cuenta',
      login: 'Iniciar sesión',
      startJourney: 'Empieza mi Journey'
    },
    footer: { copyright: '©️ Gamification Journey', faq: 'FAQ' }
  },
  en: {
    navLinks: [],
    hero: {
      titleLead: 'Build habits with a system',
      titleHighlight: 'that adapts to your energy',
      subtitle:
        'A gamified habit system that adapts to your energy, reflects your emotions, and rewards your progress.',
      note: 'In under 3 minutes, you get a personalized starting point built around your energy, priorities, and current rhythm.',
      alt: 'Kid looking at a violet energy sphere in the night sky — Gamification Journey'
    },
    pillars: {
      title: 'Our core pillars',
      intro:
        'Innerbloom helps you build balance across three core pillars: Body, Mind, and Soul. Each one supports a different kind of energy you need to stay consistent, feel aligned, and grow in a realistic way.',
      highlightLeadIn: 'Pause, zoom out, and choose your next move.',
      highlight: 'Your habits create direction. Your emotional awareness helps you sustain it.',
      items: [
        {
          emoji: '🫀',
          title: 'Body',
          copy: 'Build steady physical energy through simple, sustainable habits that support your daily rhythm. Suggested tasks: • Walk 20 minutes • Sleep 7 hours'
        },
        {
          emoji: '🧠',
          title: 'Mind',
          copy: 'Train focus and mental clarity through habits that help you think better, decide better, and stay on track. Suggested tasks: • Read 10 pages • Plan 3 priorities'
        },
        {
          emoji: '🏵️',
          title: 'Soul',
          copy: 'Reconnect with your emotions and inner balance through habits that bring calm, meaning, and emotional awareness. Suggested tasks: • Breathe 5 minutes • Write 3 gratitudes'
        }
      ]
    },
    modes: {
      title: 'Choose the mode that fits your energy today',
      intro: 'Your plan should not demand the same from you every day. Innerbloom adapts your experience through four game modes based on how you feel, so you can keep moving without guilt or overload.',
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
          goal: 'sustain well-being through smooth, balanced routines that feel achievable in real life.'
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
      kicker: 'THE INNERBLOOM JOURNEY',
      title: 'Start, Grow & Bloom',
      intro: 'From first step to lasting habits.',
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
      title: 'Demo',
      text: 'Want to see it in action? Explore the interactive demo to understand the full flow before starting your journey.',
      cta: 'Explore demo'
    },
    testimonials: {
      title: 'Testimonials',
      intro: 'What people say after starting their journey.',
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
        },
        {
          question: 'How does habit difficulty adapt over time?',
          answer:
            'Innerbloom is designed to evolve with your consistency. As your performance changes, the system can adjust task difficulty so your plan stays realistic, balanced, and challenging enough to support growth without overload.'
        },
        {
          question: 'What happens when a habit becomes stable?',
          answer:
            'When a habit becomes consistent over time, Innerbloom can recognize it as part of your foundation. This helps you see which routines are no longer just intentions, but real habits you have started to sustain.'
        },
        {
          question: 'Can my game mode change as I progress?',
          answer:
            'Yes. As your rhythm becomes more stable, Innerbloom can suggest a higher mode that better matches your current capacity. The idea is to help you grow at the right moment, not to push you before you are ready.'
        }
      ]
    },
    next: {
      title: 'Ready to start',
      intro: 'Start with clarity. Grow at your pace.'
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
