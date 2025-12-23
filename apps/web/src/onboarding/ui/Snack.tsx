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
            className="glow-chip rounded-full bg-slate-900/90 px-4 py-2 text-sm font-semibold text-white shadow-[0_20px_40px_rgba(255,255,255,0.16)]"
          >
            {message}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
