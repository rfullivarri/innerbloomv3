import { motion } from 'framer-motion';
import type { OnboardingLanguage } from '../constants';
import type { GameMode } from '../state';
import { NavButtons } from '../ui/NavButtons';
import { AVATAR_OPTIONS } from '../../lib/avatarCatalog';
import { resolveAvatarMedia } from '../../lib/avatarProfile';
import { buildAvatarPreviewProfile } from '../../lib/avatarCatalog';

interface AvatarStepProps {
  language?: OnboardingLanguage;
  rhythm: GameMode | null;
  selectedAvatarId: number | null;
  onSelectAvatar: (avatarId: number) => void;
  onConfirm: () => void;
  onBack?: () => void;
}

export function AvatarStep({
  language = 'es',
  rhythm,
  selectedAvatarId,
  onSelectAvatar,
  onConfirm,
  onBack,
}: AvatarStepProps) {
  const copy = language === 'en'
    ? {
        step: 'Step 2 · Choose your avatar',
        title: 'Which avatar feels like your space?',
        subtitle: 'Avatar controls visuals. Rhythm keeps controlling your journey behavior.',
        selected: 'Selected',
        continue: 'Continue',
        select: 'Select an avatar',
      }
    : {
        step: 'Paso 2 · Elegí tu avatar',
        title: '¿Qué avatar representa tu espacio?',
        subtitle: 'El avatar define lo visual. Tu ritmo sigue definiendo el comportamiento del Journey.',
        selected: 'Seleccionado',
        continue: 'Continuar',
        select: 'Seleccioná un avatar',
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
            const previewProfile = buildAvatarPreviewProfile(option);
            const media = resolveAvatarMedia(previewProfile, { rhythm, surface: 'onboarding' });
            return (
              <button
                key={option.avatarId}
                type="button"
                onClick={() => onSelectAvatar(option.avatarId)}
                aria-pressed={isActive}
                className={`onboarding-surface-inner rounded-2xl border px-4 py-3 text-left transition ${isActive ? 'border-white/80 bg-white/12' : 'border-white/20 bg-white/6 hover:border-white/35'}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">{option.name}</p>
                  {isActive ? (
                    <span className="rounded-full border border-emerald-200/70 bg-emerald-300/90 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-950">
                      {copy.selected}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  <img src={media.imageUrl ?? '/FlowMood.jpg'} alt={media.alt} className="h-28 w-full object-cover" loading="lazy" />
                </div>
              </button>
            );
          })}
        </div>
        <NavButtons
          language={language}
          showBack={Boolean(onBack)}
          onBack={onBack}
          onConfirm={onConfirm}
          confirmLabel={selectedAvatarId ? copy.continue : copy.select}
          disabled={!selectedAvatarId}
        />
      </div>
    </motion.div>
  );
}
