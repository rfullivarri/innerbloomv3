import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resolveOnboardingLanguage } from '../onboarding/i18n';
import type { OnboardingLanguage } from '../onboarding/constants';
import type { GameMode } from '../onboarding/state';
import { GAME_MODE_META } from '../lib/gameModeMeta';
import { GameModeStep } from '../onboarding/steps/GameModeStep';
import { HUD } from '../onboarding/ui/HUD';
import { NavButtons } from '../onboarding/ui/NavButtons';

type Pillar = 'Body' | 'Mind' | 'Soul';
type Step = 'game-mode' | 'branch' | 'body' | 'mind' | 'soul' | 'moderation' | 'setup';
type ModerationOption = 'sugar' | 'tobacco' | 'alcohol';

interface Task {
  id: string;
  trait: string;
  text: string;
  inputBefore?: string;
  inputAfter?: string;
  helper?: string;
  suggestions?: string[];
}

interface Translations {
  title: string;
  subtitle: string;
  forkTitle: string;
  forkSubtitle: string;
  personalGuide: string;
  personalGuideHint: string;
  quickStart: string;
  quickStartHint: string;
  inPreview: string;
  comingSoon: string;
  gameModeGateTitle: string;
  gameModeGateSubtitle: string;
  continue: string;
  back: string;
  pillarTitles: Record<Pillar, string>;
  pillarSubtitles: Record<Pillar, string>;
  minRule: (min: number) => string;
  suggestedRule: string;
  minimumRequired: string;
  traitLabel: string;
  taskHelpLabel: string;
  minutesPlaceholder: string;
  countPlaceholder: string;
  moderationTitle: string;
  moderationSubtitle: string;
  moderationHint: string;
  moderationFlex: string;
  setupTitle: string;
  setupSubtitle: string;
  setupDone: string;
  bonusReady: string;
  bonusPending: string;
  modeLabels: Record<GameMode, string>;
  moderationCards: Record<ModerationOption, { title: string; description: string; icon: string }>;
  setupSteps: string[];
  tasks: Record<Pillar, Task[]>;
}



interface QuickStartPreviewDraft {
  selectedGameMode: GameMode;
  onboardingPath: 'quick_start';
  selectedTasksByPillar: Record<Pillar, string[]>;
  selectedTraitsByPillar: Record<Pillar, string[]>;
  editableTaskValues: Record<string, string>;
  selectedModerations: ModerationOption[];
  language: OnboardingLanguage;
  gpSummaryPreview: {
    byPillar: Record<Pillar, number>;
    total: number;
  };
  balanceBonusPreview: {
    active: boolean;
    multiplier: number;
  };
  completedSteps: Partial<Record<Step, boolean>>;
}

const MODE_MINIMUMS: Record<GameMode, number> = {
  LOW: 1,
  CHILL: 2,
  FLOW: 3,
  EVOLVE: 3,
};

