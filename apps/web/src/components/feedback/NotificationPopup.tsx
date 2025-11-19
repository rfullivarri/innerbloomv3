import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type NotificationPopupTask = {
  id: string;
  name: string;
  streakDays?: number;
};

export type NotificationPopupProps = {
  open: boolean;
  title: string;
  message: string;
  emoji: string;
  onClose: () => void;
  cta?: { label: string; href: string | null } | null;
  tasks?: NotificationPopupTask[];
  emojiAnimation?: 'bounce' | 'pulse';
  autoDismissMs?: number;
  dataTestId?: string;
  inline?: boolean;
};

const containerVariants = {
  hidden: { opacity: 0, y: -20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -16, scale: 0.9 },
};

export function NotificationPopup({
  open,
  title,
  message,
  emoji,
  onClose,
  cta,
  tasks,
  emojiAnimation = 'bounce',
  autoDismissMs = 9000,
  dataTestId,
  inline = false,
}: NotificationPopupProps) {
  useEffect(() => {
    if (!open || autoDismissMs <= 0 || inline) {
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      onClose();
    }, autoDismissMs);
    return () => window.clearTimeout(timeout);
  }, [autoDismissMs, onClose, open, inline]);

  const emojiVariants =
    emojiAnimation === 'pulse'
      ? { scale: [1, 1.15, 1] }
      : { scale: [0.9, 1.1, 1], rotate: [0, -6, 4, 0] };

  const card = (
    <div className="overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-900/80 p-4 shadow-[0_30px_120px_rgba(15,23,42,0.55)] backdrop-blur-lg">
      <div className="flex items-start gap-4">
        <motion.span
          aria-hidden
          className="text-4xl"
          animate={emojiVariants}
          transition={{ repeat: inline ? 0 : Infinity, repeatDelay: 2.4, duration: 1.8, ease: 'easeInOut' }}
        >
          {emoji}
        </motion.span>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300/70">Feedback</p>
              <p className="text-lg font-semibold text-white">{title}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/20 p-1 text-xs text-white/70 transition hover:border-sky-300/50 hover:text-white"
              aria-label="Cerrar notificación"
            >
              ✕
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-200">{message}</p>
          {tasks && tasks.length > 0 ? (
            <ul className="mt-3 space-y-1 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-100">
              {tasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3">
                  <span className="font-medium">{task.name}</span>
                  {typeof task.streakDays === 'number' ? (
                    <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-xs text-amber-200">
                      🔥 {task.streakDays}d
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {cta?.label ? (
            <a
              href={cta.href ?? '#'}
              className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-sky-400 via-indigo-400 to-fuchsia-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-95"
            >
              {cta.label}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="relative w-full" data-testid={dataTestId}>
        {card}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="notification-popup"
          className="fixed left-1/2 top-6 z-50 w-full max-w-sm -translate-x-1/2 px-3 sm:right-6 sm:left-auto sm:translate-x-0"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          data-testid={dataTestId}
        >
          {card}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
