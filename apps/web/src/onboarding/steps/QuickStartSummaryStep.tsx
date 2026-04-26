import type { OnboardingLanguage } from '../constants';
import { NavButtons } from '../ui/NavButtons';
import type { GameMode, Pillar } from '../state';
import type { QuickStartTask } from '../quickStart';
import { GAME_MODE_META } from '../../lib/gameModeMeta';
import { buildGameModeChip, GameModeChip } from '../../components/common/GameModeChip';
import { buildAvatarPreviewProfile, getAvatarOptionById, resolveAvatarPickerPreviewImage } from '../../lib/avatarCatalog';

interface QuickStartSummaryStepProps {
  language?: OnboardingLanguage;
  gameMode: GameMode;
  selectedAvatarId: number | null;
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
  selectedAvatarId,
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
  const avatarOption = getAvatarOptionById(selectedAvatarId);
  const avatarProfile = avatarOption ? buildAvatarPreviewProfile(avatarOption) : null;
  const avatarPreviewImage = avatarOption ? resolveAvatarPickerPreviewImage(avatarOption) : null;

  return (
    <section className="onboarding-premium-root quickstart-premium-card glass-card onboarding-surface-base mx-auto w-full max-w-5xl rounded-3xl p-6 sm:p-8">
      <header className="flex flex-col gap-2 border-b border-white/5 pb-4">
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">{copy.eyebrow}</p>
        <h2 className="text-3xl font-semibold text-white">{copy.title}</h2>
        <p className="text-sm text-white/70">{copy.subtitle}</p>
      </header>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <section className="quickstart-premium-surface rounded-2xl border p-5">
            <header className="border-b border-white/5 pb-3">
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">{copy.baseData}</p>
            </header>
            <div className="mt-4 space-y-3">
              <div>
                      <p className="text-xs uppercase tracking-wide text-white/50">{copy.gameMode}</p>
                      <span className="mt-2 inline-flex origin-left scale-75">
                  <GameModeChip {...buildGameModeChip(gameMode, { avatarProfile })} />
                </span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-white/50">Avatar</p>
                <p className="mt-1 inline-flex items-center gap-2 text-sm text-white/80">
                  <span>{avatarOption?.name ?? '—'}</span>
                  {avatarOption ? <img src={avatarPreviewImage ?? '/FlowMood.jpg'} alt={avatarOption.name} className="h-7 w-7 rounded-full border border-white/20 object-cover" /> : null}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-white/50">{copy.state}</p>
                <p className="mt-1 text-sm text-white/80">{GAME_MODE_META[MODE_KEY[gameMode]].state[language]}</p>
              </div>
            </div>
          </section>
          <section className="quickstart-premium-surface rounded-2xl border p-5">
            <header className="border-b border-white/5 pb-3">
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">{copy.pillars}</p>
            </header>
            <div className="mt-4 space-y-3">
              <p className="text-sm text-white/70">{copy.selectedTraits}</p>
              {(['Body', 'Mind', 'Soul'] as Pillar[]).map((pillar) => (
                <div key={pillar} className="quickstart-premium-surface rounded-xl border p-3">
                  <p className="text-sm font-semibold text-white">{pillar === 'Body' ? 'Body 🫀' : pillar === 'Mind' ? 'Mind 🧠' : 'Soul 🏵️'}</p>
                  <p className="mt-1 text-xs text-white/70">{copy.selectedTasks}: {selectedByPillar[pillar].length}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedTraits[pillar].length > 0
                      ? selectedTraits[pillar].map((trait) => (
                        <span key={`${pillar}-${trait}`} className="quickstart-pill rounded-full border px-2.5 py-1 text-[11px] font-medium">
                          {trait}
                        </span>
                      ))
                      : <span className="text-xs text-white/50">—</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="quickstart-premium-surface rounded-2xl border p-5">
            <header className="border-b border-white/5 pb-3">
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">{copy.gp}</p>
            </header>
            <div className="mt-4 space-y-2 text-sm text-white/85">
              <p><span className="font-semibold text-white">Body 🫀:</span> {xp.Body} GP</p>
              <p><span className="font-semibold text-white">Mind 🧠:</span> {xp.Mind} GP</p>
              <p><span className="font-semibold text-white">Soul 🏵️:</span> {xp.Soul} GP</p>
              <p className="mt-3 text-base font-semibold text-white">{copy.total}: {xp.total} GP</p>
              <p className="text-xs text-white/60">{copy.baseHint}</p>
            </div>
          </section>
        </aside>
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
      {submitError ? <p className="mt-4 text-sm text-rose-200">{submitError}</p> : null}
    </section>
  );
}
