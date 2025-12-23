import { motion } from 'framer-motion';
import { NavButtons } from '../ui/NavButtons';
import { SelectableCheck } from '../ui/SelectableCheck';

interface ChoiceStepProps {
  title: string;
  subtitle: string;
  choices: readonly string[];
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onBack?: () => void;
  xpAmount: number;
}

export function ChoiceStep({
  title,
  subtitle,
  choices,
  value,
  onChange,
  onConfirm,
  onBack,
  xpAmount,
}: ChoiceStepProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="glass-card mx-auto max-w-3xl rounded-3xl border border-white/5 bg-slate-900/70 p-6">
        <header className="flex flex-col gap-2 border-b border-white/5 pb-4">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Actitud · +{xpAmount} XP</p>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          <p className="text-sm text-white/70">{subtitle}</p>
        </header>
        <div className="mt-6 space-y-3">
          {choices.map((choice) => {
            const active = value === choice;
            return (
              <button
                key={choice}
                type="button"
                onClick={() => onChange(choice)}
                data-selected={active ? 'true' : undefined}
                className={`inline-flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white/80 transition hover:border-white/25 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60 data-[selected=true]:border-violet-400/70 data-[selected=true]:bg-violet-500/10 data-[selected=true]:text-white data-[selected=true]:shadow-inner data-[selected=true]:shadow-white/25`}
              >
                <SelectableCheck
                  selected={active}
                  toneClassName="data-[selected=true]:border-transparent data-[selected=true]:bg-violet-400 data-[selected=true]:text-slate-900"
                />
                <span className="flex-1 truncate">{choice}</span>
              </button>
            );
          })}
        </div>
        <NavButtons onBack={onBack} onConfirm={onConfirm} disabled={!value} />
      </div>
    </motion.div>
  );
}
