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
  onCtaClick?: () => void;
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
  onCtaClick,
  cta,
  tasks,
  emojiAnimation = 'bounce',
  autoDismissMs = 9000,
  dataTestId,
  inline = false,
}: NotificationPopupProps) {
  useEffect(() => {
    const hasTasks = Boolean(tasks && tasks.length > 0);
    if (!open || autoDismissMs <= 0 || inline || hasTasks) {
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      onClose();
    }, autoDismissMs);
    return () => window.clearTimeout(timeout);
  }, [autoDismissMs, onClose, open, inline, tasks]);

  const emojiVariants =
    emojiAnimation === 'pulse'
      ? { scale: [1, 1.15, 1] }
      : { scale: [0.9, 1.1, 1], rotate: [0, -6, 4, 0] };

  const card = (
    <div className="overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-900/80 p-4 shadow-[0_30px_120px_rgba(15,23,42,0.55)] backdrop-blur-lg">
      <div className="grid grid-cols-[auto,1fr] items-start gap-x-4 gap-y-3">
        <motion.span
          aria-hidden
          className="text-4xl"
          animate={emojiVariants}
          transition={{ repeat: inline ? 0 : Infinity, repeatDelay: 2.4, duration: 1.8, ease: 'easeInOut' }}
        >
          {emoji}
        </motion.span>
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
        <p className="col-span-2 text-sm text-slate-200">{message}</p>
        {tasks && tasks.length > 0 ? (
          <ul className="col-span-2 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-100">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-3">
                <span aria-hidden className="text-lg leading-none">
                  🔥
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{task.name}</span>
                {typeof task.streakDays === 'number' ? (
                  <span className="whitespace-nowrap text-xs font-semibold text-amber-200">{task.streakDays}d</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="col-span-2 flex flex-col gap-2 sm:flex-row">
          {cta?.label ? (
            <a
              href={cta.href ?? '#'}
              onClick={onCtaClick}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-sky-400 via-indigo-400 to-fuchsia-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-95"
            >
              {cta.label}
            </a>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex w-full items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-sky-300/60 hover:bg-white/10"
          >
            Cerrar
          </button>
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
        <div
          className="pointer-events-none fixed inset-x-3 top-0 z-50 flex justify-center sm:left-auto sm:right-6 sm:inset-x-auto sm:justify-end"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 14px)' }}
        >
          <motion.div
            key="notification-popup"
            className="w-full max-w-md pointer-events-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            data-testid={dataTestId}
          >
            {card}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