const COPY: Record<OnboardingLanguage, Translations> = {
  es: {
    title: 'Vista previa de Inicio rápido',
    subtitle: 'Prototipo visual aislado del onboarding productivo.',
    forkTitle: '¿Cómo querés arrancar hoy?',
    forkSubtitle: 'Estamos probando una nueva variante. Tu onboarding real no cambia.',
    personalGuide: 'Guía personal',
    personalGuideHint: 'Camino guiado y más personalizado, con el acompañamiento completo.',
    quickStart: 'Inicio rápido',
    quickStartHint: 'Camino más rápido y autodirigido para arrancar hoy con tu base.',
    inPreview: 'Vista previa',
    comingSoon: 'Próximamente',
    gameModeGateTitle: 'Primero elegí tu modo de juego',
    gameModeGateSubtitle: 'Usamos la misma pantalla real del onboarding para mantener consistencia.',
    continue: 'Continuar',
    back: 'Volver',
    pillarTitles: {
      Body: 'Inicio rápido · Cuerpo 🫀',
      Mind: 'Inicio rápido · Mente 🧠',
      Soul: 'Inicio rápido · Alma 🏵️',
    },
    pillarSubtitles: {
      Body: 'Elegí 10 tareas visibles y activá las que querés sostener.',
      Mind: 'Ajustá tu foco mental sin salir del ritmo del onboarding actual.',
      Soul: 'Definí hábitos que te ayuden a mantener centro y conexión.',
    },
    minRule: (min) => `Mínimo: ${min} tareas`,
    suggestedRule: 'Sugerido: 9 a 12',
    minimumRequired: 'Necesitás seleccionar el mínimo para continuar.',
    traitLabel: 'Rasgo',
    taskHelpLabel: 'Abrir ideas rápidas de la tarea',
    minutesPlaceholder: 'min',
    countPlaceholder: 'n',
    moderationTitle: 'Moderación',
    moderationSubtitle: 'Elegí qué querés observar con más consciencia.',
    moderationHint: 'Sin juicios: solo seguimiento para encontrar balance.',
    moderationFlex: 'También podés manejar tolerancias flexibles (por ejemplo, fines de semana).',
    setupTitle: 'Configurando tu Inicio rápido',
    setupSubtitle: 'Estamos aplicando tu selección y reutilizando el flujo real del onboarding.',
    setupDone: 'Configuración lista para conectar con demo guiada.',
    bonusReady: 'Balanceado: estás sumando x1.5 GP',
    bonusPending: 'Balanceá Cuerpo, Mente y Alma para sumar x1.5 GP',
    modeLabels: {
      LOW: 'Low',
      CHILL: 'Chill',
      FLOW: 'Flow',
      EVOLVE: 'Evolve',
    },
    moderationCards: {
      sugar: {
        title: 'Azúcar',
        description: 'Registrar cuándo aparece antojo o exceso para mejorar decisiones.',
        icon: '🍬',
      },
      tobacco: {
        title: 'Tabaco',
        description: 'Seguir consumo y contexto para recortar de forma sostenible.',
        icon: '🚭',
      },
      alcohol: {
        title: 'Alcohol',
        description: 'Observar frecuencia y momentos para mantener equilibrio.',
        icon: '🍷',
      },
    },
    setupSteps: [
      'Aplicando tu modo de juego',
      'Equilibrando Cuerpo, Mente y Alma',
      'Preparando tu plan inicial',
      'Activando tu plan',
      'Dejando listo tu Inicio rápido',
    ],
    tasks: {
      Body: [
        { id: 'ENERGIA', trait: 'ENERGIA', text: 'Caminar durante', inputAfter: 'minutos' },
        { id: 'NUTRICION', trait: 'NUTRICION', text: 'Hacer', inputAfter: 'comida(s) equilibrada(s) al día' },
        { id: 'SUENO', trait: 'SUENO', text: 'Dormir al menos', inputAfter: 'horas por noche' },
        {
          id: 'RECUPERACION',
          trait: 'RECUPERACION',
          text: 'Hacer una pausa de recuperación durante el día',
          suggestions: ['frenar unos minutos', 'cerrar los ojos', 'respirar', 'bajar estímulos', 'estirar un poco'],
        },
        { id: 'HIDRATACION', trait: 'HIDRATACION', text: 'Tomar', inputAfter: 'vaso(s) de agua al día' },
        {
          id: 'HIGIENE',
          trait: 'HIGIENE',
          text: 'Completar mi rutina de higiene personal',
          suggestions: ['lavarme la cara', 'bañarme', 'lavarme los dientes', 'ponerme crema', 'ordenar mi cuidado básico'],
        },
        {
          id: 'VITALIDAD',
          trait: 'VITALIDAD',
          text: 'Empezar el día con una rutina activadora',
          suggestions: ['abrir la ventana', 'mover el cuerpo', 'tomar agua', 'estirarme', 'evitar arrancar con el móvil'],
        },
        {
          id: 'POSTURA',
          trait: 'POSTURA',
          text: 'Cuidar mi postura o ergonomía',
          suggestions: ['sentarme mejor', 'ajustar la pantalla', 'apoyar bien la espalda', 'cambiar de posición', 'revisar cómo trabajo'],
        },
        { id: 'MOVILIDAD', trait: 'MOVILIDAD', text: 'Hacer movilidad o estiramientos durante', inputAfter: 'minutos' },
        { id: 'MODERACION', trait: 'MODERACION', text: 'Mejorar mi relación con ciertos consumos o excesos' },
      ],
      Mind: [
        { id: 'ENFOQUE', trait: 'ENFOQUE', text: 'Trabajar con foco profundo durante', inputAfter: 'minutos' },
        { id: 'APRENDIZAJE', trait: 'APRENDIZAJE', text: 'Leer, estudiar o aprender durante', inputAfter: 'minutos' },
        { id: 'CREATIVIDAD', trait: 'CREATIVIDAD', text: 'Dedicar', inputAfter: 'minutos a crear, escribir o idear' },
        {
          id: 'GESTION',
          trait: 'GESTION',
          text: 'Tomarme un momento para respirar, bajar revoluciones o regularme',
          suggestions: ['respirar profundo', 'salir del ruido', 'pausar', 'soltar tensión', 'bajar ansiedad'],
        },
        {
          id: 'AUTOCONTROL',
          trait: 'AUTOCONTROL',
          text: 'Prestar atención a mis acciones impulsivas',
          suggestions: ['notar cuándo reacciono rápido', 'observar impulsos', 'frenar antes de responder', 'detectar automatismos'],
        },
        {
          id: 'RESILIENCIA',
          trait: 'RESILIENCIA',
          text: 'Hacer algo que me desafíe o me saque de mi zona de confort',
          suggestions: ['iniciar una conversación difícil', 'probar algo nuevo', 'hacer algo que vengo evitando', 'sostener una incomodidad útil'],
        },
        {
          id: 'ORDEN',
          trait: 'ORDEN',
          text: 'Ordenar mi espacio, mis tareas o mi mente',
          suggestions: ['ordenar el escritorio', 'vaciar pendientes mentales', 'limpiar una superficie', 'reorganizar tareas', 'poner algo en su lugar'],
        },
        {
          id: 'PROYECCION',
          trait: 'PROYECCION',
          text: 'Dar un paso hacia una meta personal o profesional',
          suggestions: ['enviar un mensaje importante', 'avanzar una idea', 'actualizar CV o portfolio', 'terminar una tarea clave', 'mover una meta un paso'],
        },
        {
          id: 'FINANZAS',
          trait: 'FINANZAS',
          text: 'Revisar mis gastos, ahorro o presupuesto',
          suggestions: ['mirar movimientos', 'registrar gastos', 'revisar presupuesto', 'controlar suscripciones', 'ver cuánto ahorré'],
        },
        { id: 'AGILIDAD', trait: 'AGILIDAD', text: 'Entrenar mi memoria o agilidad mental durante', inputAfter: 'minutos' },
      ],
      Soul: [
        { id: 'CONEXION', trait: 'CONEXION', text: 'Hablar con', inputAfter: 'persona(s) con presencia real' },
        { id: 'ESPIRITUALIDAD', trait: 'ESPIRITUALIDAD', text: 'Dedicar', inputAfter: 'minutos a meditar, rezar o conectar conmigo' },
        {
          id: 'PROPOSITO',
          trait: 'PROPOSITO',
          text: 'Hacer una acción alineada con mi propósito',
          suggestions: ['avanzar algo importante', 'elegir con intención', 'hacer algo que tenga sentido para mí', 'dedicar tiempo a lo que valoro'],
        },
        {
          id: 'VALORES',
          trait: 'VALORES',
          text: 'Tomar una decisión alineada con mis valores',
          suggestions: ['decir que no a algo que no va conmigo', 'elegir con coherencia', 'actuar como quiero ser', 'sostener un criterio importante'],
        },
        {
          id: 'ALTRUISMO',
          trait: 'ALTRUISMO',
          text: 'Hacer un gesto de ayuda o aporte a otros',
          suggestions: ['ayudar a alguien', 'escribir a alguien que lo necesite', 'compartir algo útil', 'colaborar', 'acompañar'],
        },
        {
          id: 'INSIGHT',
          trait: 'INSIGHT',
          text: 'Reflexionar sobre cómo me siento',
          suggestions: ['notar cómo me sentí hoy', 'identificar qué necesito', 'observar qué me afectó', 'darme un momento para escucharme'],
        },
        { id: 'GRATITUD', trait: 'GRATITUD', text: 'Registrar', inputAfter: 'cosa(s) por las que siento gratitud' },
        {
          id: 'NATURALEZA',
          trait: 'NATURALEZA',
          text: 'Conectar con la naturaleza',
          suggestions: ['salir a tomar aire', 'mirar el cielo', 'caminar entre árboles', 'sentarme al sol', 'conectar con algo natural'],
        },
        { id: 'GOZO', trait: 'GOZO', text: 'Dedicar', inputAfter: 'minutos a jugar, reír o disfrutar sin culpa' },
        {
          id: 'AUTOESTIMA',
          trait: 'AUTOESTIMA',
          text: 'Tomarme tiempo para cuidar de mí',
          suggestions: ['cortarme las uñas', 'peinarme', 'arreglarme el pelo', 'cuidarme la barba', 'vestirme con más cariño', 'hacer algo que me haga bien'],
        },
      ],
    },
  },
  en: {
    title: 'Quick Start Preview',
    subtitle: 'Isolated visual prototype from the production onboarding.',
    forkTitle: 'How do you want to start today?',
    forkSubtitle: 'This is a new preview variant. Your real onboarding stays untouched.',
    personalGuide: 'Personal Guide',
    personalGuideHint: 'Guided and more personalized path with full onboarding support.',
    quickStart: 'Quick Start',
    quickStartHint: 'A faster, self-directed path to set your base today.',
    inPreview: 'Preview',
    comingSoon: 'Coming soon',
    gameModeGateTitle: 'First, choose your Game Mode',
    gameModeGateSubtitle: 'This preview reuses the same real Game Mode screen from onboarding.',
    continue: 'Continue',
    back: 'Back',
    pillarTitles: {
      Body: 'Quick Start · Body 🫀',
      Mind: 'Quick Start · Mind 🧠',
      Soul: 'Quick Start · Soul 🏵️',
    },
    pillarSubtitles: {
      Body: 'Review all 10 tasks and activate what you want to sustain.',
      Mind: 'Tune your mental focus while keeping the current onboarding feel.',
      Soul: 'Choose habits that support connection and inner alignment.',
    },
    minRule: (min) => `Minimum: ${min} tasks`,
    suggestedRule: 'Suggested: 9 to 12',
    minimumRequired: 'You need to select the minimum to continue.',
    traitLabel: 'Trait',
    taskHelpLabel: 'Open quick ideas for this task',
    minutesPlaceholder: 'min',
    countPlaceholder: 'qty',
    moderationTitle: 'Moderation',
    moderationSubtitle: 'Choose what you want to track with more awareness.',
    moderationHint: 'No judgment: only tracking to find your own balance.',
    moderationFlex: 'You can also use flexible tolerance settings (for example, weekends).',
    setupTitle: 'Configuring your Quick Start',
    setupSubtitle: 'Applying your selection with the same calibration feel used in onboarding.',
    setupDone: 'Setup ready to connect with guided demo.',
    bonusReady: 'Balanced: you are earning x1.5 GP',
    bonusPending: 'Balance Body, Mind, and Soul to earn x1.5 GP',
    modeLabels: {
      LOW: 'Low',
      CHILL: 'Chill',
      FLOW: 'Flow',
      EVOLVE: 'Evolve',
    },
    moderationCards: {
      sugar: {
        title: 'Sugar',
        description: 'Track cravings or overuse moments to make better decisions.',
        icon: '🍬',
      },
      tobacco: {
        title: 'Tobacco',
        description: 'Track consumption and context to reduce it sustainably.',
        icon: '🚭',
      },
      alcohol: {
        title: 'Alcohol',
        description: 'Observe frequency and triggers to keep things in balance.',
        icon: '🍷',
      },
    },
    setupSteps: [
      'Applying your Game Mode',
      'Balancing Body, Mind and Soul',
      'Preparing your initial plan',
      'Activating your plan',
      'Finalizing your Quick Start setup',
    ],
    tasks: {
      Body: [
        { id: 'ENERGIA', trait: 'ENERGY', text: 'Walk for', inputAfter: 'minutes' },
        { id: 'NUTRICION', trait: 'NUTRITION', text: 'Have', inputAfter: 'balanced meal(s) per day' },
        { id: 'SUENO', trait: 'SLEEP', text: 'Sleep at least', inputAfter: 'hours per night' },
        {
          id: 'RECUPERACION',
          trait: 'RECOVERY',
          text: 'Take a recovery break during the day',
          suggestions: ['pause for a few minutes', 'close your eyes', 'breathe slowly', 'lower stimulation', 'do a quick stretch'],
        },
        { id: 'HIDRATACION', trait: 'HYDRATION', text: 'Drink', inputAfter: 'glass(es) of water per day' },
        {
          id: 'HIGIENE',
          trait: 'HYGIENE',
          text: 'Complete my personal hygiene routine',
          suggestions: ['wash my face', 'take a shower', 'brush my teeth', 'apply moisturizer', 'reset my basic self-care'],
        },
        {
          id: 'VITALIDAD',
          trait: 'VITALITY',
          text: 'Start the day with an activating routine',
          suggestions: ['open the window', 'move my body', 'drink water', 'do a quick stretch', 'avoid starting with my phone'],
        },
        {
          id: 'POSTURA',
          trait: 'POSTURE',
          text: 'Take care of my posture or ergonomics',
          suggestions: ['sit better', 'adjust screen height', 'support my lower back', 'change position', 'check how I am working'],
        },
        { id: 'MOVILIDAD', trait: 'MOBILITY', text: 'Do mobility or stretching for', inputAfter: 'minutes' },
        { id: 'MODERACION', trait: 'MODERATION', text: 'Improve my relationship with certain consumptions or excesses' },
      ],
      Mind: [
        { id: 'ENFOQUE', trait: 'FOCUS', text: 'Do deep focus work for', inputAfter: 'minutes' },
        { id: 'APRENDIZAJE', trait: 'LEARNING', text: 'Read, study, or learn for', inputAfter: 'minutes' },
        { id: 'CREATIVIDAD', trait: 'CREATIVITY', text: 'Spend', inputAfter: 'minutes creating, writing, or ideating' },
        {
          id: 'GESTION',
          trait: 'MANAGEMENT',
          text: 'Take a moment to breathe, slow down, or self-regulate',
          suggestions: ['take a deep breath', 'step away from noise', 'pause briefly', 'release tension', 'lower anxiety'],
        },
        {
          id: 'AUTOCONTROL',
          trait: 'SELF_CONTROL',
          text: 'Notice my impulsive actions',
          suggestions: ['notice fast reactions', 'observe impulses', 'pause before responding', 'spot automatic patterns'],
        },
        {
          id: 'RESILIENCIA',
          trait: 'RESILIENCE',
          text: 'Do something that challenges me outside my comfort zone',
          suggestions: ['start a hard conversation', 'try something new', 'do something I have been avoiding', 'hold useful discomfort'],
        },
        {
          id: 'ORDEN',
          trait: 'ORDER',
          text: 'Organize my space, tasks, or mind',
          suggestions: ['tidy my desk', 'empty mental clutter', 'clean one surface', 'reorder priorities', 'put one thing back in place'],
        },
        {
          id: 'PROYECCION',
          trait: 'PROJECTION',
          text: 'Take one step toward a personal or professional goal',
          suggestions: ['send one important message', 'move one idea forward', 'update CV or portfolio', 'finish one key task', 'advance one goal by one step'],
        },
        {
          id: 'FINANZAS',
          trait: 'FINANCES',
          text: 'Review my spending, savings, or budget',
          suggestions: ['check recent movements', 'log expenses', 'review my budget', 'audit subscriptions', 'check how much I saved'],
        },
        { id: 'AGILIDAD', trait: 'AGILITY', text: 'Train my memory or mental agility for', inputAfter: 'minutes' },
      ],
      Soul: [
        { id: 'CONEXION', trait: 'CONNECTION', text: 'Talk with', inputAfter: 'person(s) with real presence' },
        { id: 'ESPIRITUALIDAD', trait: 'SPIRITUALITY', text: 'Spend', inputAfter: 'minutes meditating, praying, or reconnecting with myself' },
        {
          id: 'PROPOSITO',
          trait: 'PURPOSE',
          text: 'Take one action aligned with my purpose',
          suggestions: ['move something meaningful', 'choose with intention', 'do something that truly matters to me', 'make time for what I value'],
        },
        {
          id: 'VALORES',
          trait: 'VALUES',
          text: 'Make a decision aligned with my values',
          suggestions: ['say no to something that does not fit me', 'choose with integrity', 'act like the person I want to be', 'hold one important boundary'],
        },
        {
          id: 'ALTRUISMO',
          trait: 'ALTRUISM',
          text: 'Do one helpful gesture for someone else',
          suggestions: ['help someone', 'message someone who may need support', 'share something useful', 'collaborate', 'be present for someone'],
        },
        {
          id: 'INSIGHT',
          trait: 'INSIGHT',
          text: 'Reflect on how I feel',
          suggestions: ['notice how I felt today', 'identify what I need', 'observe what affected me', 'give myself a moment to listen inward'],
        },
        { id: 'GRATITUD', trait: 'GRATITUDE', text: 'Log', inputAfter: 'thing(s) I feel grateful for' },
        {
          id: 'NATURALEZA',
          trait: 'NATURE',
          text: 'Connect with nature',
          suggestions: ['go out for fresh air', 'look at the sky', 'walk near trees', 'sit under sunlight', 'connect with something natural'],
        },
        { id: 'GOZO', trait: 'JOY', text: 'Spend', inputAfter: 'minutes playing, laughing, or enjoying without guilt' },
        {
          id: 'AUTOESTIMA',
          trait: 'SELF_ESTEEM',
          text: 'Take time to care for myself',
          suggestions: ['trim my nails', 'comb my hair', 'style my hair', 'groom my beard', 'dress with more care', 'do something that makes me feel good'],
        },
      ],
    },
  },
};

