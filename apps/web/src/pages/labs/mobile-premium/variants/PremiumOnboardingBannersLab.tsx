import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { OnboardingProgress } from '../../../../lib/api';
import { TraitIcon } from '../MobilePremiumPrimitives';
import { DEFAULT_MOBILE_PREMIUM_BASE, normalizeMobilePremiumBasePath, useMobilePremiumBasePath } from '../mobilePremiumRouting';

const LAB_BASE = DEFAULT_MOBILE_PREMIUM_BASE;

export type OnboardingBanner = {
  accent: 'violet' | 'green' | 'amber' | 'red' | 'blue';
  action: string;
  description: string;
  href: string;
  icon: 'trait' | 'spinner' | 'alert' | 'spark';
  label: string;
  title: string;
  trait: string;
  variant?: 'welcome';
};

export const ONBOARDING_BANNERS: OnboardingBanner[] = [
  {
    accent: 'violet',
    action: 'Empezar',
    description: 'Registrá la emoción predominante de ayer y marcá qué tareas completaste.',
    href: `${LAB_BASE}/dquest`,
    icon: 'trait',
    label: 'Primer paso',
    title: 'Realizá tu primer DQuest',
    trait: 'calm',
  },
  {
    accent: 'blue',
    action: 'Revisar tareas',
    description: 'Confirmá tu base desde Tareas. Podés editar cada práctica sin abrir un editor separado.',
    href: `${LAB_BASE}/tareas`,
    icon: 'trait',
    label: 'Base inicial',
    title: 'Revisá tus tareas',
    trait: 'focus',
  },
  {
    accent: 'green',
    action: 'Programar',
    description: 'Elegí una hora diaria para que el DQuest vuelva siempre al mismo ritmo.',
    href: `${LAB_BASE}/dashboard?onboardingAction=reminder`,
    icon: 'trait',
    label: 'Último paso',
    title: 'Programá tu DQuest',
    trait: 'energy',
  },
  {
    accent: 'amber',
    action: 'Ver estado',
    description: 'Estamos generando tus primeras misiones personalizadas. Puede tardar unos minutos.',
    href: `${LAB_BASE}/dashboard`,
    icon: 'spinner',
    label: 'Preparando',
    title: 'Tu Journey se está preparando',
    trait: 'learning',
  },
  {
    accent: 'red',
    action: 'Reintentar',
    description: 'Hubo un problema al generar tus tareas. Mantenemos tu progreso y podés volver a intentar.',
    href: `${LAB_BASE}/dashboard`,
    icon: 'alert',
    label: 'Atención',
    title: 'Tardamos más de lo esperado',
    trait: 'nutrition',
  },
  {
    accent: 'violet',
    action: '',
    description: '',
    href: `${LAB_BASE}/dashboard`,
    icon: 'spark',
    label: 'Onboarding completado',
    title: 'Bienvenido a Innerbloom',
    trait: 'gratitude',
    variant: 'welcome',
  },
];

function withOnboardingBannerBase(banner: OnboardingBanner, basePath: string): OnboardingBanner {
  const labBase = normalizeMobilePremiumBasePath(basePath);
  return {
    ...banner,
    href: banner.href.replace(LAB_BASE, labBase),
  };
}

const ACCENT_CLASS: Record<OnboardingBanner['accent'], { glow: string; text: string; line: string; bg: string }> = {
  amber: {
    bg: 'bg-amber-300/10',
    glow: 'shadow-[0_0_32px_rgba(251,191,36,0.16)]',
    line: 'bg-[color:var(--mp-amber)]',
    text: 'text-[color:var(--mp-amber)]',
  },
  blue: {
    bg: 'bg-cyan-700/10',
    glow: 'shadow-[0_0_32px_rgba(14,116,144,0.12)]',
    line: 'bg-[#0e7490]',
    text: 'text-[#0e7490]',
  },
  green: {
    bg: 'bg-emerald-300/10',
    glow: 'shadow-[0_0_32px_rgba(74,222,128,0.14)]',
    line: 'bg-[color:var(--mp-green)]',
    text: 'text-[color:var(--mp-green)]',
  },
  red: {
    bg: 'bg-red-300/10',
    glow: 'shadow-[0_0_32px_rgba(248,113,113,0.14)]',
    line: 'bg-[color:var(--mp-red)]',
    text: 'text-[color:var(--mp-red)]',
  },
  violet: {
    bg: 'bg-violet-300/10',
    glow: 'shadow-[0_0_32px_rgba(167,139,250,0.16)]',
    line: 'bg-[color:var(--mp-violet)]',
    text: 'text-[color:var(--mp-violet)]',
  },
};

