import type { ReactNode } from 'react';
import { getGradientButtonClass } from '../../lib/clerkAppearance';
import { getLandingThemeBackground, type LandingThemeMode } from '../../lib/landingTheme';
import { BrandWordmark } from './BrandWordmark';

interface AuthLayoutProps {
  children: ReactNode;
  title: ReactNode;
  description?: string;
  primaryActionLabel?: string;
  onPrimaryActionClick?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  themeMode?: LandingThemeMode;
}

export function AuthLayout({
  children,
  title,
  description,
  primaryActionLabel,
  onPrimaryActionClick,
  secondaryActionLabel,
  secondaryActionHref,
  themeMode = 'dark',
}: AuthLayoutProps) {
  const landingThemeBackground = getLandingThemeBackground(themeMode);
  const isLight = themeMode === 'light';

  return (
    <div
      className={`relative flex min-h-screen min-h-dvh flex-col items-center justify-center overflow-x-hidden overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] pt-[calc(env(safe-area-inset-top,0px)+1.15rem)] sm:px-6 sm:pb-[calc(env(safe-area-inset-bottom)+3rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+1.35rem)] lg:overflow-hidden lg:px-12 lg:pb-[calc(env(safe-area-inset-bottom)+3.5rem)] lg:pt-[calc(env(safe-area-inset-top,0px)+1.5rem)] ${isLight ? 'text-[#171126]' : 'text-white'}`}
      style={{ background: landingThemeBackground.base }}
      data-theme-mode={themeMode}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-100"
      >
        <div className="absolute inset-0" style={{ background: landingThemeBackground.gradient }} />
        <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent)]" />
      </div>

      {secondaryActionLabel && secondaryActionHref ? (
        <a
          href={secondaryActionHref}
          className={`absolute left-4 top-[calc(env(safe-area-inset-top,0px)+0.45rem)] z-20 inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold shadow-[0_12px_28px_rgba(0,0,0,0.16)] backdrop-blur transition-colors duration-200 sm:left-6 lg:left-8 ${
            isLight
              ? 'border border-[rgba(78,61,130,0.2)] bg-white/70 text-[#2a2142] hover:border-[rgba(78,61,130,0.28)] hover:bg-white/82 hover:text-[#171126]'
              : 'border border-white/10 bg-white/[0.055] text-white/68 hover:border-white/18 hover:bg-white/[0.08] hover:text-white'
          }`}
        >
          <span aria-hidden="true" className="text-base leading-none">←</span>
          {secondaryActionLabel}
        </a>
      ) : null}

      <div className="relative z-10 mx-auto flex w-full min-w-0 max-w-md flex-col items-center gap-6 pt-5 text-center sm:gap-7">
        <div className={`flex items-center justify-center text-[17px] font-semibold uppercase tracking-[0.42em] ${isLight ? 'text-[#2f2552]/70' : 'text-white/66'}`}>
          <BrandWordmark className="gap-3.5" textClassName="tracking-[0.42em]" iconClassName="h-[3.2em]" />
        </div>

        <div className="w-full space-y-3 text-balance text-center">
          {typeof title === 'string' ? (
            <h1 className={`text-[2.4rem] font-semibold leading-tight tracking-tight sm:text-[2.8rem] ${isLight ? 'text-[#120f1f]' : 'text-white'}`}>{title}</h1>
          ) : (
            title
          )}
          {description ? (
            <p className={`text-sm sm:text-base md:text-lg ${isLight ? 'text-[#3b305f]/78' : 'text-white/70'}`}>{description}</p>
          ) : null}
        </div>

        {primaryActionLabel ? (
          <div className="flex w-full flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onPrimaryActionClick}
              className={getGradientButtonClass()}
            >
              {primaryActionLabel}
            </button>
          </div>
        ) : null}

        <div className="flex w-full min-w-0 items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}
