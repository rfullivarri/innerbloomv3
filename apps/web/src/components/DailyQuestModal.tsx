import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { RefObject } from 'react';
import {
  getDailyQuestDefinition,
  getDailyQuestStatus,
  getModerationState,
  submitDailyQuest,
  updateModerationStatus,
  type ModerationStateResponse,
  type ModerationStatus,
  type ModerationTrackerType,
  type SubmitDailyQuestResponse,
} from '../lib/api';
import { HABIT_ACHIEVEMENT_UPDATED_EVENT } from '../lib/habitAchievementEvents';
import { useRequest } from '../hooks/useRequest';
import { ModerationWidget } from './moderation/ModerationWidget';
import { usePostLoginLanguage } from '../i18n/postLoginLanguage';

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
};

type DailyQuestModalProps = {
  enabled?: boolean;
  canAutoOpen?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onComplete?: (response: SubmitDailyQuestResponse) => void;
};

export type DailyQuestModalHandle = {
  open: () => void;
  close: () => void;
};

type PendingSubmission = {
  emotion: number;
  tasks: string[];
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

const CELEBRATION_MESSAGE_KEYS = [
  'dailyQuest.celebration.message.1',
  'dailyQuest.celebration.message.2',
  'dailyQuest.celebration.message.3',
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
  detail?: string;
  action?: ToastAction;
};

type TimeoutHandle = ReturnType<typeof setTimeout> | number;

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
      'ib-daily-quest-emotion-chip ib-daily-quest-emotion-chip--inactive text-[color:var(--color-text-dim)]',
    chipActive: 'ib-daily-quest-emotion-chip ib-daily-quest-innerbloom-gradient text-white ring-1 ring-white/35',
    chipShadow: 'shadow-[0_12px_32px_rgba(56,189,248,0.45)]',
    checkBackground: 'bg-sky-500/20',
    checkBorder: 'border-sky-300/60',
    checkText: 'text-sky-100',
    taskGlow: 'ring-2 ring-sky-400/55 shadow-[0_0_28px_rgba(56,189,248,0.32)]',
  },
  happy: {
    chipInactive:
      'ib-daily-quest-emotion-chip ib-daily-quest-emotion-chip--inactive text-[color:var(--color-text-dim)]',
    chipActive: 'ib-daily-quest-emotion-chip ib-daily-quest-innerbloom-gradient text-white ring-1 ring-white/35',
    chipShadow: 'shadow-[0_12px_32px_rgba(251,191,36,0.45)]',
    checkBackground: 'bg-amber-500/20',
    checkBorder: 'border-amber-300/60',
    checkText: 'text-amber-100',
    taskGlow: 'ring-2 ring-amber-400/55 shadow-[0_0_28px_rgba(251,191,36,0.36)]',
  },
  motivation: {
    chipInactive:
      'ib-daily-quest-emotion-chip ib-daily-quest-emotion-chip--inactive text-[color:var(--color-text-dim)]',
    chipActive: 'ib-daily-quest-emotion-chip ib-daily-quest-innerbloom-gradient text-white ring-1 ring-white/35',
    chipShadow: 'shadow-[0_12px_32px_rgba(139,92,246,0.45)]',
    checkBackground: 'bg-violet-500/20',
    checkBorder: 'border-violet-300/60',
    checkText: 'text-violet-100',
    taskGlow: 'ring-2 ring-violet-400/55 shadow-[0_0_28px_rgba(139,92,246,0.34)]',
  },
  sad: {
    chipInactive:
      'ib-daily-quest-emotion-chip ib-daily-quest-emotion-chip--inactive text-[color:var(--color-text-dim)]',
    chipActive: 'ib-daily-quest-emotion-chip ib-daily-quest-innerbloom-gradient text-white ring-1 ring-white/35',
    chipShadow: 'shadow-[0_12px_32px_rgba(99,102,241,0.45)]',
    checkBackground: 'bg-indigo-500/20',
    checkBorder: 'border-indigo-300/60',
    checkText: 'text-indigo-100',
    taskGlow: 'ring-2 ring-indigo-400/55 shadow-[0_0_28px_rgba(99,102,241,0.34)]',
  },
  anxiety: {
    chipInactive:
      'ib-daily-quest-emotion-chip ib-daily-quest-emotion-chip--inactive text-[color:var(--color-text-dim)]',
    chipActive: 'ib-daily-quest-emotion-chip ib-daily-quest-innerbloom-gradient text-white ring-1 ring-white/35',
    chipShadow: 'shadow-[0_12px_32px_rgba(244,63,94,0.45)]',
    checkBackground: 'bg-rose-500/20',
    checkBorder: 'border-rose-300/60',
    checkText: 'text-rose-100',
    taskGlow: 'ring-2 ring-rose-400/55 shadow-[0_0_28px_rgba(244,63,94,0.36)]',
  },
  frustration: {
    chipInactive:
      'ib-daily-quest-emotion-chip ib-daily-quest-emotion-chip--inactive text-[color:var(--color-text-dim)]',
    chipActive: 'ib-daily-quest-emotion-chip ib-daily-quest-innerbloom-gradient text-white ring-1 ring-white/35',
    chipShadow: 'shadow-[0_12px_32px_rgba(249,115,22,0.45)]',
    checkBackground: 'bg-orange-500/20',
    checkBorder: 'border-orange-300/60',
    checkText: 'text-orange-100',
    taskGlow: 'ring-2 ring-orange-400/55 shadow-[0_0_28px_rgba(249,115,22,0.36)]',
  },
  tired: {
    chipInactive:
      'ib-daily-quest-emotion-chip ib-daily-quest-emotion-chip--inactive text-[color:var(--color-text-dim)]',
    chipActive: 'ib-daily-quest-emotion-chip ib-daily-quest-innerbloom-gradient text-white ring-1 ring-white/35',
    chipShadow: 'shadow-[0_12px_32px_rgba(139,92,246,0.45)]',
    checkBackground: 'bg-violet-500/20',
    checkBorder: 'border-violet-300/60',
    checkText: 'text-violet-100',
    taskGlow: 'ring-2 ring-violet-400/55 shadow-[0_0_28px_rgba(139,92,246,0.34)]',
  },
};

