import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
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

      <div className="relative z-10 mx-auto w-full min-w-0 max-w-[calc(100%-1.5rem)] overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(46,64,123,0.86),rgba(19,29,72,0.92))] p-5 shadow-[0_30px_120px_rgba(5,10,30,0.58),0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-3xl sm:max-w-[calc(100%-2rem)] sm:rounded-[34px] sm:p-7 md:p-10 lg:max-w-4xl">
        <div className="flex min-w-0 flex-col items-center gap-9 sm:gap-10 lg:gap-12">
          <div className="flex w-full max-w-3xl flex-col items-center gap-6 text-center sm:gap-7">
            {secondaryActionLabel && secondaryActionHref ? (
              <Link
                to={secondaryActionHref}
                className="inline-flex w-full items-center justify-center rounded-full border border-white/12 bg-white/[0.045] px-4 py-2.5 text-sm font-semibold text-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.08] hover:text-white sm:w-fit sm:px-5"
              >
                {secondaryActionLabel}
              </Link>
            ) : null}

            <div className="flex items-center justify-center text-xs font-semibold uppercase tracking-[0.4em] text-white/62 sm:text-sm">
              <BrandWordmark className="gap-1" textClassName="tracking-[0.4em]" iconClassName="h-[2em]" />
            </div>

            <div className="space-y-4 text-balance text-center">
              {typeof title === 'string' ? (
                <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl md:text-5xl">{title}</h1>
              ) : (
                title
              )}
              {description ? (
                <p className="text-sm text-white/70 sm:text-base md:text-lg">{description}</p>
              ) : null}
            </div>
          </div>

          {primaryActionLabel ? (
            <div className="flex w-full max-w-3xl flex-wrap justify-center gap-3">
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
    </div>
  );
}
