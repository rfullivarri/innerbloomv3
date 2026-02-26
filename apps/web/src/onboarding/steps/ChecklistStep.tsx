import { motion } from 'framer-motion';
import { Checklist } from '../ui/Checklist';
import { NavButtons } from '../ui/NavButtons';
import { ModeQuestionTitle } from '../ui/ModeQuestionTitle';

interface ChecklistStepProps {
  title: string;
  subtitle: string;
  xpAmount: number;
  badgeLabel?: string;
  items: readonly string[];
  selected: readonly string[];
  onToggle: (value: string) => void;
  onConfirm: () => void;
  onBack?: () => void;
  limit?: number;
  openValue?: string;
  onOpenChange?: (value: string) => void;
  openLabel?: string;
}

export function ChecklistStep({
  title,
  subtitle,
  xpAmount,
  badgeLabel = 'Checklist',
  items,
  selected,
  onToggle,
  onConfirm,
  onBack,
  limit,
  openValue,
  onOpenChange,
  openLabel,
}: ChecklistStepProps) {
  const ready = selected.length >= 1;
  const showOpen = typeof onOpenChange === 'function';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="glass-card onboarding-surface-base mx-auto max-w-3xl rounded-3xl p-6">
        <header className="flex flex-col gap-2 border-b border-white/5 pb-4">
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">{badgeLabel} · +{xpAmount} XP</p>
          <ModeQuestionTitle title={title} />
          <p className="text-sm text-white/70">{subtitle}</p>
          {typeof limit === 'number' ? (
            <p className="text-xs text-white/50">
              Seleccioná hasta {limit}. {selected.length}/{limit} elegidas.
            </p>
          ) : null}
        </header>
        <div className="mt-6">
          <Checklist items={items} selected={selected} onToggle={onToggle} limit={limit} />
        </div>
        {showOpen ? (
          <div className="mt-6">
            <label className="block text-sm font-medium text-white/80">
              {openLabel ?? '¿Quieres comentar o sumar algo más?'}
            </label>
            <textarea
              value={openValue ?? ''}
              onChange={(event) => onOpenChange?.(event.target.value)}
              placeholder="Escribí si querés… (opcional)"
              rows={4}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white shadow-inner shadow-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            />
          </div>
        ) : null}
        <NavButtons onBack={onBack} onConfirm={onConfirm} disabled={!ready} />
      </div>
    </motion.div>
  );
}