const DEFAULT_EMOTION_THEME: EmotionTheme = {
  chipInactive:
    'ib-daily-quest-emotion-chip ib-daily-quest-emotion-chip--inactive text-[color:var(--color-text-dim)]',
  chipActive: 'ib-daily-quest-emotion-chip ib-daily-quest-innerbloom-gradient text-white ring-1 ring-white/35',
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

function getLocalizedPillarLabel(t: (key: string) => string, pillarCode: string): string {
  if (pillarCode === 'BODY') {
    return `🫀 ${t('dailyQuest.pillars.body')}`;
  }
  if (pillarCode === 'MIND') {
    return `🧠 ${t('dailyQuest.pillars.mind')}`;
  }
  if (pillarCode === 'SOUL') {
    return `🏵️ ${t('dailyQuest.pillars.soul')}`;
  }
  return pillarCode;
}

function getLocalizedDifficultyLabel(
  t: (key: string) => string,
  difficulty: string | null | undefined,
): string | null {
  const normalized = (difficulty ?? '').trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  if (normalized === 'EASY') {
    return t('dailyQuest.difficulty.easy');
  }
  if (normalized === 'MEDIUM' || normalized === 'MED') {
    return t('dailyQuest.difficulty.medium');
  }
  if (normalized === 'HARD') {
    return t('dailyQuest.difficulty.hard');
  }
  return null;
}

function formatTaskMeta(
  t: (key: string) => string,
  difficulty: string | null | undefined,
  xp: number,
): string {
  const difficultyLabel = getLocalizedDifficultyLabel(t, difficulty);
  return difficultyLabel ? `${difficultyLabel} · ${xp} GP` : `${xp} GP`;
}

export const DailyQuestModal = forwardRef<DailyQuestModalHandle, DailyQuestModalProps>(
  function DailyQuestModal(
    { enabled = false, canAutoOpen = true, returnFocusRef, onComplete }: DailyQuestModalProps,
    ref,
  ) {
  const { t } = usePostLoginLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [snoozed, setSnoozed] = useState(false);
  const [hasCompletedToday, setHasCompletedToday] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState<number | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pendingSubmission, setPendingSubmission] = useState<PendingSubmission | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moderationState, setModerationState] = useState<ModerationStateResponse | null>(null);
  const [hardCelebrations, setHardCelebrations] = useState<HardCelebration[]>([]);
  const [successCelebration, setSuccessCelebration] = useState<CelebrationOverlayState | null>(null);
  const [srAnnouncement, setSrAnnouncement] = useState('');
  const [xpBubble, setXpBubble] = useState<{ id: number; delta: number } | null>(null);

  const toastTimer = useRef<TimeoutHandle | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const shouldRestoreFocusRef = useRef(false);
  const celebrationTimeoutsRef = useRef<TimeoutHandle[]>([]);
  const successCelebrationTimeoutRef = useRef<TimeoutHandle | null>(null);
  const xpBubbleTimeoutRef = useRef<TimeoutHandle | null>(null);
  const xpPreviousRef = useRef(0);

  const {
    data: status,
    status: statusRequestState,
    reload: reloadStatus,
  } = useRequest(() => getDailyQuestStatus(), [enabled], { enabled });

  const currentDate = status?.date;

  const { data: definition, status: definitionState, reload: reloadDefinition } = useRequest(
    () => getDailyQuestDefinition({ date: currentDate }),
    [currentDate, enabled],
    { enabled: Boolean(enabled && currentDate) },
  );

  const moderationRequest = useRequest(() => getModerationState(), [isOpen], { enabled: isOpen });

  useEffect(() => {
    const handleAchievementUpdated = () => {
      reloadStatus();
      reloadDefinition();
    };
    window.addEventListener(HABIT_ACHIEVEMENT_UPDATED_EVENT, handleAchievementUpdated);
    return () => {
      window.removeEventListener(HABIT_ACHIEVEMENT_UPDATED_EVENT, handleAchievementUpdated);
    };
  }, [reloadDefinition, reloadStatus]);

  useEffect(() => {
    setModerationState(moderationRequest.data);
  }, [moderationRequest.data]);

  const handleCycleModeration = useCallback(
    async (type: ModerationTrackerType, status: ModerationStatus) => {
      const dayKey = definition?.date ?? moderationState?.dayKey;
      if (!dayKey) {
        return;
      }

      try {
        const updated = await updateModerationStatus(type, { dayKey, status });
        setModerationState(updated);
      } catch (error) {
        console.error('Failed to update moderation status', error);
      }
    },
    [definition?.date, moderationState?.dayKey],
  );

  useEffect(() => {
    if (status?.date) {
      setSnoozed(false);
      setHasCompletedToday(false);
    }
  }, [status?.date]);

  useEffect(() => {
    if (!enabled || !status) {
      setIsManualOpen(false);
      setIsOpen(false);
      return;
    }

    if (pendingSubmission) {
      setIsOpen(false);
      return;
    }

    if (!canAutoOpen && !isManualOpen) {
      setIsOpen(false);
      return;
    }

    if (successCelebration) {
      setIsOpen(true);
      return;
    }

    if (status.submitted || hasCompletedToday || snoozed) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
  }, [
    canAutoOpen,
    enabled,
    status,
    hasCompletedToday,
    isManualOpen,
    snoozed,
    pendingSubmission,
    successCelebration,
  ]);

  useEffect(() => {
    if (!definition) {
      return;
    }

    if (pendingSubmission) {
      return;
    }

    setSelectedEmotion(null);
    setSelectedTasks([]);
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
      setSuccessCelebration(null);
      setSrAnnouncement('');
      shouldRestoreFocusRef.current = options?.restoreFocus !== false;
      setIsManualOpen(false);
      setIsOpen(false);
    },
    [],
  );

  const completeSuccessCelebration = useCallback(() => {
    if (successCelebrationTimeoutRef.current) {
      clearTimeout(successCelebrationTimeoutRef.current);
      successCelebrationTimeoutRef.current = null;
    }
    setSuccessCelebration(null);
    setHasCompletedToday(true);
    closeModal({ restoreFocus: true });
  }, [closeModal]);

  const openDailyQuest = useCallback(() => {
    if (!enabled) {
      return;
    }
    setSnoozed(false);
    setIsManualOpen(true);
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
      detail?: string;
      action?: ToastAction;
    },
  ) => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    const next: ToastState = {
      id: Date.now(),
      message,
      tone,
      detail: options?.detail,
      action: options?.action,
    };
    setToast(next);

    toastTimer.current = setTimeout(() => {
      setToast((current) => (current && current.id === next.id ? null : current));
      toastTimer.current = null;
    }, 3600);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const handleSubmit = async () => {
    if (!currentDate || !definition) {
      return;
    }

    if (selectedEmotion == null) {
      pushToast(t('dailyQuest.toast.selectEmotionRequired'), 'error');
      return;
    }

    const snapshot: PendingSubmission = {
      emotion: selectedEmotion,
      tasks: [...selectedTasks],
    };

    setPendingSubmission(snapshot);
    setIsSubmitting(true);

    try {
      const response = await submitDailyQuest({
        date: currentDate,
        emotion_id: selectedEmotion,
        tasks_done: selectedTasks,
        notes: null,
      });

      setPendingSubmission(null);
      setIsSubmitting(false);
      setSelectedEmotion(null);
      setSelectedTasks([]);
      const celebrationExtras: {
        detail?: string;
        action?: ToastAction;
      } = {};
      const celebrationId = Date.now();
      const celebrationMessage = t(
        CELEBRATION_MESSAGE_KEYS[Math.floor(Math.random() * CELEBRATION_MESSAGE_KEYS.length)],
      );
      setSuccessCelebration({
        id: celebrationId,
        message: celebrationMessage,
        confetti: generateConfettiPieces(),
        xpDelta: response.xp_delta,
        detail: celebrationExtras.detail,
        action: celebrationExtras.action,
      });
      onComplete?.(response);
      setSrAnnouncement(t('dailyQuest.toast.savedSuccess'));
      void reloadStatus();
    } catch (error) {
      console.error('Failed to submit daily quest', error);
      setIsSubmitting(false);
      setPendingSubmission(null);
      shouldRestoreFocusRef.current = false;
      setIsOpen(true);
      pushToast(t('dailyQuest.toast.saveError'), 'error');
    }
  };

  const handleSnooze = () => {
    closeModal({ snooze: true });
    pushToast(t('dailyQuest.toast.snoozedReminder'), 'success');
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
          <AnimatePresence presenceAffectsLayout={false}>
            {isOpen && (
              <motion.div
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-[color:var(--color-slate-950-80)] p-2 md:p-4"
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
                  onClick={(event: MouseEvent<HTMLDivElement>) => {
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
                  className="ib-daily-quest-shell pointer-events-auto relative mx-auto flex h-[100dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl text-white shadow-2xl backdrop-blur md:max-w-2xl" data-light-scope="daily-quest"
                  layout={false}
                  onClick={(event: MouseEvent<HTMLDivElement>) => {
                    event.stopPropagation();
                  }}
                >
                  <motion.header
                    layout={false}
                    data-demo-anchor="daily-quest-intro"
                    data-daily-quest-sticky-header="true"
                    className="ib-daily-quest-header sticky top-0 z-10 flex flex-col justify-center border-b px-4 pb-2 pt-[calc(env(safe-area-inset-top,0px)+0.65rem)] backdrop-blur md:pb-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/70">{t('dailyQuest.header.kicker')}</p>
                        <h2 id="daily-quest-title" className="text-lg font-semibold text-[color:var(--color-text)] md:text-xl">
                          ☀️ {t('dailyQuest.header.title')}
                        </h2>
                        <p className="text-[11px] text-[color:var(--color-text-muted)] md:text-xs">
                          {t('dailyQuest.header.description')}
                        </p>
                      </div>
                      <button
                        ref={closeButtonRef}
                        type="button"
                        className="ib-daily-quest-close-btn inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm text-white/80 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        onClick={handleSnooze}
                        aria-label={t('dailyQuest.closeAria')}
                      >
                        ✕
                      </button>
                    </div>
                  </motion.header>

                  <div
                    className="flex-1 overflow-y-auto -webkit-overflow-scrolling-touch px-4 pb-20 pt-3"
                    data-daily-quest-scroll-container="true"
                    aria-live="polite"
                  >
                    <div className="flex flex-col gap-6 pb-6">
                      {showSkeleton && (
                        <div className="ib-daily-quest-surface flex flex-col gap-3 rounded-2xl border p-4 text-sm text-[color:var(--color-text-faint)]">
                          <div className="h-3 w-24 animate-pulse rounded-full bg-[color:var(--color-overlay-2)]" />
                          <div className="h-3 w-3/4 animate-pulse rounded-full bg-[color:var(--color-overlay-2)]" />
                          <div className="h-3 w-5/6 animate-pulse rounded-full bg-[color:var(--color-overlay-2)]" />
                        </div>
                      )}

                      {canShowContent && definition && (
                        <>
                          <section className="flex flex-col gap-2" data-demo-anchor="daily-quest-emotion-block">
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--color-text-dim)]">
                              {t('dailyQuest.emotion.question')}
                            </h3>
                            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('dailyQuest.emotion.availableAria')}>
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
                                      'relative overflow-visible rounded-full border px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
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

                          <ModerationWidget
                            data={moderationState}
                            loading={moderationRequest.status === 'loading'}
                            onCycle={handleCycleModeration}
                            demoAnchor="daily-quest-moderation"
                          />

                          <section className="flex flex-col gap-4" data-demo-anchor="daily-quest-tasks">
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">{t('dailyQuest.checklist.title')}</h3>
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
                                      {getLocalizedPillarLabel(t, pillar.pillar_code)}
                                    </h4>
                                    <span className="ib-daily-quest-innerbloom-gradient mt-2 h-1.5 w-16 rounded-full" />
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
                                              'ib-daily-quest-task-row group relative flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-4 text-left transition duration-200 focus-within:ring-2 focus-within:ring-white/60',
                                              isSelected && 'ib-daily-quest-task-row--selected backdrop-blur-sm',
                                            )}
                                          >
                                            <AnimatePresence presenceAffectsLayout={false}>
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
                                              <AnimatePresence presenceAffectsLayout={false}>
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
                                                    className="ib-chip-solid ib-chip-solid--warning pointer-events-none absolute right-3 top-3 rounded-lg px-2 py-1 text-[11px] font-semibold"
                                                  >
                                                    {getLocalizedDifficultyLabel(t, 'HARD') ?? 'Hard'} · +{task.xp} GP
                                                  </motion.div>
                                                ))}
                                              </AnimatePresence>
                                            )}
                                            {isHardTask && (
                                              <AnimatePresence presenceAffectsLayout={false}>
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
                                              {task.achievement_seal_visible ? (
                                                <span className="absolute -right-1 -top-2 rounded-full border border-amber-300/50 bg-amber-400/20 px-1.5 py-0.5 text-[10px]">
                                                  🏅
                                                </span>
                                              ) : null}
                                              <motion.span
                                                className={classNames(
                                                  'flex h-5 w-5 items-center justify-center rounded-full border text-[10px] transition-colors duration-200',
                                                  isSelected
                                                    ? classNames(theme.checkBackground, theme.checkBorder, theme.checkText)
                                                    : 'border-[color:var(--color-border-soft)] text-white/40',
                                                )}
                                                initial={false}
                                                animate={{ scale: isSelected ? 1 : 0.92 }}
                                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                              >
                                                <CheckIcon active={isSelected} />
                                              </motion.span>
                                              <div className="space-y-1">
                                                <p className="font-medium text-[color:var(--color-text)]">{task.name}</p>
                                                <p className="text-xs text-[color:var(--color-text-faint)]">
                                                  {formatTaskMeta(t, task.difficulty, task.xp)}
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

                        </>
                      )}
                    </div>
                  </div>

                  <motion.footer
                    layout={false}
                    data-demo-anchor="daily-quest-footer"
                    className="ib-daily-quest-footer sticky bottom-0 z-10 border-t px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.45rem)] pt-2 backdrop-blur md:pt-3"
                  >
                    <div className="grid grid-cols-[minmax(3.5rem,0.34fr)_1fr] items-end gap-3">
                      <div className="relative min-w-0 text-white">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-text-faint)]">{t('dailyQuest.footer.gpLabel')}</p>
                        <p className="mt-0.5 text-2xl font-bold md:text-3xl">
                          <span
                            data-testid="xp-counter"
                            className="ib-daily-quest-gp-value text-amber-200 drop-shadow-[0_0_12px_rgba(251,191,36,0.35)]"
                          >
                            {xpSelected}
                          </span>
                        </p>
                        <AnimatePresence presenceAffectsLayout={false}>
                          {xpBubble && (
                            <motion.span
                              key={xpBubble.id}
                              className="ib-daily-quest-gp-toast-chip pointer-events-none absolute -top-2 right-0 rounded-full bg-amber-500/30 px-2 py-1 text-[11px] font-semibold text-amber-100 shadow-[0_8px_22px_rgba(251,191,36,0.35)]"
                              initial={{ opacity: 0, y: 10, scale: 0.8 }}
                              animate={{ opacity: 1, y: -6, scale: 1 }}
                              exit={{ opacity: 0, y: -18, scale: 0.85 }}
                              transition={{ duration: 0.36, ease: 'easeOut' }}
                            >
                              +{xpBubble.delta} GP
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="grid w-full grid-cols-2 gap-2 md:w-auto md:grid-cols-[auto_auto]">
                        <button
                          type="button"
                          onClick={handleSnooze}
                          className="ib-daily-quest-secondary-btn h-10 rounded-xl border text-sm font-medium text-[color:var(--color-text-dim)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 md:h-11 md:px-6"
                        >
                          {t('dailyQuest.actions.later')}
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={isConfirmDisabled}
                          aria-describedby={showEmotionHelper ? helperTextId : undefined}
                          aria-label={t('dailyQuest.actions.confirmAria')}
                          className={classNames(
                            'ib-daily-quest-innerbloom-gradient inline-flex h-10 items-center justify-center rounded-xl text-sm font-semibold text-white shadow-[var(--shadow-innerbloom-cta)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-60 md:h-11 md:px-6',
                            !isConfirmDisabled && 'brightness-100 hover:brightness-110',
                            isSubmitting && 'cursor-wait',
                          )}
                        >
                          {isSubmitting ? t('dailyQuest.actions.saving') : t('dailyQuest.actions.confirm')}
                        </button>
                      </div>
                    </div>
                    {showEmotionHelper && (
                      <p id={helperTextId} className="mt-1 text-[11px] text-rose-200/80 md:text-right">
                        {t('dailyQuest.helper.selectEmotion')}
                      </p>
                    )}
                  </motion.footer>
                  <AnimatePresence presenceAffectsLayout={false}>
                    {successCelebration && (
                      <motion.div
                        key={successCelebration.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.24, ease: 'easeOut' }}
                        className="ib-daily-quest-success-backdrop absolute inset-0 z-40 flex items-center justify-center backdrop-blur-sm"
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
                          className="ib-daily-quest-success-card relative z-10 mx-4 flex max-w-sm flex-col items-center gap-4 rounded-3xl border px-6 py-6 text-center shadow-[0_24px_80px_rgba(56,189,248,0.24)]"
                        >
                          <motion.span
                            aria-hidden="true"
                            className="ib-daily-quest-success-orb"
                            initial={{ scale: 0.72, opacity: 0 }}
                            animate={{ scale: [0.72, 1.04, 1], opacity: 1 }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                          />
                          <span className="ib-daily-quest-success-message text-lg font-semibold leading-snug md:text-xl">
                            {successCelebration.message}
                          </span>
                          <span className="ib-daily-quest-success-points rounded-full px-3 py-1 text-xs font-semibold">
                            +{successCelebration.xpDelta} GP
                          </span>
                          {successCelebration.detail && (
                            <p className="text-sm font-normal text-[color:var(--color-text-muted)]">
                              {successCelebration.detail}
                            </p>
                          )}
                          {successCelebration.action && (
                            <a
                              href={successCelebration.action.href}
                              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border-strong)] bg-[color:var(--color-overlay-3)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.26em] text-white shadow-sm transition hover:bg-[color:var(--color-overlay-5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                            >
                              {successCelebration.action.label}
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={completeSuccessCelebration}
                            className="ib-daily-quest-success-cta mt-1 inline-flex h-11 w-full items-center justify-center rounded-full px-5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                          >
                            {t('dailyQuest.celebration.cta')}
                          </button>
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

      <AnimatePresence presenceAffectsLayout={false}>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.26, ease: 'easeOut' } }}
            exit={{ opacity: 0, y: 16, scale: 0.94, transition: { duration: 0.22, ease: 'easeInOut' } }}
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
                  className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border-strong)] bg-[color:var(--color-overlay-3)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.26em] text-white shadow-sm transition hover:bg-[color:var(--color-overlay-5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  {toast.action.label}
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

export default DailyQuestModal;
