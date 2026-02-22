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
        'Tus hábitos son el mapa. Tu constancia marca el ritmo. Es tu Journey de crecimiento con equilibrio entre Cuerpo, Mente y Alma.',
      note: 'En menos de 3 minutos recibís una orientación inicial para crear tu base personalizada.',
      alt: 'Niño mirando una esfera de energía violeta en el cielo nocturno — Gamification Journey'
    },
    pillars: {
      title: 'Nuestros pilares fundamentales',
      intro:
        'El progreso sostenible necesita equilibrio. 🫀 Cuerpo para tu energía diaria, 🧠 Mente para foco y claridad, y 🏵️ Alma para bienestar emocional y sentido. Cuando un pilar baja, los otros lo sostienen.',
      highlight: 'Obsérvate por primera vez en tercera persona y toma el control de tus acciones y hábitos.',
      items: [
        {
          emoji: '🫀',
          title: 'Cuerpo',
          copy: 'Tu cuerpo es la base de tus hábitos: descanso, nutrición y movimiento sostienen tu energía para cumplir tus tareas diarias.'
        },
        {
          emoji: '🧠',
          title: 'Mente',
          copy: 'La mente ordena lo importante. Con foco y calma, te resulta más simple decidir, sostener acciones y avanzar en lo que importa.'
        },
        {
          emoji: '🏵️',
          title: 'Alma',
          copy: 'El alma integra emociones, vínculos y propósito. Ese equilibrio interno te ayuda a sostener hábitos con más presencia y menos fricción.'
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
      title: 'Cómo funciona',
      intro: 'Un flujo claro para empezar y sostener tu Journey.',
      steps: [
        {
          title: 'Define tu camino',
          copy: 'Respondé algunas preguntas, elegí tu modo de juego y recibí sugerencias iniciales para tu base Body/Mind/Soul. Todo es editable.'
        },
        { title: 'Activa tu base', copy: 'Recibís tu “pergamino digital” por mail y editás/confirmás tu base.' },
        {
          title: 'Tareas diarias + emociones',
          copy: 'Cada día registrás tu emoción y completás tus tareas diarias. Tu avatar refleja cómo te sentís: cuidás a tu avatar cuidándote.'
        },
        {
          title: 'Ajusta y continúa',
          copy: 'Tu sistema evoluciona con vos: editás tu base, ajustás tus tareas y mantenés el rumbo según tu momento real.'
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
    faq: {
      title: 'Preguntas frecuentes',
      items: [
        {
          question: '¿Necesito mucha disciplina para empezar?',
          answer: 'No. Si estás con poca energía, empezás en Low para activar el mínimo vital. El sistema ajusta el ritmo.'
        },
        { question: '¿Puedo cambiar de modo de juego?', answer: 'Sí. Podés cambiar entre Low, Chill, Flow y Evolve según tu momento.' },
        { question: '¿Dónde veo mi progreso?', answer: 'En tu archivo y en el Dashboard, con foco en tus tareas, tus registros emocionales y tu equilibrio general.' },
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
        'Your habits are the map. Consistency sets your pace. A growth Journey balanced across Body, Mind and Soul.',
      note: 'In under 3 minutes you get initial guidance to build your personalized base.',
      alt: 'Kid looking at a violet energy sphere in the night sky — Gamification Journey'
    },
    pillars: {
      title: 'Our core pillars',
      intro:
        'Sustainable progress needs balance. 🫀 Body for daily energy, 🧠 Mind for focus and clarity, and 🏵️ Soul for emotional well-being and meaning. When one pillar drops, the other two support it.',
      highlight: 'See yourself in third person for the first time and take control of your actions and habits.',
      items: [
        {
          emoji: '🫀',
          title: 'Body',
          copy: 'Your body is the base of your habits: rest, nutrition and movement sustain your energy for daily tasks.'
        },
        {
          emoji: '🧠',
          title: 'Mind',
          copy: 'Your mind organizes what matters. With focus and calm, it is easier to decide, stay consistent and move forward.'
        },
        {
          emoji: '🏵️',
          title: 'Soul',
          copy: 'Soul integrates emotions, relationships and purpose. That inner balance helps your habits stay present with less friction.'
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
      title: 'How it works',
      intro: 'A clear flow to start and sustain your Journey.',
      steps: [
        {
          title: 'Define your path',
          copy: 'Answer a few questions, choose your game mode, and receive initial suggestions for your Body/Mind/Soul base. Everything is editable.'
        },
        { title: 'Activate your base', copy: 'You receive your “digital scroll” by email and edit/confirm your base.' },
        {
          title: 'Daily tasks + emotions',
          copy: 'Each day you log your emotion and complete your daily tasks. Your avatar reflects your state: you care for your avatar by caring for yourself.'
        },
        {
          title: 'Adjust and continue',
          copy: 'Your system evolves with you: edit your base, adjust your tasks, and keep moving with your real-life rhythm.'
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
    faq: {
      title: 'Frequently asked questions',
      items: [
        {
          question: 'Do I need strong discipline to start?',
          answer: 'No. If your energy is low, start in Low to activate the vital minimum. The system adjusts the pace.'
        },
        { question: 'Can I switch game modes?', answer: 'Yes. Swap between Low, Chill, Flow and Evolve whenever you need.' },
        { question: 'Where do I see my progress?', answer: 'In your file and dashboard, focused on your tasks, emotion logs, and overall balance.' },
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
