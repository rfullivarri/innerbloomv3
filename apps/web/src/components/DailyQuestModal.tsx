import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { RefObject } from 'react';
import { getDailyQuestDefinition, getDailyQuestStatus, submitDailyQuest } from '../lib/api';
import { useRequest } from '../hooks/useRequest';

type ToastTone = 'success' | 'error';

type ToastAction = {
  label: string;
  href: string;
};

type ToastState = {
  id: number;
  message: string;
  tone: ToastTone;
  detail?: string;
  action?: ToastAction;
  requiresHoldToClose?: boolean;
  holdDurationMs?: number;
};

type DailyQuestModalProps = {
  enabled?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export type DailyQuestModalHandle = {
  open: () => void;
  close: () => void;
};

type PendingSubmission = {
  emotion: number;
  tasks: string[];
  notes: string;
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1 },
};

const HARD_CELEBRATION_DURATION_MS = 900;

const CELEBRATION_PANEL_DURATION_MS = 1800;

const DEFAULT_HOLD_TO_CLOSE_DURATION_MS = 3000;

const CELEBRATION_MESSAGES = [
  'Registro guardado. ¡Arrancaste con todo! 💥 Seguimos sumando XP hoy.',
  'Listo el diario de ayer. ¡Hoy más fuerte! 💪✨',
  '¡Bien! Emoción registrada y tareas checkeadas. 🚀 A por el día.',
] as const;

const CONFETTI_COLORS = ['#38bdf8', '#a855f7', '#fbbf24', '#34d399', '#f97316'];

type ParticleConfig = {
  id: number;
  delay: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotation?: number;
};

type HardCelebration = { taskId: string; id: number; particles: ParticleConfig[] };

type CelebrationOverlayState = {
  id: number;
  message: string;
  confetti: ParticleConfig[];
  xpDelta: number;
};

type TimeoutHandle = ReturnType<typeof setTimeout> | number;
type AnimationFrameHandle = number | TimeoutHandle;

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateHardParticles(): ParticleConfig[] {
  const count = Math.floor(Math.random() * 5) + 6; // 6 - 10
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    delay: index * 0.02 + randomBetween(0, 0.02),
    x: randomBetween(-28, 28),
    y: randomBetween(-56, -32),
    size: randomBetween(6, 10),
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    rotation: randomBetween(-24, 24),
  }));
}

function generateConfettiPieces(): ParticleConfig[] {
  const count = Math.floor(Math.random() * 11) + 10; // 10 - 20
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    delay: randomBetween(0, 0.12) + index * 0.015,
    x: randomBetween(-160, 160),
    y: randomBetween(60, 140),
    size: randomBetween(10, 18),
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    rotation: randomBetween(-180, 180),
  }));
}

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

type EmotionTheme = {
  chipInactive: string;
  chipActive: string;
  chipShadow: string;
  checkBackground: string;
  checkBorder: string;
  checkText: string;
  taskGlow: string;
};

const EMOTION_THEME_MAP: Record<string, EmotionTheme> = {
  calm: {
    chipInactive:
      'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10',
    chipActive:
      'bg-gradient-to-r from-sky-400/90 via-sky-500/80 to-indigo-400/80 text-white ring-1 ring-sky-300/60',
    chipShadow: 'shadow-[0_12px_32px_rgba(56,189,248,0.45)]',
    checkBackground: 'bg-sky-500/20',
    checkBorder: 'border-sky-300/60',
    checkText: 'text-sky-100',
    taskGlow: 'ring-2 ring-sky-400/55 shadow-[0_0_28px_rgba(56,189,248,0.32)]',
  },
  happy: {
    chipInactive:
      'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10',
    chipActive:
      'bg-gradient-to-r from-amber-300/90 via-orange-400/80 to-rose-400/80 text-white ring-1 ring-amber-200/60',
    chipShadow: 'shadow-[0_12px_32px_rgba(251,191,36,0.45)]',
    checkBackground: 'bg-amber-500/20',
    checkBorder: 'border-amber-300/60',
    checkText: 'text-amber-100',
    taskGlow: 'ring-2 ring-amber-400/55 shadow-[0_0_28px_rgba(251,191,36,0.36)]',
  },
  motivation: {
    chipInactive:
      'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10',
    chipActive:
      'bg-gradient-to-r from-violet-400/90 via-fuchsia-500/80 to-purple-500/80 text-white ring-1 ring-violet-300/60',
    chipShadow: 'shadow-[0_12px_32px_rgba(139,92,246,0.45)]',
    checkBackground: 'bg-violet-500/20',
    checkBorder: 'border-violet-300/60',
    checkText: 'text-violet-100',
    taskGlow: 'ring-2 ring-violet-400/55 shadow-[0_0_28px_rgba(139,92,246,0.34)]',
  },
  sad: {
    chipInactive:
      'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10',
    chipActive:
      'bg-gradient-to-r from-indigo-400/90 via-blue-500/80 to-slate-500/80 text-white ring-1 ring-indigo-300/60',
    chipShadow: 'shadow-[0_12px_32px_rgba(99,102,241,0.45)]',
    checkBackground: 'bg-indigo-500/20',
    checkBorder: 'border-indigo-300/60',
    checkText: 'text-indigo-100',
    taskGlow: 'ring-2 ring-indigo-400/55 shadow-[0_0_28px_rgba(99,102,241,0.34)]',
  },
  anxiety: {
    chipInactive:
      'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10',
    chipActive:
      'bg-gradient-to-r from-rose-400/90 via-pink-500/80 to-red-400/80 text-white ring-1 ring-rose-300/60',
    chipShadow: 'shadow-[0_12px_32px_rgba(244,63,94,0.45)]',
    checkBackground: 'bg-rose-500/20',
    checkBorder: 'border-rose-300/60',
    checkText: 'text-rose-100',
    taskGlow: 'ring-2 ring-rose-400/55 shadow-[0_0_28px_rgba(244,63,94,0.36)]',
  },
  frustration: {
    chipInactive:
      'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10',
    chipActive:
      'bg-gradient-to-r from-orange-400/90 via-amber-400/80 to-red-400/80 text-white ring-1 ring-orange-300/60',
    chipShadow: 'shadow-[0_12px_32px_rgba(249,115,22,0.45)]',
    checkBackground: 'bg-orange-500/20',
    checkBorder: 'border-orange-300/60',
    checkText: 'text-orange-100',
    taskGlow: 'ring-2 ring-orange-400/55 shadow-[0_0_28px_rgba(249,115,22,0.36)]',
  },
  tired: {
    chipInactive:
      'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10',
    chipActive:
      'bg-gradient-to-r from-violet-400/90 via-purple-500/80 to-slate-500/80 text-white ring-1 ring-violet-300/60',
    chipShadow: 'shadow-[0_12px_32px_rgba(139,92,246,0.45)]',
    checkBackground: 'bg-violet-500/20',
    checkBorder: 'border-violet-300/60',
    checkText: 'text-violet-100',
    taskGlow: 'ring-2 ring-violet-400/55 shadow-[0_0_28px_rgba(139,92,246,0.34)]',
  },
};

