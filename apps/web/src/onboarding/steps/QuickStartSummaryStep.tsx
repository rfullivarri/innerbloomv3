import { motion } from 'framer-motion';
import type { OnboardingLanguage } from '../constants';
import { NavButtons } from '../ui/NavButtons';
import type { GameMode, Pillar } from '../state';
import { buildGameModeChip, GameModeChip } from '../../components/common/GameModeChip';

interface QuickStartSummaryStepProps {
  language?: OnboardingLanguage;
  gameMode: GameMode;
  selectedByPillar: Record<Pillar, string[]>;
  xp: { Body: number; Mind: number; Soul: number; total: number };
  onBack: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function QuickStartSummaryStep({ language = 'es', gameMode, selectedByPillar, xp, onBack, onConfirm, loading = false }: QuickStartSummaryStepProps) {
  const copy = language === 'en'
    ? {
        title: 'Your starter base',
        subtitle: 'Compact summary before activating your Journey.',
        selectedTasks: 'Selected tasks',
        total: 'Total',
        start: 'Start your Journey',
        back: 'Back',
      }
    : {
        title: 'Tu base inicial',
        subtitle: 'Resumen compacto antes de activar tu Journey.',
        selectedTasks: 'Tareas seleccionadas',
        total: 'Total',
        start: 'Comienza tu Journey',
        back: 'Volver',
      };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="glass-card onboarding-surface-base mx-auto w-full max-w-4xl rounded-3xl p-6 sm:p-8"
    >
      <h2 className="text-3xl font-semibold text-white">{copy.title}</h2>
      <p className="mt-2 text-sm text-white/70">{copy.subtitle}</p>

      <div className="mt-5 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/50">Game Mode</p>
          <span className="mt-2 inline-flex origin-left scale-75">
            <GameModeChip {...buildGameModeChip(gameMode)} />
          </span>
        </div>
        {(['Body', 'Mind', 'Soul'] as Pillar[]).map((pillar) => (
          <p key={pillar} className="text-sm text-white/80">{pillar}: {selectedByPillar[pillar].length} {copy.selectedTasks}</p>
        ))}
        <p className="text-sm text-white/80">Body: {xp.Body} GP</p>
        <p className="text-sm text-white/80">Mind: {xp.Mind} GP</p>
        <p className="text-sm text-white/80">Soul: {xp.Soul} GP</p>
        <p className="text-base font-semibold text-white">{copy.total}: {xp.total} GP</p>
      </div>

      <NavButtons
        language={language}
        onBack={onBack}
        onConfirm={onConfirm}
        backLabel={copy.back}
        confirmLabel={copy.start}
        disabled={loading}
        loading={loading}
      />
    </motion.section>
  );
}