export function buildActiveOnboardingBanners(progress: OnboardingProgress | null | undefined, basePath = LAB_BASE): OnboardingBanner[] {
  const rebase = (banner: OnboardingBanner) => withOnboardingBannerBase(banner, basePath);
  if (!progress?.tasks_generated_at) {
    return [rebase(ONBOARDING_BANNERS[3])];
  }

  if (!progress.first_task_edited_at) {
    return [rebase(ONBOARDING_BANNERS[1])];
  }

  if (!progress.first_daily_quest_completed_at) {
    return [rebase(ONBOARDING_BANNERS[0])];
  }

  if (!progress.daily_quest_scheduled_at) {
    return [rebase(ONBOARDING_BANNERS[2])];
  }

  return [rebase(ONBOARDING_BANNERS[5])];
}

export function PremiumOnboardingBannersLab({
  banners = ONBOARDING_BANNERS,
  compact = false,
  welcomeStorageKey,
}: {
  banners?: OnboardingBanner[];
  compact?: boolean;
  welcomeStorageKey?: string;
}) {
  const labBase = useMobilePremiumBasePath();
  const effectiveBanners = banners.map((banner) => withOnboardingBannerBase(banner, labBase));
  const [welcomeVisible, setWelcomeVisible] = useState(() => (
    !welcomeStorageKey || typeof window === 'undefined' || window.localStorage.getItem(welcomeStorageKey) !== '1'
  ));
  const hasWelcome = effectiveBanners.some((banner) => banner.variant === 'welcome');

  useEffect(() => {
    if (!hasWelcome) {
      setWelcomeVisible(true);
      return undefined;
    }
    if (welcomeStorageKey) {
      if (window.localStorage.getItem(welcomeStorageKey) === '1') {
        setWelcomeVisible(false);
        return undefined;
      }
      window.localStorage.setItem(welcomeStorageKey, '1');
    }
    const timer = window.setTimeout(() => setWelcomeVisible(false), 8000);
    return () => window.clearTimeout(timer);
  }, [hasWelcome, welcomeStorageKey]);

  const visibleBanners = welcomeVisible ? effectiveBanners : effectiveBanners.filter((banner) => banner.variant !== 'welcome');

  return (
    <section className={`space-y-7 ${compact ? '' : 'pb-24'}`}>
      <style>{`
        @keyframes mpOnboardingSpin { to { transform: rotate(360deg); } }
        @keyframes mpOnboardingShimmer { 0% { transform: translateX(-120%) skewX(-16deg); } 100% { transform: translateX(220%) skewX(-16deg); } }
        @keyframes mpOnboardingSpark { 0%,100% { transform: scale(1); opacity: .9; } 50% { transform: scale(1.12); opacity: 1; } }
        @keyframes mpOnboardingCtaPulse {
          0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(139,92,246,.18), 0 0 20px rgba(139,92,246,.14); }
          50% { transform: scale(1.045); box-shadow: 0 0 0 7px rgba(139,92,246,0), 0 0 30px rgba(139,92,246,.28); }
        }
        .mp-onboarding-spinner { animation: mpOnboardingSpin 1s linear infinite; }
        .mp-onboarding-welcome-shine { animation: mpOnboardingShimmer 2.6s ease-in-out infinite; }
        .mp-onboarding-spark { animation: mpOnboardingSpark 1.8s ease-in-out infinite; }
        .mp-onboarding-cta { animation: mpOnboardingCtaPulse 1.55s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .mp-onboarding-spinner, .mp-onboarding-welcome-shine, .mp-onboarding-spark, .mp-onboarding-cta { animation: none !important; }
        }
      `}</style>
      {!compact ? (
        <div className="border-b border-[color:var(--mp-border)] pb-5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--mp-text-muted)]">Sistema visual</p>
          <h1 className="mt-2 text-[1.65rem] font-semibold leading-tight text-[color:var(--mp-text)]">Banners de onboarding</h1>
          <p className="mt-3 max-w-[21rem] text-sm leading-6 text-[color:var(--mp-text-secondary)]">
            Estados que después se activan por readiness real. Por ahora son piezas visuales para validar jerarquía, tono y CTA.
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        {visibleBanners.map((banner) => (
          <OnboardingBannerCard banner={banner} key={banner.title} />
        ))}
      </div>
    </section>
  );
}

function OnboardingBannerCard({ banner }: { banner: OnboardingBanner }) {
  const accent = ACCENT_CLASS[banner.accent];
  if (banner.variant === 'welcome') {
    return <WelcomeBanner banner={banner} />;
  }
  return (
    <article className={`relative overflow-hidden rounded-[1.45rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-4 ${accent.glow}`}>
      <span className={`absolute inset-y-5 left-0 w-1 rounded-r-full ${accent.line}`} />
      <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-4">
        <div className={`grid h-11 w-11 place-items-center rounded-full border border-[color:var(--mp-border)] ${accent.bg} ${accent.text}`}>
          <BannerIcon banner={banner} />
        </div>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-[0.68rem] font-semibold uppercase tracking-[0.2em] ${accent.text}`}>{banner.label}</p>
              <h2 className="mt-1 text-lg font-semibold leading-tight text-[color:var(--mp-text)]">{banner.title}</h2>
            </div>
            <Link
              className="mp-onboarding-cta shrink-0 rounded-full border border-[color:var(--mp-violet)] bg-violet-400/10 px-3 py-1.5 text-xs font-semibold text-[color:var(--mp-text)] shadow-[0_0_24px_rgba(167,139,250,0.18)]"
              to={banner.href}
            >
              {banner.action}
            </Link>
          </div>
          <p className="mt-3 text-sm leading-5 text-[color:var(--mp-text-secondary)]">{banner.description}</p>
        </div>
      </div>
    </article>
  );
}

function BannerIcon({ banner }: { banner: OnboardingBanner }) {
  if (banner.icon === 'spinner') {
    return <span className="mp-onboarding-spinner h-5 w-5 rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />;
  }
  if (banner.icon === 'alert') {
    return <span className="text-xl font-semibold leading-none" aria-hidden="true">!</span>;
  }
  if (banner.icon === 'spark') {
    return <span className="mp-onboarding-spark text-xl leading-none" aria-hidden="true">✦</span>;
  }
  return <TraitIcon size={22} trait={banner.trait} />;
}

function WelcomeBanner({ banner }: { banner: OnboardingBanner }) {
  return (
    <article className="relative overflow-hidden rounded-[1.55rem] border border-white/18 bg-gradient-to-r from-[#8b5cf6] via-[#d946ef] to-[#f5c56b] p-4 text-[#12091d] shadow-[0_26px_70px_rgba(167,139,250,0.28)]">
      <span className="mp-onboarding-welcome-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/24 blur-xl" aria-hidden="true" />
      <div className="relative grid grid-cols-[52px_minmax(0,1fr)] items-center gap-4">
        <div className="grid h-13 w-13 place-items-center rounded-[1.15rem] border border-black/12 bg-white/28 shadow-[0_14px_38px_rgba(15,23,42,0.14)]">
          <span className="mp-onboarding-spark text-2xl leading-none" aria-hidden="true">✦</span>
        </div>
        <div className="min-w-0">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-black/62">{banner.label}</p>
          <h2 className="mt-1 text-[1.45rem] font-black leading-tight text-black">{banner.title}</h2>
        </div>
      </div>
    </article>
  );
}