const DEFAULT_EMOTION_THEME: EmotionTheme = {
  chipInactive:
    'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10',
  chipActive:
    'bg-gradient-to-r from-indigo-400/90 via-fuchsia-500/80 to-amber-300/80 text-white ring-1 ring-indigo-300/60',
  chipShadow: 'shadow-[0_12px_32px_rgba(99,102,241,0.45)]',
  checkBackground: 'bg-primary/20',
  checkBorder: 'border-primary/60',
  checkText: 'text-white',
  taskGlow: 'ring-2 ring-primary/55 shadow-[0_0_28px_rgba(129,140,248,0.34)]',
};

type PillarTheme = {
  taskGlow: string;
  checkBackground: string;
  checkBorder: string;
  checkText: string;
};

const PILLAR_THEME_MAP: Record<string, PillarTheme> = {
  BODY: {
    taskGlow: 'ring-2 ring-emerald-400/50 shadow-[0_0_28px_rgba(16,185,129,0.32)]',
    checkBackground: 'bg-emerald-500/15',
    checkBorder: 'border-emerald-300/50',
    checkText: 'text-emerald-100',
  },
  MIND: {
    taskGlow: 'ring-2 ring-sky-400/50 shadow-[0_0_28px_rgba(56,189,248,0.3)]',
    checkBackground: 'bg-sky-500/15',
    checkBorder: 'border-sky-300/50',
    checkText: 'text-sky-100',
  },
  SOUL: {
    taskGlow: 'ring-2 ring-violet-400/50 shadow-[0_0_28px_rgba(139,92,246,0.3)]',
    checkBackground: 'bg-violet-500/15',
    checkBorder: 'border-violet-300/50',
    checkText: 'text-violet-100',
  },
};

const DEFAULT_PILLAR_THEME: PillarTheme = {
  taskGlow: 'ring-2 ring-indigo-400/50 shadow-[0_0_28px_rgba(99,102,241,0.3)]',
  checkBackground: 'bg-indigo-500/15',
  checkBorder: 'border-indigo-300/50',
  checkText: 'text-indigo-100',
};

function resolveEmotionTheme(code?: string, name?: string): EmotionTheme {
  const key = (code ?? name ?? '').toLowerCase();
  return EMOTION_THEME_MAP[key] ?? DEFAULT_EMOTION_THEME;
}

function resolvePillarTheme(code?: string): PillarTheme {
  if (!code) {
    return DEFAULT_PILLAR_THEME;
  }
  return PILLAR_THEME_MAP[code] ?? DEFAULT_PILLAR_THEME;
}

function CheckIcon({ active }: { active: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 20 20"
      className="h-4 w-4"
      initial={false}
      animate={{ scale: active ? 1 : 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 20 }}
    >
      <path
        fill="currentColor"
        d="M7.8 13.2 4.6 10l-1.2 1.2 4.4 4.4 9-9L15.6 5z"
      />
    </motion.svg>
  );
}

