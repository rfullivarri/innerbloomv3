import type { ReactNode } from 'react';
import { getGradientButtonClass } from '../../lib/clerkAppearance';
import { BrandWordmark } from './BrandWordmark';

interface AuthLayoutProps {
  children: ReactNode;
  title: ReactNode;
  description?: string;
  primaryActionLabel?: string;
  onPrimaryActionClick?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
}

export function AuthLayout({
  children,
  title,
  description,
  primaryActionLabel,
  onPrimaryActionClick,
  secondaryActionLabel,
  secondaryActionHref
}: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen min-h-dvh flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-[#0b1335] px-4 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] pt-[calc(env(safe-area-inset-top,0px)+1.15rem)] text-white sm:px-6 sm:pb-[calc(env(safe-area-inset-bottom)+3rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+1.35rem)] lg:overflow-hidden lg:px-12 lg:pb-[calc(env(safe-area-inset-bottom)+3.5rem)] lg:pt-[calc(env(safe-area-inset-top,0px)+1.5rem)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-100"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(104,69,255,0.28),transparent_34%),radial-gradient(circle_at_78%_18%,rgba(167,139,250,0.18),transparent_22%),linear-gradient(180deg,#10193f_0%,#0b1335_50%,#090f2d_100%)]" />
        <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent)]" />
      </div>

      {secondaryActionLabel && secondaryActionHref ? (
        <a
          href={secondaryActionHref}
          className="absolute left-4 top-[calc(env(safe-area-inset-top,0px)+0.45rem)] z-20 inline-flex items-center justify-center gap-2 rounded-full px-1 py-1 text-sm font-semibold text-white/62 transition-colors duration-200 hover:text-white sm:left-6 lg:left-8"
        >
          <span aria-hidden="true" className="text-base leading-none">←</span>
          {secondaryActionLabel}
        </a>
      ) : null}

      <div className="relative z-10 mx-auto flex w-full min-w-0 max-w-md flex-col items-center gap-6 pt-5 text-center sm:gap-7">
        <div className="flex items-center justify-center text-[17px] font-semibold uppercase tracking-[0.42em] text-white/66">
          <BrandWordmark className="gap-3.5" textClassName="tracking-[0.42em]" iconClassName="h-[3.2em]" />
        </div>

        <div className="w-full space-y-3 text-balance text-center">
          {typeof title === 'string' ? (
            <h1 className="text-[2.4rem] font-semibold leading-tight tracking-tight text-white sm:text-[2.8rem]">{title}</h1>
          ) : (
            title
          )}
          {description ? (
            <p className="text-sm text-white/70 sm:text-base md:text-lg">{description}</p>
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