const STEP_ORDER: Step[] = ['game-mode', 'branch', 'body', 'mind', 'soul', 'moderation', 'setup'];

const MODE_ACCENT: Record<GameMode, string> = {
  LOW: GAME_MODE_META.Low.accentColor,
  CHILL: GAME_MODE_META.Chill.accentColor,
  FLOW: GAME_MODE_META.Flow.accentColor,
  EVOLVE: GAME_MODE_META.Evolve.accentColor,
};

const MODE_SOFT_STYLES: Record<GameMode, { tint: string; border: string; glow: string }> = {
  LOW: {
    tint: `color-mix(in srgb, ${MODE_ACCENT.LOW} 20%, transparent)`,
    border: `color-mix(in srgb, ${MODE_ACCENT.LOW} 40%, transparent)`,
    glow: `color-mix(in srgb, ${MODE_ACCENT.LOW} 22%, transparent)`,
  },
  CHILL: {
    tint: `color-mix(in srgb, ${MODE_ACCENT.CHILL} 18%, transparent)`,
    border: `color-mix(in srgb, ${MODE_ACCENT.CHILL} 38%, transparent)`,
    glow: `color-mix(in srgb, ${MODE_ACCENT.CHILL} 20%, transparent)`,
  },
  FLOW: {
    tint: `color-mix(in srgb, ${MODE_ACCENT.FLOW} 20%, transparent)`,
    border: `color-mix(in srgb, ${MODE_ACCENT.FLOW} 42%, transparent)`,
    glow: `color-mix(in srgb, ${MODE_ACCENT.FLOW} 22%, transparent)`,
  },
  EVOLVE: {
    tint: `color-mix(in srgb, ${MODE_ACCENT.EVOLVE} 22%, transparent)`,
    border: `color-mix(in srgb, ${MODE_ACCENT.EVOLVE} 42%, transparent)`,
    glow: `color-mix(in srgb, ${MODE_ACCENT.EVOLVE} 24%, transparent)`,
  },
};

