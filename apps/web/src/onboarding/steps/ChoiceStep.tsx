import { motion } from 'framer-motion';
import { NavButtons } from '../ui/NavButtons';

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
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  active
                    ? 'border-violet-400/70 bg-violet-500/10 text-white shadow-inner shadow-violet-500/20'
                    : 'border-white/10 bg-white/5 text-white/80 hover:border-white/25 hover:bg-white/10'
                }`}
              >
                <span>{choice}</span>
                <span
                  aria-hidden
                  className={`ml-4 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    active ? 'bg-violet-400 text-slate-900' : 'bg-white/10 text-white/60'
                  }`}
                >
                  {active ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>
        <NavButtons onBack={onBack} onConfirm={onConfirm} disabled={!value} />
      </div>
    </motion.div>
  );
}
