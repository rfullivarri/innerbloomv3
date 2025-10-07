import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#040313] px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.18),transparent_55%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.15),transparent_60%),radial-gradient(circle_at_bottom_right,_rgba(217,70,239,0.1),transparent_65%)]" />
        <div className="absolute -left-24 top-32 h-72 w-72 rounded-full bg-[#a855f7]/30 blur-[140px]" />
        <div className="absolute -right-32 bottom-10 h-80 w-80 rounded-full bg-[#0ea5e9]/30 blur-[160px]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_30px_120px_rgba(15,23,42,0.45)] backdrop-blur-3xl md:p-12">
        <div className="flex flex-col gap-10 md:grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:gap-16">
          <div className="flex flex-col justify-between gap-10">
            <div className="flex flex-col gap-6">
              {secondaryActionLabel && secondaryActionHref ? (
                <Link
                  to={secondaryActionHref}
                  className="inline-flex w-fit items-center justify-center rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white/80 transition-colors duration-200 hover:border-white/50 hover:text-white"
                >
                  {secondaryActionLabel}
                </Link>
              ) : null}

              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.4em] text-white/60">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Innerbloom
              </div>

              <div className="space-y-4">
                {typeof title === 'string' ? (
                  <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">{title}</h1>
                ) : (
                  title
                )}
                {description ? (
                  <p className="text-base text-white/70 md:text-lg">{description}</p>
                ) : null}
              </div>
            </div>

            {primaryActionLabel ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onPrimaryActionClick}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#8b5cf6] via-[#6366f1] to-[#0ea5e9] px-7 py-3 text-sm font-semibold text-white shadow-[0_12px_35px_rgba(99,102,241,0.35)] transition-transform duration-200 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  {primaryActionLabel}
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-center">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
