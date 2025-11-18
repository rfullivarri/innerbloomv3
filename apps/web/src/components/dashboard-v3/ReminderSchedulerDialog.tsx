import { AnimatePresence, motion } from 'framer-motion';
import {
  forwardRef,
  type MouseEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import type { RefObject } from 'react';
import { DailyReminderSettings } from '../settings/DailyReminderSettings';

export type ReminderSchedulerDialogHandle = {
  open: () => void;
  close: () => void;
};

interface ReminderSchedulerDialogProps {
  enabled?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

export const ReminderSchedulerDialog = forwardRef<
  ReminderSchedulerDialogHandle,
  ReminderSchedulerDialogProps
>(function ReminderSchedulerDialog({ enabled = true, returnFocusRef }, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [portalNode, setPortalNode] = useState<Element | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useMemo(() => `reminder-dialog-${Math.random().toString(36).slice(2, 8)}`, []);

  const open = useCallback(() => {
    if (!enabled) {
      return;
    }
    setIsOpen(true);
  }, [enabled]);

  const close = useCallback(() => {
    setIsOpen(false);
    if (returnFocusRef?.current) {
      requestAnimationFrame(() => {
        returnFocusRef.current?.focus({ preventScroll: true });
      });
    }
  }, [returnFocusRef]);

  useImperativeHandle(ref, () => ({ open, close }), [open, close]);

  useEffect(() => {
    setPortalNode(document.body);
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close]);

  const handleOverlayClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        close();
      }
    },
    [close],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const timer = requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(timer);
  }, [isOpen]);

  if (!isMounted || !portalNode) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleOverlayClick}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-x-4 bottom-6 flex max-h-[80vh] flex-col rounded-3xl border border-white/10 bg-surface/95 p-5 shadow-2xl md:inset-auto md:left-1/2 md:top-1/2 md:w-[92vw] md:max-h-[85vh] md:max-w-[560px] md:-translate-x-1/2 md:-translate-y-1/2"
            initial={{ opacity: 0, y: 64 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 64 }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.32em] text-text-muted">Scheduler diario</p>
                <h2 id={titleId} className="font-display text-2xl font-semibold text-white">
                  Recordatorios inteligentes
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  Configurá tu recordatorio por correo o pausa cuando lo necesites.
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                className="rounded-full border border-white/20 bg-white/10 p-2 text-white/80 transition hover:border-white/40 hover:bg-white/20"
                aria-label="Cerrar recordatorio diario"
              >
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6l-12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              <DailyReminderSettings />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    portalNode,
  );
});
