import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resolveOnboardingLanguage } from '../onboarding/i18n';
import type { OnboardingLanguage } from '../onboarding/constants';
import type { GameMode } from '../onboarding/state';
import { GameModeStep } from '../onboarding/steps/GameModeStep';
import { HUD } from '../onboarding/ui/HUD';
import { NavButtons } from '../onboarding/ui/NavButtons';
import { SelectableCheck } from '../onboarding/ui/SelectableCheck';

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
  minimumRequired: string;
  traitLabel: string;
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
  totalGp: string;
  currentPillarGp: string;
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
    title: 'Quick Start Preview',
    subtitle: 'Prototipo visual aislado del onboarding productivo.',
    forkTitle: '¿Cómo querés arrancar hoy?',
    forkSubtitle: 'Estamos probando una nueva variante. Tu onboarding real no cambia.',
    personalGuide: 'Personal Guide',
    personalGuideHint: 'Mantener camino guiado tradicional.',
    quickStart: 'Quick Start',
    quickStartHint: 'Armar tu base rápida en Body, Mind y Soul.',
    inPreview: 'Preview',
    comingSoon: 'Próximamente',
    gameModeGateTitle: 'Primero elegí tu Game Mode',
    gameModeGateSubtitle: 'Usamos la misma pantalla real del onboarding para mantener consistencia.',
    continue: 'Continuar',
    back: 'Volver',
    pillarTitles: {
      Body: 'Quick Start · Body',
      Mind: 'Quick Start · Mind',
      Soul: 'Quick Start · Soul',
    },
    pillarSubtitles: {
      Body: 'Elegí 10 tareas visibles y activá las que querés sostener.',
      Mind: 'Ajustá tu foco mental sin salir del ritmo del onboarding actual.',
      Soul: 'Definí hábitos que te ayuden a mantener centro y conexión.',
    },
    minRule: (min) => `Mínimo por pilar para este modo: ${min}`,
    minimumRequired: 'Necesitás seleccionar el mínimo para continuar.',
    traitLabel: 'Trait',
    minutesPlaceholder: 'min',
    countPlaceholder: 'n',
    moderationTitle: 'Moderación',
    moderationSubtitle: 'Elegí qué querés observar con más consciencia.',
    moderationHint: 'Sin juicios: solo seguimiento para encontrar balance.',
    moderationFlex: 'También podés manejar tolerancias flexibles (por ejemplo, fines de semana).',
    setupTitle: 'Configurando tu Quick Start',
    setupSubtitle: 'Solo preview visual. Más adelante se conectará con la lógica real.',
    setupDone: 'Setup listo para conectar con demo guiada.',
    bonusReady: 'Bonus balanceado x1.5 activo',
    bonusPending: 'Balanceá Body, Mind y Soul para activar x1.5',
    totalGp: 'GP total',
    currentPillarGp: 'GP del pilar',
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
      'Aplicando tu Game Mode',
      'Equilibrando Body, Mind and Soul',
      'Preparando tu plan inicial',
      'Activando tu suscripción Free',
      'Dejando listo tu Quick Start',
    ],
    tasks: {
      Body: [
        { id: 'ENERGIA', trait: 'ENERGIA', text: 'Voy a caminar durante', inputAfter: 'minutos' },
        { id: 'NUTRICION', trait: 'NUTRICION', text: 'Voy a hacer', inputAfter: 'comida(s) equilibrada(s) al día' },
        { id: 'SUENO', trait: 'SUENO', text: 'Voy a dormir al menos', inputAfter: 'horas por noche' },
        { id: 'RECUPERACION', trait: 'RECUPERACION', text: 'Voy a hacer', inputAfter: 'pausa(s) de recuperación durante el día' },
        { id: 'HIDRATACION', trait: 'HIDRATACION', text: 'Voy a tomar', inputAfter: 'vaso(s) de agua al día' },
        { id: 'HIGIENE', trait: 'HIGIENE', text: 'Voy a completar mi rutina de higiene personal', inputAfter: 'vez/veces al día' },
        { id: 'VITALIDAD', trait: 'VITALIDAD', text: 'Voy a empezar el día con una rutina activadora de', inputAfter: 'minutos' },
        { id: 'POSTURA', trait: 'POSTURA', text: 'Voy a dedicar', inputAfter: 'minutos a cuidar mi postura o ergonomía' },
        { id: 'MOVILIDAD', trait: 'MOVILIDAD', text: 'Voy a hacer movilidad o estiramientos durante', inputAfter: 'minutos' },
        { id: 'MODERACION', trait: 'MODERACION', text: 'Quiero mejorar mi relación con ciertos consumos o excesos' },
      ],
      Mind: [
        { id: 'ENFOQUE', trait: 'ENFOQUE', text: 'Voy a trabajar con foco profundo durante', inputAfter: 'minutos' },
        { id: 'APRENDIZAJE', trait: 'APRENDIZAJE', text: 'Voy a leer, estudiar o aprender durante', inputAfter: 'minutos' },
        { id: 'CREATIVIDAD', trait: 'CREATIVIDAD', text: 'Voy a dedicar', inputAfter: 'minutos a crear, escribir o idear' },
        { id: 'GESTION', trait: 'GESTION', text: 'Voy a tomarme', inputAfter: 'minutos para respirar, bajar revoluciones o regularme' },
        { id: 'AUTOCONTROL', trait: 'AUTOCONTROL', text: 'Voy a prestar atención a mis acciones impulsivas' },
        { id: 'RESILIENCIA', trait: 'RESILIENCIA', text: 'Voy a hacer algo que me desafíe o me saque de mi zona de confort' },
        { id: 'ORDEN', trait: 'ORDEN', text: 'Voy a ordenar mi espacio, mis tareas o mi mente durante', inputAfter: 'minutos' },
        { id: 'PROYECCION', trait: 'PROYECCION', text: 'Voy a avanzar una meta personal o profesional durante', inputAfter: 'minutos' },
        { id: 'FINANZAS', trait: 'FINANZAS', text: 'Voy a revisar mis gastos, ahorro o presupuesto durante', inputAfter: 'minutos' },
        { id: 'AGILIDAD', trait: 'AGILIDAD', text: 'Voy a entrenar mi memoria o agilidad mental durante', inputAfter: 'minutos' },
      ],
      Soul: [
        { id: 'CONEXION', trait: 'CONEXION', text: 'Voy a hablar con', inputAfter: 'persona(s) con presencia real' },
        { id: 'ESPIRITUALIDAD', trait: 'ESPIRITUALIDAD', text: 'Voy a dedicar', inputAfter: 'minutos a meditar, rezar o conectar conmigo' },
        { id: 'PROPOSITO', trait: 'PROPOSITO', text: 'Voy a dedicar', inputAfter: 'minutos a una acción alineada con mi propósito' },
        { id: 'VALORES', trait: 'VALORES', text: 'Voy a tomar', inputAfter: 'decisión(es) alineada(s) con mis valores' },
        { id: 'ALTRUISMO', trait: 'ALTRUISMO', text: 'Voy a hacer', inputAfter: 'gesto(s) de ayuda o aporte a otros' },
        { id: 'INSIGHT', trait: 'INSIGHT', text: 'Voy a escribir o reflexionar durante', inputAfter: 'minutos sobre cómo me siento' },
        { id: 'GRATITUD', trait: 'GRATITUD', text: 'Voy a registrar', inputAfter: 'cosa(s) por las que siento gratitud' },
        { id: 'NATURALEZA', trait: 'NATURALEZA', text: 'Voy a pasar', inputAfter: 'minutos al aire libre o en contacto con la naturaleza' },
        { id: 'GOZO', trait: 'GOZO', text: 'Voy a dedicar', inputAfter: 'minutos a jugar, reír o disfrutar sin culpa' },
        { id: 'AUTOESTIMA', trait: 'AUTOESTIMA', text: 'Voy a tomarme tiempo para cuidar de mí', helper: 'Ej.: uñas, pelo, barba, peinarme' },
      ],
    },
  },
  en: {
    title: 'Quick Start Preview',
    subtitle: 'Isolated visual prototype from the production onboarding.',
    forkTitle: 'How do you want to start today?',
    forkSubtitle: 'This is a new preview variant. Your real onboarding stays untouched.',
    personalGuide: 'Personal Guide',
    personalGuideHint: 'Keep the guided traditional path.',
    quickStart: 'Quick Start',
    quickStartHint: 'Build your base quickly across Body, Mind, and Soul.',
    inPreview: 'Preview',
    comingSoon: 'Coming soon',
    gameModeGateTitle: 'First, choose your Game Mode',
    gameModeGateSubtitle: 'This preview reuses the same real Game Mode screen from onboarding.',
    continue: 'Continue',
    back: 'Back',
    pillarTitles: {
      Body: 'Quick Start · Body',
      Mind: 'Quick Start · Mind',
      Soul: 'Quick Start · Soul',
    },
    pillarSubtitles: {
      Body: 'Review all 10 tasks and activate what you want to sustain.',
      Mind: 'Tune your mental focus while keeping the current onboarding feel.',
      Soul: 'Choose habits that support connection and inner alignment.',
    },
    minRule: (min) => `Minimum required per pillar for this mode: ${min}`,
    minimumRequired: 'You need to select the minimum to continue.',
    traitLabel: 'Trait',
    minutesPlaceholder: 'min',
    countPlaceholder: 'qty',
    moderationTitle: 'Moderation',
    moderationSubtitle: 'Choose what you want to track with more awareness.',
    moderationHint: 'No judgment: only tracking to find your own balance.',
    moderationFlex: 'You can also use flexible tolerance settings (for example, weekends).',
    setupTitle: 'Configuring your Quick Start',
    setupSubtitle: 'UI-only preview. Real logic will be connected in a later phase.',
    setupDone: 'Setup ready to connect with guided demo.',
    bonusReady: 'Balanced bonus x1.5 active',
    bonusPending: 'Balance Body, Mind, and Soul to activate x1.5',
    totalGp: 'Total GP',
    currentPillarGp: 'Pillar GP',
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
      'Activating your Free subscription',
      'Finalizing your Quick Start setup',
    ],
    tasks: {
      Body: [
        { id: 'ENERGIA', trait: 'ENERGY', text: 'I will walk for', inputAfter: 'minutes' },
        { id: 'NUTRICION', trait: 'NUTRITION', text: 'I will have', inputAfter: 'balanced meal(s) per day' },
        { id: 'SUENO', trait: 'SLEEP', text: 'I will sleep at least', inputAfter: 'hours per night' },
        { id: 'RECUPERACION', trait: 'RECOVERY', text: 'I will take', inputAfter: 'recovery break(s) during the day' },
        { id: 'HIDRATACION', trait: 'HYDRATION', text: 'I will drink', inputAfter: 'glass(es) of water per day' },
        { id: 'HIGIENE', trait: 'HYGIENE', text: 'I will complete my personal hygiene routine', inputAfter: 'time(s) per day' },
        { id: 'VITALIDAD', trait: 'VITALITY', text: 'I will start the day with an energizing routine of', inputAfter: 'minutes' },
        { id: 'POSTURA', trait: 'POSTURE', text: 'I will spend', inputAfter: 'minutes taking care of my posture or ergonomics' },
        { id: 'MOVILIDAD', trait: 'MOBILITY', text: 'I will do mobility or stretching for', inputAfter: 'minutes' },
        { id: 'MODERACION', trait: 'MODERATION', text: 'I want to improve my relationship with certain habits, consumptions, or excesses' },
      ],
      Mind: [
        { id: 'ENFOQUE', trait: 'FOCUS', text: 'I will do deep focus work for', inputAfter: 'minutes' },
        { id: 'APRENDIZAJE', trait: 'LEARNING', text: 'I will read, study, or learn for', inputAfter: 'minutes' },
        { id: 'CREATIVIDAD', trait: 'CREATIVITY', text: 'I will spend', inputAfter: 'minutes creating, writing, or ideating' },
        { id: 'GESTION', trait: 'MANAGEMENT', text: 'I will take', inputAfter: 'minutes to breathe, slow down, or self-regulate' },
        { id: 'AUTOCONTROL', trait: 'SELF_CONTROL', text: 'I will pay attention to my impulsive actions' },
        { id: 'RESILIENCIA', trait: 'RESILIENCE', text: 'I will do something that challenges me and pushes me out of my comfort zone' },
        { id: 'ORDEN', trait: 'ORDER', text: 'I will organize my space, tasks, or mind for', inputAfter: 'minutes' },
        { id: 'PROYECCION', trait: 'PROJECTION', text: 'I will move a personal or professional goal forward for', inputAfter: 'minutes' },
        { id: 'FINANZAS', trait: 'FINANCES', text: 'I will review my spending, savings, or budget for', inputAfter: 'minutes' },
        { id: 'AGILIDAD', trait: 'AGILITY', text: 'I will train my memory or mental agility for', inputAfter: 'minutes' },
      ],
      Soul: [
        { id: 'CONEXION', trait: 'CONNECTION', text: 'I will talk with', inputAfter: 'person(s) with real presence' },
        { id: 'ESPIRITUALIDAD', trait: 'SPIRITUALITY', text: 'I will spend', inputAfter: 'minutes meditating, praying, or reconnecting with myself' },
        { id: 'PROPOSITO', trait: 'PURPOSE', text: 'I will spend', inputAfter: 'minutes on an action aligned with my purpose' },
        { id: 'VALORES', trait: 'VALUES', text: 'I will make', inputAfter: 'decision(s) aligned with my values' },
        { id: 'ALTRUISMO', trait: 'ALTRUISM', text: 'I will do', inputAfter: 'gesture(s) to help or contribute to others' },
        { id: 'INSIGHT', trait: 'INSIGHT', text: 'I will write or reflect for', inputAfter: 'minutes on how I feel' },
        { id: 'GRATITUD', trait: 'GRATITUDE', text: 'I will log', inputAfter: 'thing(s) I feel grateful for' },
        { id: 'NATURALEZA', trait: 'NATURE', text: 'I will spend', inputAfter: 'minutes outdoors or in contact with nature' },
        { id: 'GOZO', trait: 'JOY', text: 'I will spend', inputAfter: 'minutes playing, laughing, or enjoying life without guilt' },
        { id: 'AUTOESTIMA', trait: 'SELF_ESTEEM', text: 'I will make time to take care of myself', helper: 'Ex: nails, hair, beard, grooming' },
      ],
    },
  },
};

