import { AnimatePresence, motion } from 'framer-motion';

interface SnackProps {
  message: string | null;
}

export function Snack({ message }: SnackProps) {
  return (
    <div aria-live="assertive" className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center">
      <AnimatePresence presenceAffectsLayout={false}>
        {message ? (
          <motion.div
            key={message}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="glow-chip rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-900 shadow-xl backdrop-blur"
          >
            <span>{message}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
