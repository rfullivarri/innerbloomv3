import { motion } from 'framer-motion';
import { SelectableCheck } from './SelectableCheck';

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
            whileTap={disabled ? undefined : { scale: 0.97 }}
            data-selected={active ? 'true' : undefined}
            data-disabled={disabled ? 'true' : undefined}
            onClick={() => (disabled ? null : onToggle(item))}
            className={`inline-flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/80 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 hover:border-white/25 hover:bg-white/10 data-[selected=true]:border-sky-400/70 data-[selected=true]:bg-sky-400/10 data-[selected=true]:text-white data-[selected=true]:shadow-inner data-[selected=true]:shadow-sky-400/20 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-60 data-[disabled=true]:hover:border-white/10 data-[disabled=true]:hover:bg-white/5`}
          >
            <SelectableCheck
              selected={active}
              toneClassName="data-[selected=true]:border-transparent data-[selected=true]:bg-sky-400 data-[selected=true]:text-slate-900"
            />
            <span className="flex-1 truncate pr-1">{item}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
