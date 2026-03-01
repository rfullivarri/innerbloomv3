import { motion } from 'framer-motion';
import type { OnboardingLanguage } from '../constants';
import { NavButtons } from '../ui/NavButtons';
import { ModeQuestionTitle } from '../ui/ModeQuestionTitle';

interface OpenTextStepProps {
  language?: OnboardingLanguage;
  title: string;
  subtitle: string;
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onBack?: () => void;
  placeholder?: string;
  xpAmount: number;
  multiline?: boolean;
}

export function OpenTextStep({
  language = 'es',
  title,
  subtitle,
  value,
  onChange,
  onConfirm,
  onBack,
  placeholder,
  xpAmount,
  multiline = true,
}: OpenTextStepProps) {
  const resolvedPlaceholder = placeholder ?? (language === 'en' ? 'Write here…' : 'Escribí acá…');
  const badge = language === 'en' ? 'Key question' : 'Pregunta clave';
  const ready = value.trim().length > 0;
  const Component = multiline ? 'textarea' : 'input';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="glass-card onboarding-surface-base mx-auto max-w-3xl rounded-3xl p-6">
        <header className="flex flex-col gap-2 border-b border-white/5 pb-4">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">{badge} · +{xpAmount} XP</p>
          <ModeQuestionTitle title={title} />
          <p className="text-sm text-white/70">{subtitle}</p>
        </header>
        <div className="mt-6">
          <Component
            value={value}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => onChange(event.target.value)}
            placeholder={resolvedPlaceholder}
            {...(multiline ? { rows: 5 } : { type: 'text' })}
            className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white shadow-inner shadow-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400"
          />
        </div>
        <NavButtons language={language} onBack={onBack} onConfirm={onConfirm} disabled={!ready} />
      </div>
    </motion.div>
  );
}
