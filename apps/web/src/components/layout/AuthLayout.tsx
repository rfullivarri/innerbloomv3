import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { getGradientButtonClass } from '../../lib/clerkAppearance';

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
    <div className="relative flex min-h-screen min-h-dvh flex-col items-stretch justify-start overflow-x-hidden overflow-y-auto bg-[#040313] px-4 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] pt-10 text-white sm:px-6 sm:pb-[calc(env(safe-area-inset-bottom)+3rem)] sm:pt-12 lg:flex-row lg:items-center lg:justify-center lg:overflow-hidden lg:px-12 lg:pb-[calc(env(safe-area-inset-bottom)+3.5rem)] lg:pt-14">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.18),transparent_55%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.15),transparent_60%),radial-gradient(circle_at_bottom_right,_rgba(217,70,239,0.1),transparent_65%)]" />
        <div className="absolute -left-24 top-32 h-72 w-72 rounded-full bg-[#a855f7]/30 blur-[140px]" />
        <div className="absolute -right-32 bottom-10 h-80 w-80 rounded-full bg-[#0ea5e9]/30 blur-[160px]" />
      </div>
      <div className="relative z-10 mx-auto w-full min-w-0 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_30px_120px_rgba(15,23,42,0.45)] backdrop-blur-3xl sm:max-w-[calc(100vw-2rem)] sm:rounded-[32px] sm:p-7 md:p-10 lg:max-w-5xl">
        <div className="flex min-w-0 flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
          <div className="flex flex-col justify-between gap-8 lg:gap-10">
            <div className="flex flex-col gap-5 sm:gap-6">
              {secondaryActionLabel && secondaryActionHref ? (
                <Link
                  to={secondaryActionHref}
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/30 px-4 py-2.5 text-sm font-semibold text-white/80 transition-colors duration-200 hover:border-white/50 hover:text-white sm:w-fit sm:px-5"
                >
                  {secondaryActionLabel}
                </Link>
              ) : null}

              <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/60 sm:text-sm lg:justify-start">
                <span className="h-2 w-2 rounded-full bg-[#7d3cff]" />
                Innerbloom
              </div>

              <div className="space-y-4 text-balance text-center sm:text-left">
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
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onPrimaryActionClick}
                  className={getGradientButtonClass()}
                >
                  {primaryActionLabel}
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex w-full min-w-0 items-center justify-center">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
