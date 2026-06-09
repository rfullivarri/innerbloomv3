import type { OnboardingLanguage } from '../constants';
import { NavButtons } from '../ui/NavButtons';
import type { GameMode, Pillar } from '../state';
import type { QuickStartTask } from '../quickStart';
import { GAME_MODE_META } from '../../lib/gameModeMeta';

interface QuickStartSummaryStepProps {
  language?: OnboardingLanguage;
  gameMode: GameMode;
  selectedByPillar: Record<Pillar, string[]>;
  tasksByPillar: Record<Pillar, QuickStartTask[]>;
  xp: { Body: number; Mind: number; Soul: number; total: number };
  onBack: () => void;
  onConfirm: () => void;
  loading?: boolean;
  submitError?: string | null;
}

const MODE_KEY: Record<GameMode, keyof typeof GAME_MODE_META> = {
  LOW: 'Low',
  CHILL: 'Chill',
  FLOW: 'Flow',
  EVOLVE: 'Evolve',
};

export function QuickStartSummaryStep({
  language = 'es',
  gameMode,
  selectedByPillar,
  tasksByPillar,
  xp,
  onBack,
  onConfirm,
  loading = false,
  submitError = null,
}: QuickStartSummaryStepProps) {
  const copy = language === 'en'
    ? {
        eyebrow: 'Summary',
        title: 'Your starter base',
        subtitle: 'Compact summary before activating your Journey.',
        baseData: 'Base data',
        gameMode: 'Rhythm',
        state: 'State',
        pillars: 'Pillars',
        selectedTraits: 'Traits from your selected tasks:',
        selectedTasks: 'Selected tasks',
        gp: 'GP (Growth Points)',
        total: 'Total',
        baseHint: 'This configuration will be your initial base to get started and adjust later.',
        start: 'Start your Journey',
        back: 'Back',
      }
    : {
        eyebrow: 'Resumen',
        title: 'Tu base inicial',
        subtitle: 'Versión compacta antes de activar tu Journey.',
        baseData: 'Base data',
        gameMode: 'Ritmo',
        state: 'Estado',
        pillars: 'Pilares',
        selectedTraits: 'Rasgos de tus tareas seleccionadas:',
        selectedTasks: 'Tareas seleccionadas',
        gp: 'GP (Puntos de Crecimiento)',
        total: 'Total',
        baseHint: 'Esta configuración será tu base inicial para arrancar y ajustarla luego.',
        start: 'Comienza tu Journey',
        back: 'Volver',
      };

  const selectedTraits = (['Body', 'Mind', 'Soul'] as Pillar[]).reduce<Record<Pillar, string[]>>((acc, pillar) => {
    const map = new Map(tasksByPillar[pillar].map((task) => [task.id, task.trait]));
    acc[pillar] = selectedByPillar[pillar].map((id) => map.get(id) ?? id);
    return acc;
  }, { Body: [], Mind: [], Soul: [] });
  const modeMeta = GAME_MODE_META[MODE_KEY[gameMode]];

  return (
    <section className="onboarding-premium-root quickstart-premium-card onboarding-flow-panel mx-auto w-full max-w-3xl p-5 sm:p-7">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">{copy.eyebrow}</p>
        <h2 className="text-3xl font-semibold text-white">{copy.title}</h2>
        <p className="text-sm text-white/70">{copy.subtitle}</p>
      </header>

      <div className="quickstart-summary-meta mt-6 grid grid-cols-2 gap-0">
        <div className="py-4 pr-4">
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/45">{copy.gameMode}</p>
          <p className="mt-2 text-base font-semibold uppercase tracking-[0.18em] text-white">{gameMode}</p>
        </div>
        <div className="py-4 pl-4">
          <p className="text-[0.68rem] uppercase tracking-[0.22em] text-white/45">{copy.state}</p>
          <p className="mt-2 text-base text-white/80">{modeMeta.state[language]}</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm text-white/70">{copy.selectedTraits}</p>
        <div className="quickstart-summary-pillars mt-3">
        {(['Body', 'Mind', 'Soul'] as Pillar[]).map((pillar) => (
          <section key={pillar} className="quickstart-summary-pillar py-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-base font-semibold text-white">{pillar === 'Body' ? 'Body 🫀' : pillar === 'Mind' ? 'Mind 🧠' : 'Soul 🏵️'}</p>
              <span className="text-xs text-white/45">{selectedByPillar[pillar].length} {copy.selectedTasks.toLowerCase()}</span>
            </div>
            <div className="quickstart-summary-traits mt-2 text-sm uppercase tracking-[0.12em]">
              {selectedTraits[pillar].length > 0
                ? selectedTraits[pillar].join(' · ')
                : <span className="text-xs text-white/50">—</span>}
            </div>
          </section>
        ))}
        </div>
      </div>

      <section className="quickstart-summary-gp mt-6 py-4">
        <p className="text-[0.68rem] uppercase tracking-[0.28em] text-white/45">{copy.gp}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-white/60">
          <p><span className="block text-lg font-semibold text-white">{xp.Body}</span>Body</p>
          <p><span className="block text-lg font-semibold text-white">{xp.Mind}</span>Mind</p>
          <p><span className="block text-lg font-semibold text-white">{xp.Soul}</span>Soul</p>
        </div>
        <p className="mt-4 text-2xl font-semibold text-white">{copy.total}: {xp.total} GP</p>
        <p className="mt-1 text-xs text-white/60">{copy.baseHint}</p>
      </section>

      <NavButtons
        language={language}
        onBack={onBack}
        onConfirm={onConfirm}
        backLabel={copy.back}
        confirmLabel={copy.start}
        disabled={loading}
        loading={loading}
      />
      {submitError ? <p className="mt-4 text-sm text-rose-200">{submitError}</p> : null}
    </section>
  );
}
