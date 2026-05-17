import { AnimatePresence, motion } from "framer-motion";
import {
  forwardRef,
  type MouseEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { RefObject } from "react";
import { DailyReminderSettings } from "../settings/DailyReminderSettings";
import { usePostLoginLanguage } from "../../i18n/postLoginLanguage";

export type ReminderSchedulerDialogHandle = {
  open: () => void;
  close: () => void;
};

interface ReminderSchedulerDialogProps {
  enabled?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
  onScheduled?: (metadata: { wasFirstScheduleCompletion: boolean }) => void | Promise<void>;
}

export const ReminderSchedulerDialog = forwardRef<
  ReminderSchedulerDialogHandle,
  ReminderSchedulerDialogProps
>(function ReminderSchedulerDialog({ enabled = true, returnFocusRef, onScheduled }, ref) {
  const { t } = usePostLoginLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [portalNode, setPortalNode] = useState<Element | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useMemo(
    () => `reminder-dialog-${Math.random().toString(36).slice(2, 8)}`,
    [],
  );

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
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
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
          className="reminder-scheduler-dialog__overlay fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 backdrop-blur-md md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleOverlayClick}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-light-scope="reminder-scheduler"
            className="reminder-scheduler-dialog__panel flex max-h-[80vh] w-full flex-col rounded-3xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface-elevated)] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.58)] backdrop-blur-2xl md:max-h-[85vh] md:max-w-[560px]"
            initial={{ opacity: 0, y: 64 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 64 }}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h2
                  id={titleId}
                  className="reminder-scheduler-dialog__eyebrow font-display text-[1.05rem] font-semibold uppercase tracking-[0.22em] text-text"
                >
                  {t("dashboard.reminderScheduler.eyebrow")}
                </h2>
                <p className="reminder-scheduler-dialog__description mt-2 text-sm text-text-muted">
                  {t("dashboard.reminderScheduler.description")}
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                className="reminder-scheduler-dialog__close-button rounded-full border border-white/20 bg-white/10 p-2 text-white/80 transition hover:border-white/40 hover:bg-white/20"
                aria-label={t("dashboard.reminderScheduler.closeAria")}
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
              <DailyReminderSettings onSaveSuccess={(response) => {
                close();
                const wasFirstScheduleCompletion =
                  response.was_first_schedule_completion === true ||
                  response.wasFirstScheduleCompletion === true;
                void onScheduled?.({ wasFirstScheduleCompletion });
              }} />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    portalNode,
  );
});
