import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AUTH_LOGIN_MAX_WIDTH, getGradientButtonClass } from '../../lib/clerkAppearance';

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
    <div className="relative flex min-h-screen min-h-dvh flex-col items-center justify-center overflow-x-hidden overflow-y-auto bg-[linear-gradient(135deg,_#000c40,_#f8cdda)] px-4 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] pt-10 text-white sm:px-6 sm:pb-[calc(env(safe-area-inset-bottom)+3rem)] sm:pt-12 lg:overflow-hidden lg:px-12 lg:pb-[calc(env(safe-area-inset-bottom)+3.5rem)] lg:pt-14">
      <div className="relative z-10 mx-auto w-full min-w-0 max-w-[calc(100%-1.5rem)] overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_30px_120px_rgba(15,23,42,0.45)] backdrop-blur-3xl sm:max-w-[calc(100%-2rem)] sm:rounded-[32px] sm:p-7 md:p-10 lg:max-w-4xl">
        <div className="flex min-w-0 flex-col items-center gap-9 sm:gap-10 lg:gap-12">
          <div className="flex w-full max-w-3xl flex-col items-center gap-6 text-center sm:gap-7">
            {secondaryActionLabel && secondaryActionHref ? (
              <Link
                to={secondaryActionHref}
                className="inline-flex w-full items-center justify-center rounded-full border border-white/30 px-4 py-2.5 text-sm font-semibold text-white/80 transition-colors duration-200 hover:border-white/50 hover:text-white sm:w-fit sm:px-5"
              >
                {secondaryActionLabel}
              </Link>
            ) : null}

            <div className="flex items-center justify-center text-xs font-semibold uppercase tracking-[0.4em] text-white/60 sm:text-sm">
              <span className="flex items-center gap-1">
                <span>Innerbloom</span>
                <img
                  src="/IB-COLOR-LOGO.png"
                  alt="Innerbloom logo"
                  className="h-[2em] w-auto"
                />
              </span>
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