function getDefaultLanguage(searchParams: URLSearchParams): OnboardingLanguage {
  const lang = searchParams.get('lang');
  if (lang === 'es' || lang === 'en') {
    return lang;
  }
  return resolveOnboardingLanguage(window.location.search);
}

function buildVisibleRoute(includeModeration: boolean): Step[] {
  return includeModeration ? STEP_ORDER : STEP_ORDER.filter((step) => step !== 'moderation');
}

function InlineTaskRow({
  task,
  selected,
  inputValue,
  onToggle,
  onInputChange,
  copy,
  mode,
}: {
  task: Task;
  selected: boolean;
  inputValue: string;
  onToggle: () => void;
  onInputChange: (value: string) => void;
  copy: Translations;
  mode: GameMode;
}) {
  const hasInput = Boolean(task.inputAfter || task.inputBefore);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!selected) {
      setShowSuggestions(false);
    }
  }, [selected]);


  return (
    <div className={`relative ${selected ? 'pt-2' : ''}`}>
      {selected ? (
        <div
          className="onboarding-surface-inner pointer-events-none absolute inset-x-0 top-0 h-6 rounded-2xl"
          style={{
            borderColor: 'var(--onboarding-glass-border-soft)',
            background: 'linear-gradient(180deg, color-mix(in srgb, var(--onboarding-glass-surface-inner) 88%, rgba(167,139,250,0.2)), var(--onboarding-glass-surface-inner))',
            boxShadow: '0 10px 24px rgba(8, 12, 28, 0.24)',
          }}
          aria-hidden
        >
          <span className="absolute left-4 top-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-100/80">
            {copy.traitLabel}: {task.trait}
          </span>
        </div>
      ) : null}

      <motion.div
        whileTap={{ scale: 0.985 }}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
        role="button"
        tabIndex={0}
        data-selected={selected ? 'true' : undefined}
        className="onboarding-surface-inner relative z-10 w-full rounded-2xl border px-4 py-3.5 text-left text-white/85 shadow-[0_12px_24px_rgba(8,12,28,0.18)] transition hover:border-white/30 hover:bg-white/[0.12] data-[selected=true]:mt-1.5"
        style={selected
          ? {
              borderColor: 'var(--onboarding-glass-border)',
              background: 'linear-gradient(180deg, color-mix(in srgb, var(--onboarding-glass-surface-base) 92%, rgba(255,255,255,0.18)), color-mix(in srgb, var(--onboarding-glass-surface-base) 82%, rgba(255,255,255,0.1)))',
              boxShadow: 'var(--onboarding-glass-shadow)',
            }
          : undefined}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-2 text-sm leading-relaxed sm:text-base">
            {task.inputBefore ? <span>{task.inputBefore}</span> : null}
            <span>{task.text}</span>
            {hasInput ? (
              <input
                value={inputValue}
                disabled={!selected}
                inputMode="numeric"
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => onInputChange(event.target.value)}
                className="h-6 w-12 rounded-md border border-violet-200/30 bg-violet-100/5 px-1.5 text-center text-xs text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/70 disabled:opacity-40 sm:h-7 sm:w-14"
                placeholder={copy.countPlaceholder}
              />
            ) : null}
            {task.inputAfter ? <span>{task.inputAfter}</span> : null}
            {task.helper ? <span className="w-full text-xs text-white/55">{task.helper}</span> : null}
          </div>

          {selected && task.suggestions?.length ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setShowSuggestions((prev) => !prev);
              }}
              className="relative z-20 ml-auto inline-flex h-5 w-5 shrink-0 items-center justify-center self-start rounded-md border border-violet-200/45 bg-violet-300/18 text-white/90 transition"
              aria-label={copy.taskHelpLabel}
              aria-expanded={showSuggestions}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
                <path d="M9 18h6" />
                <path d="M10 22h4" />
                <path d="M8.5 14.3a6 6 0 1 1 7 0c-.7.53-1.17 1.35-1.3 2.2l-.08.5h-4.24l-.08-.5a3.5 3.5 0 0 0-1.3-2.2Z" />
              </svg>
            </button>
          ) : null}
        </div>
      </motion.div>

      {selected && task.suggestions?.length && showSuggestions ? (
        <div
          className="absolute right-3 bottom-[calc(100%+0.35rem)] z-30 w-[min(18.5rem,calc(100%-1.5rem))] rounded-xl border p-3 text-xs text-white/92 shadow-[0_10px_30px_rgba(43,25,96,0.45)] backdrop-blur"
          style={{ borderColor: 'rgba(196, 181, 253, 0.42)', backgroundColor: 'rgba(17, 24, 39, 0.93)' }}
        >
          <ul className="space-y-1.5">
            {task.suggestions.map((suggestion) => (
              <li key={suggestion} className="leading-relaxed">• {suggestion}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function QuickStartPreviewPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [language, setLanguage] = useState<OnboardingLanguage>(() => getDefaultLanguage(searchParams));
  const [step, setStep] = useState<Step>('game-mode');
  const [gameMode, setGameMode] = useState<GameMode>('CHILL');
  const [selectedByPillar, setSelectedByPillar] = useState<Record<Pillar, string[]>>({ Body: [], Mind: [], Soul: [] });
  const [inputsByTask, setInputsByTask] = useState<Record<string, string>>({});
  const [moderationPrefs, setModerationPrefs] = useState<Record<ModerationOption, boolean>>({
    sugar: false,
    tobacco: false,
    alcohol: false,
  });
  const [setupProgress, setSetupProgress] = useState(1);
  const copy = COPY[language];

  const minimum = MODE_MINIMUMS[gameMode];
  const selectedCounts = {
    Body: selectedByPillar.Body.length,
    Mind: selectedByPillar.Mind.length,
    Soul: selectedByPillar.Soul.length,
  };

  const balancedBonusActive = selectedCounts.Body > 0
    && selectedCounts.Body === selectedCounts.Mind
    && selectedCounts.Mind === selectedCounts.Soul;

  const baseTotalGp = (selectedCounts.Body + selectedCounts.Mind + selectedCounts.Soul) * 3;
  const totalGp = balancedBonusActive ? Math.ceil(baseTotalGp * 1.5) : baseTotalGp;

  const visibleRoute = useMemo(
    () => buildVisibleRoute(selectedByPillar.Body.includes('MODERACION')),
    [selectedByPillar.Body],
  );

  const currentStepIndex = Math.max(0, visibleRoute.indexOf(step));
  const currentPillar = step === 'body' ? 'Body' : step === 'mind' ? 'Mind' : step === 'soul' ? 'Soul' : null;

  const quickStartDraft = useMemo<QuickStartPreviewDraft>(() => {
    const selectedTraitsByPillar = (Object.keys(selectedByPillar) as Pillar[]).reduce<Record<Pillar, string[]>>((acc, pillar) => {
      const taskById = new Map(copy.tasks[pillar].map((task) => [task.id, task.trait]));
      acc[pillar] = selectedByPillar[pillar].map((id) => taskById.get(id)).filter((trait): trait is string => Boolean(trait));
      return acc;
    }, { Body: [], Mind: [], Soul: [] });

    const completedSteps: Partial<Record<Step, boolean>> = {};
    visibleRoute.forEach((routeStep, index) => {
      completedSteps[routeStep] = index <= currentStepIndex;
    });

    return {
      selectedGameMode: gameMode,
      onboardingPath: 'quick_start',
      selectedTasksByPillar: selectedByPillar,
      selectedTraitsByPillar,
      editableTaskValues: inputsByTask,
      selectedModerations: (Object.keys(moderationPrefs) as ModerationOption[]).filter((option) => moderationPrefs[option]),
      language,
      gpSummaryPreview: {
        byPillar: { Body: selectedCounts.Body * 3, Mind: selectedCounts.Mind * 3, Soul: selectedCounts.Soul * 3 },
        total: totalGp,
      },
      balanceBonusPreview: {
        active: balancedBonusActive,
        multiplier: balancedBonusActive ? 1.5 : 1,
      },
      completedSteps,
    };
  }, [balancedBonusActive, copy.tasks, currentStepIndex, gameMode, inputsByTask, language, moderationPrefs, selectedByPillar, selectedCounts.Body, selectedCounts.Mind, selectedCounts.Soul, totalGp, visibleRoute]);

  useEffect(() => {
    if (step === 'setup') {
      setSetupProgress(1);
      const timer = window.setInterval(() => {
        setSetupProgress((prev) => {
          if (prev >= copy.setupSteps.length) {
            window.clearInterval(timer);
            return prev;
          }
          return prev + 1;
        });
      }, 950);

      return () => window.clearInterval(timer);
    }

    return undefined;
  }, [copy.setupSteps.length, step]);

  const handleToggleTask = (pillar: Pillar, taskId: string) => {
    setSelectedByPillar((prev) => {
      const current = prev[pillar];
      const exists = current.includes(taskId);
      const next = exists ? current.filter((id) => id !== taskId) : [...current, taskId];
      return { ...prev, [pillar]: next };
    });
  };

  const goNext = () => {
    if (step === 'game-mode') {
      setStep('branch');
      return;
    }

    if (step === 'branch') {
      setStep('body');
      return;
    }

    const currentIndex = visibleRoute.indexOf(step);
    const nextStep = visibleRoute[currentIndex + 1];
    if (nextStep) {
      setStep(nextStep);
    }
  };

  const goBack = () => {
    const currentIndex = visibleRoute.indexOf(step);
    const previousStep = visibleRoute[currentIndex - 1];
    if (previousStep) {
      setStep(previousStep);
    }
  };

  const canContinue = (() => {
    if (!currentPillar) {
      return true;
    }
    return selectedByPillar[currentPillar].length >= minimum;
  })();

  const handleLanguageChange = (lang: OnboardingLanguage) => {
    setLanguage(lang);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('lang', lang);
    setSearchParams(nextParams, { replace: true });
  };

  const quickStartBody = () => {
    if (!currentPillar) {
      return null;
    }

    const tasks = copy.tasks[currentPillar];
    const modeStyle = MODE_SOFT_STYLES[gameMode];

    return (
      <section className="onboarding-surface-base mx-auto w-full max-w-3xl rounded-3xl p-5 sm:p-7">
        <header className="mb-5 border-b border-white/10 pb-4">
          <p className="text-xs uppercase tracking-[0.25em] text-white/55">{copy.inPreview}</p>
          <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{copy.pillarTitles[currentPillar]}</h1>
          <p className="mt-2 text-sm text-white/70">{copy.pillarSubtitles[currentPillar]}</p>
          <div
            className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold text-violet-50/95"
            style={{
              borderColor: `color-mix(in srgb, ${modeStyle.border} 80%, transparent)`,
              background: `linear-gradient(135deg, ${modeStyle.tint}, color-mix(in srgb, ${modeStyle.tint} 28%, rgba(139,92,246,0.08)))`,
              boxShadow: `0 8px 18px ${modeStyle.glow}`,
            }}
          >
            <span>{copy.minRule(minimum)}</span>
            <span className="text-violet-100/60">·</span>
            <span>{copy.suggestedRule}</span>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`inline-flex rounded-lg border px-3.5 py-1.5 text-[0.68rem] font-medium sm:text-[0.72rem] ${
                balancedBonusActive ? 'border-cyan-200/30 bg-cyan-300/8 text-cyan-100/90' : 'border-sky-200/28 bg-sky-300/8 text-sky-100/85'
              }`}
            >
              {balancedBonusActive ? copy.bonusReady : copy.bonusPending}
            </span>
          </div>
        </header>

        <div className="space-y-3">
          {tasks.map((task) => {
            const selected = selectedByPillar[currentPillar].includes(task.id);
            return (
              <InlineTaskRow
                key={task.id}
                task={task}
                selected={selected}
                inputValue={inputsByTask[`${currentPillar}-${task.id}`] ?? ''}
                onToggle={() => handleToggleTask(currentPillar, task.id)}
                onInputChange={(value) => {
                  setInputsByTask((prev) => ({ ...prev, [`${currentPillar}-${task.id}`]: value }));
                }}
                copy={copy}
                mode={gameMode}
              />
            );
          })}
        </div>

        {!canContinue ? <p className="mt-4 text-xs text-amber-200">{copy.minimumRequired}</p> : null}

        <NavButtons
          language={language}
          onBack={goBack}
          onConfirm={goNext}
          backLabel={copy.back}
          confirmLabel={copy.continue}
          disabled={!canContinue}
        />
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-[#000c40] pb-12 pt-28 text-white sm:pt-32">
      <HUD
        language={language}
        mode={gameMode}
        stepIndex={currentStepIndex}
        totalSteps={visibleRoute.length}
        xp={{ Body: selectedCounts.Body * 3, Mind: selectedCounts.Mind * 3, Soul: selectedCounts.Soul * 3, total: totalGp }}
        onExit={() => navigate('/')}
      />

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4">
        {/* Preview-only payload shape for future DB wiring. No SQL persistence in this iteration. */}
        <pre className="hidden" aria-hidden>{JSON.stringify(quickStartDraft, null, 2)}</pre>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/55">Innerbloom</p>
            <h2 className="text-lg font-semibold text-white">{copy.title}</h2>
            <p className="text-xs text-white/55">{copy.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => handleLanguageChange('es')} className={`rounded-full border px-3 py-1 text-xs ${language === 'es' ? 'border-violet-200/60 bg-violet-400/20' : 'border-white/20 bg-white/8'}`}>ES</button>
            <button type="button" onClick={() => handleLanguageChange('en')} className={`rounded-full border px-3 py-1 text-xs ${language === 'en' ? 'border-violet-200/60 bg-violet-400/20' : 'border-white/20 bg-white/8'}`}>EN</button>
          </div>
        </div>


        {step === 'game-mode' ? (
          <section className="mx-auto w-full max-w-4xl">
            <p className="mb-2 text-xs text-white/65">{copy.gameModeGateTitle}</p>
            <p className="mb-5 text-xs text-white/50">{copy.gameModeGateSubtitle}</p>
            <GameModeStep
              language={language}
              selected={gameMode}
              onSelect={setGameMode}
              onConfirm={goNext}
            />
          </section>
        ) : null}

        {step === 'branch' ? (
          <section className="onboarding-surface-base mx-auto w-full max-w-3xl rounded-3xl p-5 sm:p-7">
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">{copy.forkTitle}</h1>
            <p className="mt-2 text-sm text-white/70">{copy.forkSubtitle}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <article className="rounded-2xl border border-violet-200/25 bg-violet-400/10 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-white"><span aria-hidden>✨</span>{copy.personalGuide}</p>
                <p className="mt-1 text-xs text-white/65">{copy.personalGuideHint}</p>
                <span className="mt-3 inline-flex rounded-full border border-white/20 bg-white/8 px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-white/65">{copy.comingSoon}</span>
              </article>

              <button type="button" onClick={goNext} className="rounded-2xl border border-violet-200/45 bg-violet-500/20 p-4 text-left transition hover:bg-violet-400/25">
                <p className="flex items-center gap-2 text-sm font-semibold text-white"><span aria-hidden>⚡</span>{copy.quickStart}</p>
                <p className="mt-1 text-xs text-white/65">{copy.quickStartHint}</p>
                <span className="mt-3 inline-flex rounded-full border border-violet-200/35 bg-violet-300/20 px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-violet-100">{copy.inPreview}</span>
              </button>
            </div>

          </section>
        ) : null}

        {step === 'body' || step === 'mind' || step === 'soul' ? quickStartBody() : null}

        {step === 'moderation' ? (
          <section className="onboarding-surface-base mx-auto w-full max-w-3xl rounded-3xl p-5 sm:p-7">
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">{copy.moderationTitle}</h1>
            <p className="mt-2 text-sm text-white/70">{copy.moderationSubtitle}</p>
            <p className="mt-2 text-xs text-white/55">{copy.moderationHint}</p>
            <div className="mt-5 space-y-3">
              {(Object.keys(copy.moderationCards) as ModerationOption[]).map((option) => {
                const card = copy.moderationCards[option];
                const enabled = moderationPrefs[option];
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setModerationPrefs((prev) => ({ ...prev, [option]: !prev[option] }))}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${enabled ? 'border-violet-200/45 bg-violet-400/18' : 'border-white/20 bg-white/6'}`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{card.icon} {card.title}</p>
                      <p className="mt-1 text-xs text-white/65">{card.description}</p>
                    </div>
                    <span className={`h-5 w-10 rounded-full p-0.5 ${enabled ? 'bg-violet-300/70' : 'bg-white/20'}`}>
                      <span className={`block h-4 w-4 rounded-full bg-white transition ${enabled ? 'translate-x-5' : ''}`} />
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-white/65">{copy.moderationFlex}</p>
            <NavButtons language={language} onBack={goBack} onConfirm={goNext} backLabel={copy.back} confirmLabel={copy.continue} />
          </section>
        ) : null}

        {step === 'setup' ? (
          <section className="onboarding-surface-base mx-auto w-full max-w-3xl rounded-3xl p-5 sm:p-7">
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">{copy.setupTitle}</h1>
            <p className="mt-2 text-sm text-white/70">{copy.setupSubtitle}</p>
            <ul className="mt-6 space-y-3">
              {copy.setupSteps.map((setupStep, index) => {
                const isVisible = index < setupProgress;
                const complete = setupProgress >= copy.setupSteps.length;
                const isPlanStep = index === 3;
                return (
                  <li key={setupStep} className={`flex items-center gap-3 text-sm transition ${isVisible ? 'opacity-100' : 'opacity-35'}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${isVisible ? 'bg-violet-300' : 'bg-white/25'} ${!complete && index === setupProgress - 1 ? 'animate-pulse' : ''}`} />
                    <span>
                      {setupStep}
                      {isPlanStep ? (
                        <span className="ml-2 inline-flex rounded-full border border-emerald-300/35 bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-100 align-middle">
                          FREE
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className={`h-full bg-gradient-to-r from-violet-300/80 via-indigo-300/85 to-violet-300/80 transition-all duration-700 ${
                  setupProgress >= copy.setupSteps.length ? 'w-full quick-start-setup__progress-complete' : 'w-1/3 quick-start-setup__progress-animated'
                }`}
              />
            </div>
            <style>{`
              .quick-start-setup__progress-animated {
                animation: quick-start-progress 2.3s ease-in-out infinite;
                transform-origin: left;
              }

              @keyframes quick-start-progress {
                0% {
                  transform: translateX(-112%);
                }

                100% {
                  transform: translateX(318%);
                }
              }
            `}</style>
            {setupProgress >= copy.setupSteps.length ? <p className="mt-4 text-sm text-emerald-100">{copy.setupDone}</p> : null}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <motion.button
                type="button"
                onClick={() => navigate('/')}
                whileTap={{ scale: 0.97 }}
                className="order-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#a770ef] via-[#cf8bf3] to-[#fdb99b] px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-[#cf8bf3]/30 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#cf8bf3]/60 sm:order-2"
              >
                {language === 'en' ? 'Finish preview' : 'Finalizar preview'}
              </motion.button>
              <button
                type="button"
                onClick={goBack}
                className="order-2 inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:order-1"
              >
                ← {copy.back}
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
