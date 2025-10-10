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
import { AnimatePresence, motion, useSpring } from 'framer-motion';
import type { RefObject } from 'react';
import { getDailyQuestDefinition, getDailyQuestStatus, submitDailyQuest } from '../lib/api';
import { useRequest } from '../hooks/useRequest';
import './DailyQuestModal.css';

type ToastTone = 'success' | 'error';

type ToastState = {
  id: number;
  message: string;
  tone: ToastTone;
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

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
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

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const shouldRestoreFocusRef = useRef(false);

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
    };
  }, []);

  const xpByTask = useMemo(() => {
    const map = new Map<string, number>();
    if (!definition) {
      return map;
    }

    for (const pillar of definition.pillars) {
      for (const task of pillar.tasks) {
        map.set(task.task_id, Number(task.xp ?? 0));
      }
    }

    return map;
  }, [definition]);

  const selectedXp = useMemo(
    () => selectedTasks.reduce((total, taskId) => total + (xpByTask.get(taskId) ?? 0), 0),
    [selectedTasks, xpByTask],
  );

  const xpSpring = useSpring(0, { stiffness: 160, damping: 24 });
  const [displayXp, setDisplayXp] = useState(0);
  const [xpBurst, setXpBurst] = useState<number | null>(null);
  const previousXp = useRef(0);

  useEffect(() => {
    const unsubscribe = xpSpring.on('change', (value) => {
      setDisplayXp(Math.round(value));
    });
    return () => {
      unsubscribe();
    };
  }, [xpSpring]);

  useEffect(() => {
    xpSpring.set(selectedXp);
  }, [selectedXp, xpSpring]);

  useEffect(() => {
    const delta = selectedXp - previousXp.current;
    if (delta > 0) {
      setXpBurst(delta);
    }
    previousXp.current = selectedXp;
  }, [selectedXp]);

  useEffect(() => {
    if (xpBurst == null) {
      return;
    }

    const timeoutId = setTimeout(() => setXpBurst(null), 700);
    return () => clearTimeout(timeoutId);
  }, [xpBurst]);

  const toggleTask = (taskId: string) => {
    setSelectedTasks((current) => {
      if (current.includes(taskId)) {
        return current.filter((id) => id !== taskId);
      }
      return [...current, taskId];
    });
  };

  const closeModal = useCallback(
    (options?: { snooze?: boolean; restoreFocus?: boolean }) => {
      if (options?.snooze) {
        setSnoozed(true);
      }
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

  const pushToast = (message: string, tone: ToastTone) => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    const next: ToastState = { id: Date.now(), message, tone };
    setToast(next);

    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 3600);
  };

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
    closeModal({ restoreFocus: false });

    try {
      const response = await submitDailyQuest({
        date: currentDate,
        emotion_id: selectedEmotion,
        tasks_done: selectedTasks,
        notes: trimmedNotes.length > 0 ? trimmedNotes : null,
      });

      setPendingSubmission(null);
      setIsSubmitting(false);
      setHasCompletedToday(true);
      setSelectedEmotion(null);
      setSelectedTasks([]);
      setNotes('');
      pushToast(`+${response.xp_delta} XP añadidos hoy`, 'success');
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

  return (
    <>
      {portalTarget &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                className="dailyQuestModalOverlay bg-black/70"
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
                  className="dailyQuestModalBackdrop"
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
                  className="dailyQuestModalShell glass-card pointer-events-auto relative w-full max-w-lg flex-col bg-slate-900/90 text-white shadow-2xl"
                  layout={false}
                >
                  <header className="dailyQuestModalHeader border-b border-white/10 bg-slate-900/95 px-5 pb-4 md:px-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">Daily Quest</p>
                        <h2 id="daily-quest-title" className="mt-1 text-2xl font-semibold text-white">
                          Ritual diario
                        </h2>
                        <p className="mt-2 text-sm text-white/70">
                          Registrá cómo te sentís y marcá los hábitos completados para sumar XP y mantener tu racha.
                        </p>
                      </div>
                      <button
                        ref={closeButtonRef}
                        type="button"
                        className="rounded-full border border-white/10 bg-white/5 p-2 text-white/80 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        onClick={handleSnooze}
                        aria-label="Cerrar Daily Quest"
                      >
                        ✕
                      </button>
                    </div>
                  </header>

                  <div className="dailyQuestModalBody px-5 pt-4 md:px-6" aria-live="polite">
                    <div className="flex flex-col gap-5 pb-6">
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
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">¿Cómo te sentís hoy?</h3>
                            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Emociones disponibles">
                              {definition.emotionOptions.map((option) => {
                                const isActive = selectedEmotion === option.emotion_id;
                                return (
                                  <motion.button
                                    key={option.emotion_id}
                                    type="button"
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setSelectedEmotion(option.emotion_id)}
                                    className={classNames(
                                      'rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
                                      isActive
                                        ? 'bg-primary/90 text-white shadow-glow'
                                        : 'bg-white/5 text-white/70 hover:bg-white/10',
                                    )}
                                    aria-pressed={isActive}
                                  >
                                    {option.name}
                                  </motion.button>
                                );
                              })}
                            </div>
                          </section>

                          <section className="flex flex-col gap-3">
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">Checklist del día</h3>
                            <div className="flex flex-col gap-4">
                              {definition.pillars.map((pillar) => (
                                <div key={pillar.pillar_code} className="flex flex-col gap-3">
                                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                                    {pillar.pillar_code === 'BODY'
                                      ? 'Cuerpo'
                                      : pillar.pillar_code === 'MIND'
                                      ? 'Mente'
                                      : pillar.pillar_code === 'SOUL'
                                      ? 'Alma'
                                      : pillar.pillar_code}
                                  </p>
                                  <div className="flex flex-col gap-2">
                                    {pillar.tasks.map((task) => {
                                      const isSelected = selectedTasks.includes(task.task_id);
                                      return (
                                        <label
                                          key={task.task_id}
                                          className={classNames(
                                            'flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.08]',
                                            isSelected && 'border-primary/50 bg-primary/10 shadow-glow',
                                          )}
                                        >
                                          <div className="flex items-start gap-3">
                                            <motion.span
                                              className="flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-primary"
                                              initial={false}
                                              animate={{
                                                backgroundColor: isSelected
                                                  ? 'rgba(94, 234, 212, 0.12)'
                                                  : 'rgba(0, 0, 0, 0)',
                                              }}
                                            >
                                              <CheckIcon active={isSelected} />
                                            </motion.span>
                                            <div>
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
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
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

                  <footer className="dailyQuestModalFooter border-t border-white/10 bg-slate-900/95 px-5 pb-4 pt-3 backdrop-blur md:px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="relative">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">XP seleccionado</p>
                        <div className="flex items-baseline gap-2">
                          <motion.span data-testid="xp-counter" className="text-3xl font-semibold text-white" animate={{ opacity: 1 }}>
                            {displayXp}
                          </motion.span>
                          <span className="text-sm font-semibold uppercase tracking-wide text-white/60">XP</span>
                        </div>
                        <AnimatePresence>
                          {xpBurst != null && xpBurst > 0 && (
                            <motion.span
                              key={xpBurst}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: -8 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="absolute -right-2 top-0 text-xs font-semibold text-emerald-300"
                            >
                              +{xpBurst} XP
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <button
                          type="button"
                          onClick={handleSnooze}
                          className="rounded-full border border-white/10 px-5 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        >
                          Más tarde
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={isSubmitting || selectedEmotion == null}
                          className={classNames(
                            'inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-slate-900 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
                            isSubmitting || selectedEmotion == null ? 'opacity-50' : 'hover:bg-primary/90',
                          )}
                        >
                          {isSubmitting ? 'Guardando…' : 'Registrar Daily Quest'}
                        </button>
                      </div>
                    </div>
                  </footer>
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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={classNames(
              'fixed bottom-6 left-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 rounded-2xl border px-4 py-3 text-sm shadow-xl backdrop-blur',
              toast.tone === 'success'
                ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100'
                : 'border-rose-400/30 bg-rose-500/15 text-rose-100',
            )}
            role="status"
            aria-live="polite"
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

export default DailyQuestModal;
