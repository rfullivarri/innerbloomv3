import type { LandingCopy, Language } from './officialLandingContent';

export const LANDING_V2_CONTENT: Record<Language, LandingCopy> = {
  es: {
    navLinks: [],
    hero: {
      titleLead: 'Dejá de volver a empezar',
      titleHighlight: 'desde cero.',
      subtitle:
        'Innerbloom te ayuda a seguir apareciendo con hábitos que se ajustan a tu energía, tu semana y tu vida real.',
      note: 'Tu progreso también cuenta en semanas difíciles.',
      alt: 'Dashboard adaptativo de Innerbloom mostrado en un mockup móvil.',
    },
    problem: {
      title: 'La mayoría de las rutinas se rompen cuando la vida se pone pesada.',
      leftPrimary: 'El trabajo aumenta. Dormís peor. El estrés se acumula.',
      leftSecondary: 'Y de golpe, la misma rutina que parecía posible se vuelve irrealista.',
      rightPrimary: 'El problema no es que necesites más presión.',
      rightSecondary: 'Es que el “100% o nada” casi siempre termina siendo nada.',
    },
    pillars: {
      kicker: 'PROGRESO EN EQUILIBRIO',
      title: 'Tu rutina debería sostener tu vida completa.',
      intro:
        'Innerbloom organiza tus hábitos en Body, Mind y Soul para que tu progreso no se convierta en otra lista infinita.',
      highlightLeadIn: 'Las acciones pequeñas también cuentan.',
      highlight:
        'Cuando tu energía cambia, tu plan también puede cambiar sin perder la dirección que venías construyendo.',
      items: [
        {
          emoji: '🫀',
          title: 'Body',
          copy: 'Movimiento, descanso, recuperación y cuidado para sostenerte en semanas reales, no perfectas.',
        },
        {
          emoji: '🧠',
          title: 'Mind',
          copy: 'Foco, claridad, aprendizaje y planificación para mantener dirección sin forzar el mismo rendimiento todos los días.',
        },
        {
          emoji: '🏵️',
          title: 'Soul',
          copy: 'Calma, sentido, reflexión y vínculos para entender mejor cómo te sentís y qué necesitás.',
        },
      ],
    },
    modes: {
      kicker: 'RITMOS REALES',
      title: 'Elegí un ritmo que puedas sostener de verdad.',
      intro:
        'Low, Chill, Flow y Evolve son ritmos semanales. Empezá con una base más liviana, construí constancia y subí el desafío cuando tu progreso muestre que estás listo.',
      items: [
        { id: 'low', title: 'Low', state: '1x semana', goal: 'Una base liviana para volver a empezar sin presión.' },
        { id: 'chill', title: 'Chill', state: '2x semana', goal: 'Un ritmo estable para construir constancia.' },
        { id: 'flow', title: 'Flow', state: '3x semana', goal: 'Más estructura cuando el impulso empieza a sentirse real.' },
        { id: 'evolve', title: 'Evolve', state: '4x semana', goal: 'Un ritmo más alto para semanas en las que estás listo para crecer.' },
      ],
    },
    how: {
      kicker: 'EL SISTEMA',
      title: 'Un sistema simple para sostener constancia sin forzar el 100%.',
      intro:
        'Innerbloom te ayuda a definir tu mínimo, seguir tu ritmo y ajustar antes de que una mala semana se convierta en volver a empezar desde cero.',
      closingLine: 'No toda disciplina significa empujar más fuerte.',
      closingBody:
        'A veces la disciplina es hacer la versión pequeña, mantener vivo el hábito y volver a subir cuando estés listo.',
      steps: [
        {
          badge: 'PASO 1',
          title: 'Definí tu base mínima.',
          bullets: [
            'Elegí la versión más pequeña de tus hábitos antes de que la vida se complique.',
            'Empezá desde lo que podés sostener hoy, no desde una versión ideal de vos mismo.',
          ],
          chips: ['BASE REAL', 'INICIO POSIBLE'],
        },
        {
          badge: 'PASO 2',
          title: 'Cada día deja una señal.',
          bullets: [
            'Registrá qué hiciste, para qué tuviste energía y cómo te sentiste.',
            'Tu progreso deja de ser solo cumplir o fallar.',
          ],
          chips: ['ACCIONES', 'EMOCIONES', 'ENERGÍA'],
        },
        {
          badge: 'PASO 3',
          title: 'Ajustá la intensidad sin empezar de cero.',
          bullets: [
            'Cuando una semana se pone difícil, bajá la carga en vez de abandonar por completo.',
            'Cuando tu progreso se vuelve estable, podés volver a subir el ritmo sin reconstruir toda la rutina.',
          ],
          chips: ['BAJAR CARGA', 'VOLVER A SUBIR'],
        },
        {
          badge: 'PASO 4',
          title: 'Reconocé los hábitos que ya forman parte de tu vida.',
          bullets: [
            'Innerbloom detecta cuándo una acción dejó de ser una tarea suelta y empezó a consolidarse como hábito.',
            'Podés seguir midiéndola o guardarla en tu estante de hábitos logrados, sin perder lo que construiste.',
          ],
          chips: ['HÁBITO LOGRADO', 'ESTANTE'],
        },
      ],
    },
    featureShowcase: {
      kicker: 'VISTA DEL PRODUCTO',
      title: 'Ves el patrón detrás de tus hábitos.',
      intro:
        'Innerbloom convierte acciones, emociones, rachas y energía en señales para entender qué te ayuda a seguir.',
      items: [
        {
          title: 'Daily Quest',
          description: 'Un check-in diario para elegir qué versión del hábito encaja con tu energía real de hoy.',
          previewLabel: 'Ritmo de hoy',
          previewValue: 'Posible',
          previewMeta: 'Las acciones pequeñas cuentan',
        },
        {
          title: 'Emotion Chart',
          description: 'Visualizá cómo se conectan tus emociones y acciones en el tiempo, sin reducir cada día a ganar o perder.',
          previewLabel: 'Señal dominante',
          previewValue: 'Calma',
          previewMeta: 'Patrón detectado',
        },
        {
          title: 'Rachas y constancia',
          description: 'Seguí tu progreso sin convertir un día perdido en volver a empezar todo.',
          previewLabel: 'Ritmo activo',
          previewValue: '3 semanas',
          previewMeta: 'Seguís avanzando',
        },
        {
          title: 'Recalibración de dificultad',
          description: 'Cuando un hábito está demasiado difícil o demasiado fácil, Innerbloom puede ajustar el desafío con el tiempo.',
          previewLabel: 'Ajuste',
          previewValue: 'Bajó',
          previewMeta: 'Según progreso real',
        },
        {
          title: 'Ritmos adaptativos',
          description: 'Movete entre Low, Chill, Flow y Evolve a medida que cambia tu capacidad.',
          previewLabel: 'Ritmo actual',
          previewValue: 'Chill',
          previewMeta: '2x semana',
        },
        {
          title: 'Desarrollo del hábito',
          description: 'Reconocé cuándo un hábito empieza a formar parte de tu vida, no solo de una lista de tareas.',
          previewLabel: 'Estado',
          previewValue: 'Creciendo',
          previewMeta: 'Constancia en mejora',
        },
      ],
    },
    demo: {
      title: 'Entendé por qué seguís — o dónde solés frenar.',
      text:
        'Acciones, emociones, rachas y energía en una vista clara para que tu progreso sea más fácil de entender y sostener.',
      banner: 'Explorá tu ritmo real',
      cta: 'Explorar demo',
    },
    testimonials: {
      title:
        'Un habit tracker pregunta: “¿Lo hiciste?” Innerbloom pregunta: “¿Qué versión podés sostener hoy?”',
      intro:
        'No más 100% o nada. No más perder toda la rutina por una semana difícil. Innerbloom convierte acciones pequeñas, días perdidos, emociones y rachas en un sistema al que podés volver.',
      items: [
        { quote: '“Una mala semana no debería borrar el hábito.”', author: 'Principio Innerbloom' },
        { quote: '“La versión pequeña también cuenta.”', author: 'Principio Innerbloom' },
        { quote: '“No vuelvas a empezar desde cero. Mantené la puerta abierta.”', author: 'Principio Innerbloom' },
      ],
      prev: 'Anterior',
      next: 'Siguiente',
      groupLabel: 'Seleccionar testimonio',
    },
    pricing: {
      title: 'Empezá con el ritmo que encaja hoy',
      intro: 'Elegí el plan que te ayude a construir constancia sin forzar una rutina perfecta.',
      trialHighlight:
        'Todos los planes empiezan con una prueba gratuita de 2 meses. Una forma segura de empezar, explorar el sistema y ver qué te funciona.',
      taxNote: 'Precios finales para cliente (impuestos incluidos).',
      actionLabel: 'Empezar con este ritmo',
      plans: [
        { id: 'FREE', name: 'FREE', price: '2 meses gratis', detail: 'La mejor forma de explorar Innerbloom sin compromiso inicial.' },
        { id: 'MONTH', name: 'MONTH', price: '4,99 EUR/mes', detail: 'Suscripción mensual para seguir construyendo constancia con total flexibilidad.' },
        { id: 'SIX_MONTHS', name: 'SIX MONTHS', price: '23 EUR', detail: 'Plan de 6 meses para una constancia más fuerte y mejor valor a lo largo del tiempo.' },
        { id: 'YEAR', name: 'YEAR', price: '32 EUR', detail: 'Plan anual para un compromiso más profundo, crecimiento a largo plazo y mayor ahorro.' },
      ],
    },
    faq: {
      title: 'Preguntas frecuentes',
      items: [
        {
          question: '¿Bajar la intensidad es bajar la vara?',
          answer:
            'No, si la base mínima está definida antes de necesitarla. Innerbloom te ayuda a tener versiones más pequeñas de tus hábitos para que una mala semana no se convierta en volver a empezar desde cero.',
        },
        {
          question: '¿Qué pasa si tengo una mala semana?',
          answer:
            'No perdés toda la rutina. Innerbloom te ayuda a bajar la carga, seguir apareciendo y volver a tu ritmo normal cuando estés listo.',
        },
        {
          question: '¿En qué se diferencia de un habit tracker?',
          answer:
            'La mayoría de los habit trackers marcan éxito o fallo. Innerbloom también mira ritmo, energía, emociones, rachas y señales de progreso para ayudarte a sostener el hábito en el tiempo.',
        },
        {
          question: '¿Necesito ser constante todos los días?',
          answer:
            'No. El objetivo no es rendir perfecto todos los días. El objetivo es mantener vivo el hábito con un ritmo que puedas sostener de forma realista.',
        },
        {
          question: '¿Qué son Low, Chill, Flow y Evolve?',
          answer:
            'Son ritmos semanales. Low te da una base más liviana, Chill construye constancia, Flow sostiene impulso y Evolve suma estructura cuando estás listo.',
        },
        {
          question: '¿Qué pasa si la versión mínima se vuelve mi default para siempre?',
          answer:
            'Innerbloom está pensado para ajustar en las dos direcciones: bajar intensidad cuando la vida pesa y subir el desafío cuando tu progreso muestra que estás listo.',
        },
      ],
    },
    next: {
      title: 'Dejá de reconstruir tu rutina desde cero.',
      intro: 'Empezá con un ritmo que puedas sostener, ajustá cuando la vida se ponga pesada y crecé cuando estés listo.',
    },
    auth: {
      dashboard: 'Dashboard',
      signup: 'Crear cuenta',
      login: 'Iniciar sesión',
      startJourney: 'Encontrar mi ritmo',
      guidedDemo: 'Ver demo',
    },
    footer: { copyright: '© Innerbloom. Todos los derechos reservados.', faq: 'FAQ' },
  },
  en: {
    navLinks: [],
    hero: {
      titleLead: 'Stop restarting from',
      titleHighlight: 'zero.',
      subtitle:
        'Innerbloom helps you keep showing up with habits that adjust to your energy, your week, and your real life.',
      note: 'Progress still counts, even on bad weeks.',
      alt: 'Innerbloom adaptive habit dashboard shown on a mobile mockup.',
    },
    problem: {
      title: 'Most routines break the moment life gets heavy.',
      leftPrimary: 'Work gets busier. Sleep gets worse. Stress builds up.',
      leftSecondary: 'And suddenly the same routine that felt possible becomes unrealistic.',
      rightPrimary: 'The problem is not that you need more pressure.',
      rightSecondary: 'It is that “100% or nothing” usually turns into nothing.',
    },
    pillars: {
      kicker: 'PROGRESS IN BALANCE',
      title: 'Your routine should support your whole life.',
      intro:
        'Innerbloom organizes your habits across Body, Mind, and Soul so progress does not become one more endless checklist.',
      highlightLeadIn: 'Small actions still count.',
      highlight:
        'When your energy changes, your plan can change too — without losing the direction you were building.',
      items: [
        {
          emoji: '🫀',
          title: 'Body',
          copy: 'Movement, rest, recovery, and care habits that help you stay steady through real weeks, not perfect ones.',
        },
        {
          emoji: '🧠',
          title: 'Mind',
          copy: 'Focus, clarity, learning, and planning habits that help you keep direction without forcing the same output every day.',
        },
        {
          emoji: '🏵️',
          title: 'Soul',
          copy: 'Calm, meaning, reflection, and connection habits that help you understand how you feel and what you need.',
        },
      ],
    },
    modes: {
      kicker: 'REAL RHYTHMS',
      title: 'Choose a rhythm you can actually sustain.',
      intro:
        'Low, Chill, Flow, and Evolve are weekly rhythms. Start with a lower floor, build consistency, and raise the challenge when your progress shows you are ready.',
      items: [
        { id: 'low', title: 'Low', state: '1x week', goal: 'A lighter floor for starting again without pressure.' },
        { id: 'chill', title: 'Chill', state: '2x week', goal: 'A steady rhythm for building consistency.' },
        { id: 'flow', title: 'Flow', state: '3x week', goal: 'More structure when momentum starts to feel real.' },
        { id: 'evolve', title: 'Evolve', state: '4x week', goal: 'A higher rhythm for weeks when you are ready to grow.' },
      ],
    },
    how: {
      kicker: 'THE SYSTEM',
      title: 'A simple system for staying consistent without forcing 100%.',
      intro:
        'Innerbloom helps you define your minimum, follow your rhythm, and adjust before a bad week turns into a full restart.',
      closingLine: 'Not all discipline looks like pushing harder.',
      closingBody:
        'Sometimes discipline is doing the smaller version, keeping the habit alive, and scaling back up when you are ready.',
      steps: [
        {
          badge: 'STEP 1',
          title: 'Define your floor.',
          bullets: [
            'Choose the smallest version of your habits before life gets hard.',
            'Start from what you can actually sustain today, not from an ideal version of yourself.',
          ],
          chips: ['LOWER FLOOR', 'REAL START'],
        },
        {
          badge: 'STEP 2',
          title: 'Every day leaves a signal.',
          bullets: [
            'Log what you did, what you had energy for, and how you felt.',
            'Progress becomes more than pass/fail.',
          ],
          chips: ['ACTIONS', 'EMOTIONS', 'ENERGY'],
        },
        {
          badge: 'STEP 3',
          title: 'Adjust the intensity without starting over.',
          bullets: [
            'When a week gets rough, lower the intensity instead of disappearing completely.',
            'When your progress becomes steady, you can scale the rhythm back up without rebuilding the whole routine.',
          ],
          chips: ['LOWER THE LOAD', 'SCALE BACK UP'],
        },
        {
          badge: 'STEP 4',
          title: 'Recognize the habits that became part of your life.',
          bullets: [
            'Innerbloom detects when an action stops being a one-off task and starts becoming a real habit.',
            'You can keep measuring it or save it on your achieved habit shelf, without losing what you built.',
          ],
          chips: ['ACHIEVED HABIT', 'HABIT SHELF'],
        },
      ],
    },
    featureShowcase: {
      kicker: 'PRODUCT PREVIEW',
      title: 'See the pattern behind your habits.',
      intro:
        'Innerbloom turns actions, emotions, streaks, and energy into signals that help you understand what keeps you going.',
      items: [
        {
          title: 'Daily Quest',
          description: 'A daily check-in that helps you choose what version of the habit fits your real energy today.',
          previewLabel: 'Today’s rhythm',
          previewValue: 'Possible',
          previewMeta: 'Small actions still count',
        },
        {
          title: 'Emotion Chart',
          description: 'See how your emotions and actions connect over time, instead of judging every day as a simple win or loss.',
          previewLabel: 'Dominant signal',
          previewValue: 'Calm',
          previewMeta: 'Pattern detected',
        },
        {
          title: 'Streaks & consistency',
          description: 'Track progress without turning one missed day into a full restart.',
          previewLabel: 'Active rhythm',
          previewValue: '3 weeks',
          previewMeta: 'Still moving forward',
        },
        {
          title: 'Difficulty recalibration',
          description: 'When a habit is too hard or too easy, Innerbloom can adjust the challenge over time.',
          previewLabel: 'Adjustment',
          previewValue: 'Lowered',
          previewMeta: 'Based on real progress',
        },
        {
          title: 'Adaptive rhythms',
          description: 'Move between Low, Chill, Flow, and Evolve as your capacity changes.',
          previewLabel: 'Current rhythm',
          previewValue: 'Chill',
          previewMeta: '2x week',
        },
        {
          title: 'Habit development',
          description: 'Recognize when a habit is becoming part of your life, not just another task you checked off.',
          previewLabel: 'Habit status',
          previewValue: 'Growing',
          previewMeta: 'Consistency improving',
        },
      ],
    },
    demo: {
      title: 'See why you keep going — or where you usually stop.',
      text:
        'Actions, emotions, streaks, and energy in one clear view, so your progress becomes easier to understand and easier to sustain.',
      banner: 'Explore your real rhythm',
      cta: 'Explore demo',
    },
    testimonials: {
      title:
        'A habit tracker asks: “Did you do it?” Innerbloom asks: “What version can you sustain today?”',
      intro:
        'No more 100% or nothing. No more losing the whole routine after one bad week. Innerbloom turns small actions, missed days, emotions, and streaks into a system you can keep returning to.',
      items: [
        { quote: '“A bad week should not erase the habit.”', author: 'Innerbloom principle' },
        { quote: '“The smaller version still counts.”', author: 'Innerbloom principle' },
        { quote: '“Do not restart from zero. Keep the door open.”', author: 'Innerbloom principle' },
      ],
      prev: 'Previous',
      next: 'Next',
      groupLabel: 'Select testimonial',
    },
    pricing: {
      title: 'Start with the rhythm that fits now',
      intro: 'Choose the plan that helps you build consistency without forcing a perfect routine.',
      trialHighlight:
        'All plans start with a 2-month free trial. A safe way to start, explore the system, and see what works for you.',
      taxNote: 'Final customer prices (taxes included).',
      actionLabel: 'Start with this rhythm',
      plans: [
        { id: 'FREE', name: 'FREE', price: '2 months free', detail: 'Best to explore Innerbloom with zero upfront commitment.' },
        { id: 'MONTH', name: 'MONTH', price: '4.99 EUR/month', detail: 'Monthly subscription to keep building consistency with full flexibility.' },
        { id: 'SIX_MONTHS', name: 'SIX MONTHS', price: '23 EUR', detail: 'A 6-month plan for stronger consistency and better value over time.' },
        { id: 'YEAR', name: 'YEAR', price: '32 EUR', detail: 'Annual plan for deeper commitment, long-term growth, and the best savings.' },
      ],
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        {
          question: 'Is lowering the intensity just lowering the bar?',
          answer:
            'No — not if the floor is defined before you need it. Innerbloom helps you set smaller versions of your habits so bad weeks do not become full restarts.',
        },
        {
          question: 'What happens when I have a bad week?',
          answer:
            'You do not lose the whole routine. Innerbloom helps you scale down, keep showing up, and return to your normal rhythm when you are ready.',
        },
        {
          question: 'How is this different from a habit tracker?',
          answer:
            'Most habit trackers mark success or failure. Innerbloom also looks at rhythm, energy, emotions, streaks, and progress signals to help you sustain the habit over time.',
        },
        {
          question: 'Do I need to be consistent every day?',
          answer:
            'No. The goal is not perfect output every day. The goal is to keep the habit alive with a rhythm you can realistically sustain.',
        },
        {
          question: 'What are Low, Chill, Flow, and Evolve?',
          answer:
            'They are weekly rhythms. Low gives you a lighter floor, Chill builds consistency, Flow sustains momentum, and Evolve adds more structure when you are ready.',
        },
        {
          question: 'What if the minimum version becomes my default forever?',
          answer:
            'Innerbloom is designed to scale both ways: lower intensity when life is heavy, and raise the challenge when your progress shows you are ready.',
        },
      ],
    },
    next: {
      title: 'Stop rebuilding your routine from zero.',
      intro: 'Start with a rhythm you can sustain, adjust when life gets heavy, and grow when you are ready.',
    },
    auth: {
      dashboard: 'Dashboard',
      signup: 'Create account',
      login: 'Log in',
      startJourney: 'Find my rhythm',
      guidedDemo: 'View demo',
    },
    footer: { copyright: '© Innerbloom. All rights reserved.', faq: 'FAQ' },
  },
};