export const DailyQuestModal = forwardRef<DailyQuestModalHandle, DailyQuestModalProps>(
  function DailyQuestModal({ enabled = false, returnFocusRef }: DailyQuestModalProps, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [snoozed, setSnoozed] = useState(false);
  const [hasCompletedToday, setHasCompletedToday] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState<number | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pendingSubmission, setPendingSubmission] = useState<PendingSubmission | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hardCelebrations, setHardCelebrations] = useState<HardCelebration[]>([]);
  const [successCelebration, setSuccessCelebration] = useState<CelebrationOverlayState | null>(null);
  const [srAnnouncement, setSrAnnouncement] = useState('');
  const [xpBubble, setXpBubble] = useState<{ id: number; delta: number } | null>(null);
  const [toastHoldProgress, setToastHoldProgress] = useState(0);
  const [toastAnimationState, setToastAnimationState] = useState<'enter' | 'pop'>('enter');
  const [isToastHolding, setIsToastHolding] = useState(false);

  const toastTimer = useRef<TimeoutHandle | null>(null);
  const toastHoldAnimationRef = useRef<AnimationFrameHandle | null>(null);
  const toastHoldStartRef = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const shouldRestoreFocusRef = useRef(false);
  const celebrationTimeoutsRef = useRef<TimeoutHandle[]>([]);
  const successCelebrationTimeoutRef = useRef<TimeoutHandle | null>(null);
  const successCelebrationCloseTimeoutRef = useRef<TimeoutHandle | null>(null);
  const xpBubbleTimeoutRef = useRef<TimeoutHandle | null>(null);
  const toastPopTimeoutRef = useRef<TimeoutHandle | null>(null);

  const requestToastFrame = useCallback(
    (callback: FrameRequestCallback): AnimationFrameHandle => {
      if (typeof window !== 'undefined') {
        if (typeof window.requestAnimationFrame === 'function') {
          return window.requestAnimationFrame(callback);
        }
        return window.setTimeout(() => callback(performance.now()), 16);
      }
      return setTimeout(() => callback(performance.now()), 16);
    },
    [],
  );

  const cancelToastFrame = useCallback(
    (handle: AnimationFrameHandle) => {
      if (
        typeof window !== 'undefined' &&
        typeof window.cancelAnimationFrame === 'function' &&
        typeof handle === 'number'
      ) {
        window.cancelAnimationFrame(handle);
        return;
      }
      clearTimeout(handle);
    },
    [],
  );
  const xpPreviousRef = useRef(0);

  const {
    data: status,
    status: statusRequestState,
    reload: reloadStatus,
  } = useRequest(() => getDailyQuestStatus(), [enabled], { enabled });

  const currentDate = status?.date;

  const { data: definition, status: definitionState } = useRequest(
    () => getDailyQuestDefinition({ date: currentDate }),
    [currentDate, enabled],
    { enabled: Boolean(enabled && currentDate) },
  );

  useEffect(() => {
    if (status?.date) {
      setSnoozed(false);
      setHasCompletedToday(false);
    }
  }, [status?.date]);

  useEffect(() => {
    if (!enabled || !status) {
      setIsOpen(false);
      return;
    }

    if (pendingSubmission) {
      setIsOpen(false);
      return;
    }

    if (status.submitted || hasCompletedToday || snoozed) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
  }, [enabled, status, hasCompletedToday, snoozed, pendingSubmission]);

  useEffect(() => {
    if (!definition) {
      return;
    }

    if (pendingSubmission) {
      return;
    }

    setSelectedEmotion(null);
    setSelectedTasks([]);
    setNotes('');
  }, [definition?.date, pendingSubmission]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
      for (const timeoutId of celebrationTimeoutsRef.current) {
        clearTimeout(timeoutId);
      }
      celebrationTimeoutsRef.current = [];
      if (successCelebrationTimeoutRef.current) {
        clearTimeout(successCelebrationTimeoutRef.current);
        successCelebrationTimeoutRef.current = null;
      }
      if (successCelebrationCloseTimeoutRef.current) {
        clearTimeout(successCelebrationCloseTimeoutRef.current);
        successCelebrationCloseTimeoutRef.current = null;
      }
      if (xpBubbleTimeoutRef.current) {
        clearTimeout(xpBubbleTimeoutRef.current);
        xpBubbleTimeoutRef.current = null;
      }
    };
  }, []);

  const hardTaskIds = useMemo(() => {
    if (!definition) {
      return new Set<string>();
    }

    const identifiers: string[] = [];
    for (const pillar of definition.pillars) {
      for (const task of pillar.tasks) {
        if ((task.difficulty ?? '').toUpperCase() === 'HARD') {
          identifiers.push(task.task_id);
        }
      }
    }

    return new Set(identifiers);
  }, [definition]);

  const xpByTaskId = useMemo(() => {
    const map = new Map<string, number>();
    if (!definition) {
      return map;
    }
    for (const pillar of definition.pillars) {
      for (const task of pillar.tasks) {
        map.set(task.task_id, task.xp ?? 0);
      }
    }
    return map;
  }, [definition]);

  const xpSelected = useMemo(() => {
    return selectedTasks.reduce((total, taskId) => total + (xpByTaskId.get(taskId) ?? 0), 0);
  }, [selectedTasks, xpByTaskId]);

  useEffect(() => {
    const previous = xpPreviousRef.current;
    if (xpSelected > previous) {
      const delta = xpSelected - previous;
      setXpBubble({ id: Date.now(), delta });
      if (xpBubbleTimeoutRef.current && typeof window !== 'undefined') {
        clearTimeout(xpBubbleTimeoutRef.current);
      }
      if (typeof window !== 'undefined') {
        xpBubbleTimeoutRef.current = window.setTimeout(() => {
          setXpBubble(null);
          xpBubbleTimeoutRef.current = null;
        }, 720);
      }
    }
    if (xpSelected !== previous) {
      xpPreviousRef.current = xpSelected;
    }
  }, [xpSelected]);

  useEffect(() => {
    if (!srAnnouncement || typeof window === 'undefined') {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setSrAnnouncement('');
    }, 2400);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [srAnnouncement]);

  const triggerHardCelebration = useCallback(
    (taskId: string) => {
      const celebrationId = Date.now() + Math.random();
      const particles = generateHardParticles();
      setHardCelebrations((current) => [...current, { taskId, id: celebrationId, particles }]);

      if (typeof window !== 'undefined') {
        const timeoutId = window.setTimeout(() => {
          setHardCelebrations((current) => current.filter((entry) => entry.id !== celebrationId));
          celebrationTimeoutsRef.current = celebrationTimeoutsRef.current.filter((id) => id !== timeoutId);
        }, HARD_CELEBRATION_DURATION_MS);
        celebrationTimeoutsRef.current = [...celebrationTimeoutsRef.current, timeoutId];
      }
    },
    [],
  );

  const emotionThemeById = useMemo(() => {
    if (!definition) {
      return new Map<number, EmotionTheme>();
    }
    return new Map<number, EmotionTheme>(
      definition.emotionOptions.map((option) => [
        option.emotion_id,
        resolveEmotionTheme(option.code, option.name),
      ]),
    );
  }, [definition]);

  const selectedEmotionTheme = useMemo(() => {
    if (selectedEmotion == null) {
      return null;
    }
    return emotionThemeById.get(selectedEmotion) ?? DEFAULT_EMOTION_THEME;
  }, [emotionThemeById, selectedEmotion]);

  const toggleTask = useCallback(
    (taskId: string) => {
      setSelectedTasks((current) => {
        if (current.includes(taskId)) {
          return current.filter((id) => id !== taskId);
        }

        if (hardTaskIds.has(taskId)) {
          triggerHardCelebration(taskId);
        }

        return [...current, taskId];
      });
    },
    [hardTaskIds, triggerHardCelebration],
  );

  const closeModal = useCallback(
    (options?: { snooze?: boolean; restoreFocus?: boolean }) => {
      if (options?.snooze) {
        setSnoozed(true);
      }
      if (successCelebrationTimeoutRef.current) {
        clearTimeout(successCelebrationTimeoutRef.current);
        successCelebrationTimeoutRef.current = null;
      }
      if (successCelebrationCloseTimeoutRef.current) {
        clearTimeout(successCelebrationCloseTimeoutRef.current);
        successCelebrationCloseTimeoutRef.current = null;
      }
      setSuccessCelebration(null);
      setSrAnnouncement('');
      shouldRestoreFocusRef.current = options?.restoreFocus !== false;
      setIsOpen(false);
    },
    [],
  );

  const openDailyQuest = useCallback(() => {
    if (!enabled) {
      return;
    }
    setSnoozed(false);
    shouldRestoreFocusRef.current = false;
    setIsOpen(true);
  }, [enabled]);

  useImperativeHandle(
    ref,
    () => ({
      open: openDailyQuest,
      close: () => closeModal({ snooze: true }),
    }),
    [closeModal, openDailyQuest],
  );

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      return;
    }

    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;

    const frame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      shouldRestoreFocusRef.current = false;
      return;
    }

    if (!shouldRestoreFocusRef.current) {
      return;
    }

    shouldRestoreFocusRef.current = false;

    const target = returnFocusRef?.current ?? previouslyFocusedElementRef.current;
    if (target && typeof target.focus === 'function') {
      target.focus();
    }
  }, [isOpen, returnFocusRef]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      return;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal({ snooze: true });
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusableElements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute('data-focus-guard'));

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!activeElement || activeElement === firstElement || !dialog.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
      } else if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeModal, isOpen]);

  const pushToast = (
    message: string,
    tone: ToastTone,
    options?: {
      requiresHoldToClose?: boolean;
      holdDurationMs?: number;
      detail?: string;
      action?: ToastAction;
    },
  ) => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    if (toastHoldAnimationRef.current != null) {
      cancelToastFrame(toastHoldAnimationRef.current);
      toastHoldAnimationRef.current = null;
    }
    toastHoldStartRef.current = null;
    setToastHoldProgress(0);
    setIsToastHolding(false);
    setToastAnimationState('enter');

    const next: ToastState = {
      id: Date.now(),
      message,
      tone,
      detail: options?.detail,
      action: options?.action,
      requiresHoldToClose: options?.requiresHoldToClose,
      holdDurationMs: options?.holdDurationMs,
    };
    setToast(next);

    if (!options?.requiresHoldToClose) {
      toastTimer.current = setTimeout(() => {
        setToast(null);
      }, 3600);
    }
  };

  const resetToastHold = useCallback(() => {
    if (toastHoldAnimationRef.current != null) {
      cancelToastFrame(toastHoldAnimationRef.current);
      toastHoldAnimationRef.current = null;
    }
    toastHoldStartRef.current = null;
    setIsToastHolding(false);
    setToastHoldProgress(0);
  }, [cancelToastFrame]);

  const finishToastHold = useCallback(
    (holdToast?: ToastState | null) => {
      const activeToast = holdToast ?? toast;
      if (!activeToast) {
        return;
      }

      if (toastPopTimeoutRef.current) {
        clearTimeout(toastPopTimeoutRef.current);
        toastPopTimeoutRef.current = null;
      }

      if (toastHoldAnimationRef.current != null) {
        cancelToastFrame(toastHoldAnimationRef.current);
        toastHoldAnimationRef.current = null;
      }

      toastHoldStartRef.current = null;
      setToastHoldProgress(1);
      setIsToastHolding(false);
      setToastAnimationState('pop');

      if (typeof window !== 'undefined') {
        toastPopTimeoutRef.current = window.setTimeout(() => {
          setToast((current) => (current && current.id === activeToast.id ? null : current));
          setToastHoldProgress(0);
          toastPopTimeoutRef.current = null;
        }, 340);
      } else {
        setToast((current) => (current && current.id === activeToast.id ? null : current));
        setToastHoldProgress(0);
      }
    },
    [cancelToastFrame, toast],
  );

  const startToastHold = useCallback(() => {
    if (!toast || !toast.requiresHoldToClose) {
      return;
    }

    if (toastHoldAnimationRef.current != null) {
      return;
    }

    const duration = toast.holdDurationMs ?? DEFAULT_HOLD_TO_CLOSE_DURATION_MS;

    if (duration <= 0) {
      finishToastHold(toast);
      return;
    }

    if (typeof window === 'undefined') {
      finishToastHold(toast);
      return;
    }

    setIsToastHolding(true);
    toastHoldStartRef.current = performance.now();

    const tick = (now: number) => {
      if (!toastHoldStartRef.current) {
        return;
      }

      const elapsed = now - toastHoldStartRef.current;
      const progress = Math.min(elapsed / duration, 1);
      setToastHoldProgress(progress);

      if (progress >= 1) {
        toastHoldAnimationRef.current = null;
        finishToastHold(toast);
        return;
      }

      toastHoldAnimationRef.current = requestToastFrame(tick);
    };

    toastHoldAnimationRef.current = requestToastFrame(tick);
  }, [finishToastHold, requestToastFrame, toast]);

  const cancelToastHold = useCallback(() => {
    if (!toast || !toast.requiresHoldToClose) {
      return;
    }

    if (toastAnimationState === 'pop') {
      return;
    }

    resetToastHold();
  }, [resetToastHold, toast, toastAnimationState]);

  useEffect(() => {
    if (!toast || !toast.requiresHoldToClose) {
      resetToastHold();
    }
  }, [resetToastHold, toast]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
      if (toastHoldAnimationRef.current != null) {
        cancelToastFrame(toastHoldAnimationRef.current);
      }
      if (toastPopTimeoutRef.current) {
        clearTimeout(toastPopTimeoutRef.current);
      }
    };
  }, [cancelToastFrame]);

  const handleSubmit = async () => {
    if (!currentDate || !definition) {
      return;
    }

    if (selectedEmotion == null) {
      pushToast('Elegí una emoción para continuar.', 'error');
      return;
    }

    const trimmedNotes = notes.trim();
    const snapshot: PendingSubmission = {
      emotion: selectedEmotion,
      tasks: [...selectedTasks],
      notes: trimmedNotes,
    };

    setPendingSubmission(snapshot);
    setIsSubmitting(true);

    try {
      const response = await submitDailyQuest({
        date: currentDate,
        emotion_id: selectedEmotion,
        tasks_done: selectedTasks,
        notes: trimmedNotes.length > 0 ? trimmedNotes : null,
      });

      setPendingSubmission(null);
      setIsSubmitting(false);
      setSelectedEmotion(null);
      setSelectedTasks([]);
      setNotes('');
      const missionsBonus = response.missions_v2;
      const toastOptions: {
        requiresHoldToClose: boolean;
        holdDurationMs: number;
        detail?: string;
        action?: ToastAction;
      } = {
        requiresHoldToClose: true,
        holdDurationMs: DEFAULT_HOLD_TO_CLOSE_DURATION_MS,
      };
      if (missionsBonus?.bonus_ready) {
        const missionTasks = missionsBonus.tasks ?? [];
        if (missionTasks.length > 0) {
          const summary = missionTasks
            .map((task) => `${task.mission_name}: ${task.task_name}`)
            .join(' · ');
          toastOptions.detail = `Tareas de Misión: ${summary}`;
        } else {
          toastOptions.detail = 'Bonus listo para reclamar.';
        }
        toastOptions.action = {
          label: 'Ir a Misiones v2',
          href: missionsBonus.redirect_url || '/dashboard-v3/missions-v2',
        };
      }
      const celebrationId = Date.now();
      const celebrationMessage =
        CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)];
      setSuccessCelebration({
        id: celebrationId,
        message: celebrationMessage,
        confetti: generateConfettiPieces(),
        xpDelta: response.xp_delta,
      });
      setSrAnnouncement('Registro guardado con éxito.');
      if (successCelebrationTimeoutRef.current) {
        clearTimeout(successCelebrationTimeoutRef.current);
      }
      if (successCelebrationCloseTimeoutRef.current) {
        clearTimeout(successCelebrationCloseTimeoutRef.current);
      }
      if (typeof window !== 'undefined') {
        successCelebrationTimeoutRef.current = window.setTimeout(() => {
          setSuccessCelebration((current) =>
            current && current.id === celebrationId ? null : current,
          );
          successCelebrationTimeoutRef.current = null;
          successCelebrationCloseTimeoutRef.current = window.setTimeout(() => {
            setHasCompletedToday(true);
            pushToast('¡Éxitos hoy! A darlo todo. 🚀', 'success', toastOptions);
            closeModal({ restoreFocus: true });
            successCelebrationCloseTimeoutRef.current = null;
          }, 220);
        }, CELEBRATION_PANEL_DURATION_MS);
      } else {
        setSuccessCelebration(null);
        setHasCompletedToday(true);
        pushToast('¡Éxitos hoy! A darlo todo. 🚀', 'success', toastOptions);
        closeModal({ restoreFocus: true });
      }
      void reloadStatus();
    } catch (error) {
      console.error('Failed to submit daily quest', error);
      setIsSubmitting(false);
      setPendingSubmission(null);
      shouldRestoreFocusRef.current = false;
      setIsOpen(true);
      pushToast('No pudimos guardar tu Daily Quest. Intentá nuevamente.', 'error');
    }
  };

  const handleSnooze = () => {
    closeModal({ snooze: true });
    pushToast('Recordatorio pospuesto. Volvé cuando quieras completar tu Daily Quest.', 'success');
  };

  const isLoadingStatus = statusRequestState === 'loading' || statusRequestState === 'idle';
  const isDefinitionLoading = definitionState === 'loading' && !definition;
  const portalTarget = typeof document !== 'undefined' ? document.body : null;
  const showSkeleton = isLoadingStatus || isDefinitionLoading;
  const canShowContent = Boolean(definition && !isDefinitionLoading);
  const isConfirmDisabled = isSubmitting || selectedEmotion == null;
  const showEmotionHelper = selectedEmotion == null;
  const helperTextId = 'daily-quest-confirm-helper';

  return (
    <>
      <div aria-live="polite" role="status" aria-atomic="true" className="sr-only">
        {srAnnouncement}
      </div>
      {portalTarget &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-2 md:p-4"
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                transition={{ duration: 0.2, ease: 'easeOut' }}
                layout={false}
              >
                <div
                  role="presentation"
                  aria-hidden="true"
                  className="absolute inset-0"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleSnooze();
                  }}
                />
                <motion.div
                  ref={dialogRef}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="daily-quest-title"
                  variants={modalVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  transition={{ duration: 0.24, ease: 'easeOut' }}
                  className="pointer-events-auto relative mx-auto flex h-[100dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-slate-900/95 text-white shadow-2xl backdrop-blur md:max-w-2xl"
                  layout={false}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <motion.header
                    layout={false}
                    className="sticky top-[env(safe-area-inset-top)] z-10 flex flex-col justify-center border-b border-white/10 bg-slate-900/95 px-4 py-3 backdrop-blur md:py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">Daily Quest</p>
                        <h2 id="daily-quest-title" className="text-lg font-semibold text-white md:text-xl">
                          ☀️ Retrospectiva
                        </h2>
                        <p className="text-[11px] text-white/65 md:text-xs">
                          Registrá cómo te sentiste ayer, elegí la emoción que predominó y marcá las tareas logradas.
                          ¡Seguí sumando XP y rachas!
                        </p>
                      </div>
                      <button
                        ref={closeButtonRef}
                        type="button"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm text-white/80 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        onClick={handleSnooze}
                        aria-label="Cerrar Daily Quest"
                      >
                        ✕
                      </button>
                    </div>
                  </motion.header>

                  <div
                    className="flex-1 overflow-y-auto -webkit-overflow-scrolling-touch px-4 pb-28 pt-4"
                    aria-live="polite"
                  >
                    <div className="flex flex-col gap-6 pb-6">
                      {showSkeleton && (
                        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                          <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
                          <div className="h-3 w-3/4 animate-pulse rounded-full bg-white/10" />
                          <div className="h-3 w-5/6 animate-pulse rounded-full bg-white/10" />
                        </div>
                      )}

                      {canShowContent && definition && (
                        <>
                          <section className="flex flex-col gap-2">
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                              ¿Qué sentimiento prevaleció más el día de ayer?
                            </h3>
                            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Emociones disponibles">
                              {definition.emotionOptions.map((option) => {
                                const isActive = selectedEmotion === option.emotion_id;
                                const theme = emotionThemeById.get(option.emotion_id) ?? DEFAULT_EMOTION_THEME;
                                return (
                                  <motion.button
                                    key={option.emotion_id}
                                    type="button"
                                    initial={false}
                                    animate={isActive ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                                    transition={{ duration: isActive ? 0.32 : 0.18, ease: 'easeOut' }}
                                    whileTap={{ scale: 0.94 }}
                                    onClick={() => setSelectedEmotion(option.emotion_id)}
                                    className={classNames(
                                      'relative overflow-visible rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                                      isActive
                                        ? classNames(theme.chipActive, theme.chipShadow)
                                        : theme.chipInactive,
                                    )}
                                    aria-pressed={isActive}
                                  >
                                    <span className="inline-flex items-center gap-1.5">
                                      {option.name}
                                    </span>
                                  </motion.button>
                                );
                              })}
                            </div>
                          </section>

                          <section className="flex flex-col gap-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-white/80">Checklist del día</h3>
                            <div className="flex flex-col">
                              {definition.pillars.map((pillar, index) => {
                                const fallbackTheme = resolvePillarTheme(pillar.pillar_code);
                                const headingMarginClass = index === 0 ? 'mt-4 md:mt-6' : 'mt-6 md:mt-8';
                                return (
                                  <section key={pillar.pillar_code} className="flex flex-col">
                                    <h4
                                      className={classNames(
                                        'text-base font-semibold tracking-wide uppercase text-white/90 md:text-lg',
                                        headingMarginClass,
                                      )}
                                    >
                                      {pillar.pillar_code === 'BODY'
                                        ? '🫀 Cuerpo (BODY)'
                                        : pillar.pillar_code === 'MIND'
                                        ? '🧠 Mente (MIND)'
                                        : pillar.pillar_code === 'SOUL'
                                        ? '🏵️ Alma (SOUL)'
                                        : pillar.pillar_code}
                                    </h4>
                                    <span className="mt-2 h-1.5 w-16 rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300" />
                                    <div className="mt-3 flex flex-col gap-2">
                                      {pillar.tasks.map((task) => {
                                        const isSelected = selectedTasks.includes(task.task_id);
                                        const theme = selectedEmotionTheme ?? fallbackTheme;
                                        const isHardTask = hardTaskIds.has(task.task_id);
                                        const activeCelebrations = isHardTask
                                          ? hardCelebrations.filter((entry) => entry.taskId === task.task_id)
                                          : [];

                                        return (
                                          <motion.label
                                            key={task.task_id}
                                            whileTap={{ scale: 0.98 }}
                                            className={classNames(
                                              'group relative flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 text-left transition duration-200 hover:bg-white/[0.07] focus-within:ring-2 focus-within:ring-white/60',
                                              isSelected && 'bg-white/[0.12] backdrop-blur-sm',
                                            )}
                                          >
                                            <AnimatePresence>
                                              {isSelected && (
                                                <motion.span
                                                  key="task-halo"
                                                  className={classNames(
                                                    'pointer-events-none absolute inset-0 rounded-2xl',
                                                    theme.taskGlow,
                                                  )}
                                                  initial={{ opacity: 0, scale: 0.96 }}
                                                  animate={{ opacity: 1, scale: 1 }}
                                                  exit={{ opacity: 0, scale: 1.04 }}
                                                  transition={{ duration: 0.22, ease: 'easeOut' }}
                                                />
                                              )}
                                            </AnimatePresence>
                                            {isHardTask && (
                                              <AnimatePresence>
                                                {activeCelebrations.map((entry) => (
                                                  <motion.div
                                                    key={`hard-badge-${entry.id}`}
                                                    initial={{ opacity: 0, scale: 0.6, y: 8 }}
                                                    animate={{ opacity: 1, scale: 1, y: -8 }}
                                                    exit={{ opacity: 0, y: -24 }}
                                                    transition={{
                                                      type: 'spring',
                                                      stiffness: 260,
                                                      damping: 22,
                                                      duration: 0.6,
                                                    }}
                                                    className="pointer-events-none absolute right-3 top-3 rounded-lg px-2 py-1 text-[11px] font-semibold text-amber-200 shadow-[0_12px_40px_rgba(251,191,36,0.25)] ring-1 ring-amber-400/40"
                                                    style={{ backgroundColor: 'rgba(251, 191, 36, 0.18)' }}
                                                  >
                                                    HARD · +{task.xp} XP
                                                  </motion.div>
                                                ))}
                                              </AnimatePresence>
                                            )}
                                            {isHardTask && (
                                              <AnimatePresence>
                                                {activeCelebrations.map((entry) => (
                                                  <motion.div
                                                    key={`hard-particles-${entry.id}`}
                                                    className="pointer-events-none absolute inset-0 z-[3]"
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.12 }}
                                                  >
                                                    {entry.particles.map((particle) => (
                                                      <motion.span
                                                        key={particle.id}
                                                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                                                        style={{
                                                          width: particle.size,
                                                          height: particle.size,
                                                          backgroundColor: particle.color,
                                                        }}
                                                        initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                                                        animate={{
                                                          opacity: [0, 1, 0],
                                                          scale: [0, 1.2, 0.8],
                                                          x: particle.x,
                                                          y: particle.y,
                                                        }}
                                                        exit={{ opacity: 0, scale: 0.6, y: particle.y - 12 }}
                                                        transition={{
                                                          duration: HARD_CELEBRATION_DURATION_MS / 1000,
                                                          delay: particle.delay,
                                                          ease: 'easeOut',
                                                        }}
                                                      />
                                                    ))}
                                                  </motion.div>
                                                ))}
                                              </AnimatePresence>
                                            )}
                                            <div className="relative z-[2] flex items-start gap-3">
                                              <motion.span
                                                className={classNames(
                                                  'flex h-5 w-5 items-center justify-center rounded-full border text-[10px] transition-colors duration-200',
                                                  isSelected
                                                    ? classNames(theme.checkBackground, theme.checkBorder, theme.checkText)
                                                    : 'border-white/20 text-white/40',
                                                )}
                                                initial={false}
                                                animate={{ scale: isSelected ? 1 : 0.92 }}
                                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                              >
                                                <CheckIcon active={isSelected} />
                                              </motion.span>
                                              <div className="space-y-1">
                                                <p className="font-medium text-white">{task.name}</p>
                                                <p className="text-xs text-white/60">
                                                  {task.difficulty ? `Dificultad ${task.difficulty}` : 'Dificultad desconocida'} · {task.xp} XP
                                                </p>
                                              </div>
                                            </div>
                                            <input
                                              type="checkbox"
                                              className="sr-only"
                                              checked={isSelected}
                                              onChange={() => toggleTask(task.task_id)}
                                            />
                                          </motion.label>
                                        );
                                      })}
                                    </div>
                                  </section>
                                );
                              })}
                            </div>
                          </section>

                          <section className="flex flex-col gap-2">
                            <label htmlFor="daily-quest-notes" className="text-sm font-semibold uppercase tracking-wide text-white/70">
                              Notas opcionales
                            </label>
                            <textarea
                              id="daily-quest-notes"
                              value={notes}
                              onChange={(event) => setNotes(event.target.value)}
                              placeholder="¿Algo que quieras destacar de tu día?"
                              className="min-h-[96px] resize-y rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white placeholder:text-white/40 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/60"
                            />
                          </section>
                        </>
                      )}
                    </div>
                  </div>

                  <motion.footer
                    layout={false}
                    className="sticky bottom-[env(safe-area-inset-bottom)] z-10 border-t border-white/10 bg-slate-900/90 px-4 py-2 backdrop-blur md:py-3"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="relative text-white">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Experiencia ganada</p>
                        <p className="mt-1 text-2xl font-bold md:text-3xl">
                          XP:{' '}
                          <span
                            data-testid="xp-counter"
                            className="text-amber-200 drop-shadow-[0_0_12px_rgba(251,191,36,0.35)]"
                          >
                            {xpSelected}
                          </span>
                        </p>
                        <AnimatePresence>
                          {xpBubble && (
                            <motion.span
                              key={xpBubble.id}
                              className="pointer-events-none absolute -top-2 right-0 rounded-full bg-amber-500/30 px-2 py-1 text-[11px] font-semibold text-amber-100 shadow-[0_8px_22px_rgba(251,191,36,0.35)]"
                              initial={{ opacity: 0, y: 10, scale: 0.8 }}
                              animate={{ opacity: 1, y: -6, scale: 1 }}
                              exit={{ opacity: 0, y: -18, scale: 0.85 }}
                              transition={{ duration: 0.36, ease: 'easeOut' }}
                            >
                              +{xpBubble.delta} XP
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="grid w-full grid-cols-2 gap-2 md:w-auto md:grid-cols-[auto_auto]">
                        <button
                          type="button"
                          onClick={handleSnooze}
                          className="h-10 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-white/70 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 md:h-11 md:px-6"
                        >
                          Más tarde
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={isConfirmDisabled}
                          aria-describedby={showEmotionHelper ? helperTextId : undefined}
                          aria-label="Registrar Daily Quest"
                          className={classNames(
                            'inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-400 via-fuchsia-500 to-amber-300 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(99,102,241,0.35)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-60 md:h-11 md:px-6',
                            !isConfirmDisabled && 'hover:from-indigo-300 hover:via-fuchsia-500 hover:to-amber-200',
                            isSubmitting && 'cursor-wait',
                          )}
                        >
                          {isSubmitting ? 'Guardando…' : 'Confirmar'}
                        </button>
                      </div>
                    </div>
                    {showEmotionHelper && (
                      <p id={helperTextId} className="text-[11px] text-rose-200/80 md:text-right">
                        Seleccioná una emoción para confirmar.
                      </p>
                    )}
                  </motion.footer>
                  <AnimatePresence>
                    {successCelebration && (
                      <motion.div
                        key={successCelebration.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.24, ease: 'easeOut' }}
                        className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
                      >
                        <div className="pointer-events-none absolute inset-0 overflow-hidden">
                          {successCelebration.confetti.map((piece) => (
                            <motion.span
                              key={piece.id}
                              className="absolute left-1/2 top-1/2 rounded-full"
                              style={{
                                width: piece.size,
                                height: piece.size,
                                backgroundColor: piece.color,
                              }}
                              initial={{ opacity: 0, x: 0, y: -40, rotate: 0 }}
                              animate={{
                                opacity: [0, 1, 0],
                                x: piece.x,
                                y: piece.y,
                                rotate: piece.rotation ?? 0,
                              }}
                              exit={{ opacity: 0, y: piece.y + 20, rotate: (piece.rotation ?? 0) + 24 }}
                              transition={{ duration: 1.1, delay: piece.delay, ease: 'easeOut' }}
                            />
                          ))}
                        </div>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ duration: 0.28, ease: 'easeOut' }}
                          className="relative z-10 mx-4 flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-6 py-5 text-center text-sm font-semibold text-white shadow-[0_24px_80px_rgba(56,189,248,0.35)]"
                        >
                          <span className="text-base md:text-lg">{successCelebration.message}</span>
                          <span className="rounded-full bg-emerald-500/25 px-3 py-1 text-[11px] font-semibold text-emerald-100 ring-1 ring-emerald-400/40">
                            +{successCelebration.xpDelta} XP
                          </span>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          portalTarget,
        )}

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            variants={{
              initial: { opacity: 0, y: 16, scale: 0.94 },
              enter: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { duration: 0.26, ease: 'easeOut' },
              },
              exit: {
                opacity: 0,
                y: 16,
                scale: 0.94,
                transition: { duration: 0.22, ease: 'easeInOut' },
              },
              pop: {
                scale: [1, 1.1, 0.92, 1.32],
                opacity: [1, 1, 1, 0],
                transition: {
                  duration: 0.36,
                  ease: 'easeIn',
                  times: [0, 0.42, 0.72, 1],
                },
              },
            }}
            initial="initial"
            animate={toastAnimationState === 'pop' ? 'pop' : 'enter'}
            exit={toastAnimationState === 'pop' ? { opacity: 0, scale: 0.8, transition: { duration: 0.18 } } : 'exit'}
            className={classNames(
              'fixed inset-x-0 z-50 mx-auto w-fit max-w-[92vw] rounded-2xl border px-5 py-4 text-sm shadow-2xl backdrop-blur',
              'top-[calc(env(safe-area-inset-top,0)+1rem)] md:top-6',
              toast.tone === 'success'
                ? 'border-emerald-400/30 bg-emerald-500/20 text-emerald-50'
                : 'border-rose-400/30 bg-rose-500/20 text-rose-50',
            )}
            role="status"
            aria-live="polite"
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-base font-semibold leading-snug md:text-lg">{toast.message}</p>
              {toast.detail && (
                <p className="text-sm text-white/85 md:text-base">{toast.detail}</p>
              )}
              {toast.action && (
                <a
                  href={toast.action.href}
                  className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.26em] text-white shadow-sm transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  {toast.action.label}
                </a>
              )}
              {toast.requiresHoldToClose && (
                <div className="flex w-full flex-col items-center gap-2 text-[12px] text-white/80" id="daily-quest-toast-hold-instructions">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/70">
                    Mantené presionado 3 segundos para cerrar
                  </span>
                  <motion.button
                    type="button"
                    className="relative flex w-full max-w-xs items-center justify-center overflow-hidden rounded-full border border-white/25 bg-white/10 px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.3em] text-white shadow-[0_18px_38px_rgba(16,185,129,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      startToastHold();
                    }}
                    onPointerUp={cancelToastHold}
                    onPointerCancel={cancelToastHold}
                    onPointerLeave={cancelToastHold}
                    onKeyDown={(event) => {
                      if (event.key === ' ' || event.key === 'Enter') {
                        event.preventDefault();
                        startToastHold();
                      }
                    }}
                    onKeyUp={(event) => {
                      if (event.key === ' ' || event.key === 'Enter') {
                        event.preventDefault();
                        cancelToastHold();
                      }
                    }}
                    aria-describedby="daily-quest-toast-hold-instructions"
                    animate={{ scale: isToastHolding ? 1.05 : 1 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
                    <motion.span
                      className="absolute inset-0 rounded-full bg-white/20"
                      initial={false}
                      animate={{ opacity: toastHoldProgress > 0 ? 0.65 : 0, scale: toastHoldProgress > 0 ? 1.08 : 1 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    />
                    <span className="relative z-10">Mantené presionado</span>
                  </motion.button>
                  <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/15">
                    <motion.div
                      className="h-full rounded-full bg-white/90"
                      initial={{ width: '0%' }}
                      animate={{ width: `${Math.min(Math.max(toastHoldProgress, 0), 1) * 100}%` }}
                      transition={{ duration: 0.1, ease: 'linear' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

export default DailyQuestModal;
