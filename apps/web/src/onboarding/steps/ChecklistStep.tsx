import { motion } from 'framer-motion';
import type { OnboardingLanguage } from '../constants';
import { Checklist } from '../ui/Checklist';
import { NavButtons } from '../ui/NavButtons';
import { ModeQuestionTitle } from '../ui/ModeQuestionTitle';
import { XpBonusChip } from '../ui/XpBonusChip';

interface ChecklistStepProps {
  language?: OnboardingLanguage;
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
  openBonusXp?: number;
}

export function ChecklistStep({
  language = 'es',
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
  openBonusXp = 8,
}: ChecklistStepProps) {
  const ready = selected.length >= 1;
  const showOpen = typeof onOpenChange === 'function';
  const isOpenActive = (openValue ?? '').trim().length > 0;
  const limitLabel = language === 'en' ? `Select up to ${limit}. ${selected.length}/${limit} selected.` : `Seleccioná hasta ${limit}. ${selected.length}/${limit} elegidas.`;
  const openDefaultLabel = language === 'en' ? 'Do you want to comment or add anything else?' : '¿Quieres comentar o sumar algo más?';
  const openPlaceholder = language === 'en' ? 'Write if you want… (optional)' : 'Escribí si querés… (opcional)';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="glass-card onboarding-surface-base mx-auto max-w-3xl rounded-3xl p-6">
        <header className="flex flex-col gap-2 border-b border-white/5 pb-4">
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">{badgeLabel} · +{xpAmount} XP</p>
          <ModeQuestionTitle title={title} />
          <p className="text-sm text-white/70">{subtitle}</p>
          {typeof limit === 'number' ? (
            <p className="text-xs text-white/50">
              {limitLabel}
            </p>
          ) : null}
        </header>
        <div className="mt-6">
          <Checklist items={items} selected={selected} onToggle={onToggle} limit={limit} />
        </div>
        {showOpen ? (
          <div className="mt-6">
            <label className="flex items-center justify-between gap-3 text-sm font-medium text-white/80">
              <span>{openLabel ?? openDefaultLabel}</span>
              <XpBonusChip bonus={openBonusXp} active={isOpenActive} />
            </label>
            <textarea
              value={openValue ?? ''}
              onChange={(event) => onOpenChange?.(event.target.value)}
              placeholder={openPlaceholder}
              rows={4}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white shadow-inner shadow-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            />
          </div>
        ) : null}
        <NavButtons language={language} onBack={onBack} onConfirm={onConfirm} disabled={!ready} />
      </div>
    </motion.div>
  );
}