const STEP_ORDER: Step[] = ['game-mode', 'branch', 'body', 'mind', 'soul', 'moderation', 'setup'];

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
}: {
  task: Task;
  selected: boolean;
  inputValue: string;
  onToggle: () => void;
  onInputChange: (value: string) => void;
  copy: Translations;
}) {
  const hasInput = Boolean(task.inputAfter || task.inputBefore);

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      data-selected={selected ? 'true' : undefined}
      className="w-full overflow-hidden rounded-2xl border border-white/15 bg-white/5 text-left text-white/85 transition hover:border-white/30 hover:bg-white/10 data-[selected=true]:border-sky-300/55 data-[selected=true]:bg-sky-400/12"
    >
      <div className="flex items-start gap-3 px-4 py-4">
        <SelectableCheck
          selected={selected}
          toneClassName="data-[selected=true]:border-transparent data-[selected=true]:bg-sky-400 data-[selected=true]:text-slate-900"
        />
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
              className="h-8 w-16 rounded-lg border border-white/20 bg-white/8 px-2 text-center text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 disabled:opacity-40"
              placeholder={copy.countPlaceholder}
            />
          ) : null}
          {task.inputAfter ? <span>{task.inputAfter}</span> : null}
          {task.helper ? <span className="w-full text-xs text-white/55">{task.helper}</span> : null}
        </div>
      </div>

      {selected ? (
        <div className="border-t border-white/12 bg-white/8 px-4 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100/85">
            {copy.traitLabel}: {task.trait}
          </p>
        </div>
      ) : null}
    </motion.button>
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
  const currentPillarGp = currentPillar ? selectedByPillar[currentPillar].length * 3 : 0;


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

    return (
      <section className="onboarding-surface-base mx-auto w-full max-w-3xl rounded-3xl p-5 sm:p-7">
        <header className="mb-5 border-b border-white/10 pb-4">
          <p className="text-xs uppercase tracking-[0.25em] text-white/55">{copy.inPreview}</p>
          <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{copy.pillarTitles[currentPillar]}</h1>
          <p className="mt-2 text-sm text-white/70">{copy.pillarSubtitles[currentPillar]}</p>
          <p className="mt-2 text-xs text-white/55">{copy.minRule(minimum)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-white/20 bg-white/6 px-3 py-1 text-white/80">
              {copy.currentPillarGp}: {currentPillarGp}
            </span>
            <span className="rounded-full border border-white/20 bg-white/6 px-3 py-1 text-white/80">
              {copy.totalGp}: {totalGp}
            </span>
            <span
              className={`rounded-full border px-3 py-1 ${
                balancedBonusActive ? 'border-emerald-300/40 bg-emerald-400/20 text-emerald-100' : 'border-white/20 bg-white/6 text-white/70'
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
            <button type="button" onClick={() => handleLanguageChange('es')} className={`rounded-full border px-3 py-1 text-xs ${language === 'es' ? 'border-sky-300/60 bg-sky-400/20' : 'border-white/20 bg-white/8'}`}>ES</button>
            <button type="button" onClick={() => handleLanguageChange('en')} className={`rounded-full border px-3 py-1 text-xs ${language === 'en' ? 'border-sky-300/60 bg-sky-400/20' : 'border-white/20 bg-white/8'}`}>EN</button>
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
              <article className="rounded-2xl border border-white/20 bg-white/6 p-4">
                <p className="text-sm font-semibold text-white">{copy.personalGuide}</p>
                <p className="mt-1 text-xs text-white/65">{copy.personalGuideHint}</p>
                <span className="mt-3 inline-flex rounded-full border border-white/20 bg-white/8 px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-white/65">{copy.comingSoon}</span>
              </article>

              <button type="button" onClick={goNext} className="rounded-2xl border border-sky-300/40 bg-sky-400/15 p-4 text-left transition hover:bg-sky-400/20">
                <p className="text-sm font-semibold text-white">{copy.quickStart}</p>
                <p className="mt-1 text-xs text-white/65">{copy.quickStartHint}</p>
                <span className="mt-3 inline-flex rounded-full border border-sky-300/40 bg-sky-300/20 px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-sky-100">{copy.inPreview}</span>
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
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${enabled ? 'border-sky-300/50 bg-sky-400/15' : 'border-white/20 bg-white/6'}`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{card.icon} {card.title}</p>
                      <p className="mt-1 text-xs text-white/65">{card.description}</p>
                    </div>
                    <span className={`h-5 w-10 rounded-full p-0.5 ${enabled ? 'bg-sky-300/70' : 'bg-white/20'}`}>
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
                return (
                  <li key={setupStep} className={`flex items-center gap-3 text-sm transition ${isVisible ? 'opacity-100' : 'opacity-35'}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${isVisible ? 'bg-sky-300' : 'bg-white/25'} ${!complete && index === setupProgress - 1 ? 'animate-pulse' : ''}`} />
                    <span>{setupStep}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className={`h-full bg-gradient-to-r from-violet-300/80 via-indigo-300/85 to-sky-300/80 transition-all duration-700 ${
                  setupProgress >= copy.setupSteps.length ? 'w-full' : 'w-1/3 animate-pulse'
                }`}
              />
            </div>
            {setupProgress >= copy.setupSteps.length ? <p className="mt-4 text-sm text-emerald-100">{copy.setupDone}</p> : null}
            <NavButtons
              language={language}
              onBack={goBack}
              onConfirm={() => navigate('/')}
              backLabel={copy.back}
              confirmLabel={language === 'en' ? 'Finish preview' : 'Finalizar preview'}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}
