import { motion } from 'framer-motion';
import type { OnboardingLanguage } from '../constants';
import type { GameMode } from '../state';
import { AVATAR_OPTIONS, resolveAvatarPickerPreviewImage } from '../../lib/avatarCatalog';

interface AvatarStepProps {
  language?: OnboardingLanguage;
  rhythm: GameMode | null;
  selectedAvatarId: number | null;
  onSelectAvatar: (avatarId: number) => void;
  onBack?: () => void;
  isSaving?: boolean;
}

export function AvatarStep({
  language = 'es',
  selectedAvatarId,
  onSelectAvatar,
  onBack,
  isSaving = false,
}: AvatarStepProps) {
  const copy = language === 'en'
    ? {
        step: 'Step 2 · Choose your avatar',
        title: 'Which avatar feels like your space?',
        subtitle: 'Avatar controls visuals. Rhythm keeps controlling your journey behavior.',
        selected: 'Selected',
        back: 'Back',
        saving: 'Saving…',
      }
    : {
        step: 'Paso 2 · Elegí tu avatar',
        title: '¿Qué avatar representa tu espacio?',
        subtitle: 'El avatar define lo visual. Tu ritmo sigue definiendo el comportamiento del Journey.',
        selected: 'Seleccionado',
        back: 'Volver',
        saving: 'Guardando…',
      };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="glass-card onboarding-surface-base mx-auto max-w-4xl rounded-3xl p-4 sm:p-6">
        <header className="flex flex-col gap-2 border-b border-white/5 pb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">{copy.step}</p>
          <h2 className="text-3xl font-semibold text-white">{copy.title}</h2>
          <p className="text-sm text-white/70">{copy.subtitle}</p>
        </header>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {AVATAR_OPTIONS.map((option) => {
            const isActive = selectedAvatarId === option.avatarId;
            const previewImageUrl = resolveAvatarPickerPreviewImage(option);
            return (
              <button
                key={option.avatarId}
                type="button"
                onClick={() => onSelectAvatar(option.avatarId)}
                disabled={isSaving}
                aria-pressed={isActive}
                aria-busy={isSaving}
                className={`onboarding-surface-inner rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#cf8bf3]/60 ${isActive ? 'border-white/80 bg-white/12' : 'border-white/20 bg-white/6 hover:border-white/35'} ${isSaving ? 'cursor-wait opacity-70' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{option.name}</p>
                  {isActive ? (
                    <span className="rounded-full border border-[#eed9ff]/80 bg-[#e9d5ff]/90 px-2 py-0.5 text-[10px] font-semibold uppercase text-[#240f43]">
                      {copy.selected}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  <img src={previewImageUrl ?? '/FlowMood.jpg'} alt={option.name} className="h-28 w-full object-cover" loading="lazy" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2 text-sm font-medium text-white/80 transition hover:border-white/30 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#cf8bf3]/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ← {copy.back}
            </button>
          ) : (
            <span />
          )}
          {isSaving ? <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">{copy.saving}</span> : null}
        </div>
      </div>
    </motion.div>
  );
}
