import { motion } from 'framer-motion';

interface ChecklistProps {
  items: readonly string[];
  selected: readonly string[];
  onToggle: (value: string) => void;
  limit?: number;
}

export function Checklist({ items, selected, onToggle, limit }: ChecklistProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => {
        const active = selected.includes(item);
        const disabled = Boolean(limit && !active && selected.length >= limit);
        return (
          <motion.button
            key={item}
            type="button"
            whileTap={{ scale: disabled ? 1 : 0.97 }}
            onClick={() => (disabled ? null : onToggle(item))}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
              active
                ? 'border-sky-400/70 bg-sky-400/10 text-white shadow-inner shadow-sky-400/20'
                : 'border-white/10 bg-white/5 text-white/80 hover:border-white/25 hover:bg-white/10'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <span className="pr-2">{item}</span>
            <span
              aria-hidden
              className={`ml-3 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                active ? 'bg-sky-400 text-slate-900' : 'bg-white/10 text-white/60'
              }`}
            >
              {active ? '✓' : '+'}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
