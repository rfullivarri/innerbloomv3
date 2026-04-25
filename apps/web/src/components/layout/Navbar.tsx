import { useAuth, useUser } from '../../auth/runtimeAuth';
import { type ReactNode, type RefObject } from 'react';
import { NavLink } from 'react-router-dom';

export interface NavbarSection {
  key: string;
  label: string;
  to: string;
  end?: boolean;
  showPulseDot?: boolean;
}

type NavbarProps = {
  onDailyClick?: () => void;
  onSectionClick?: (section: NavbarSection) => void;
  dailyButtonRef?: RefObject<HTMLButtonElement | null>;
  title?: string;
  sections?: NavbarSection[];
  menuSlot?: ReactNode;
  planSlot?: ReactNode;
};

function combine(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function Navbar({ onDailyClick, onSectionClick, dailyButtonRef, title, sections, menuSlot, planSlot }: NavbarProps) {
  const { userId } = useAuth();
  const { user } = useUser();

  const fallbackId = userId == null ? '' : typeof userId === 'string' ? userId : String(userId);
  const displayName =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    (fallbackId ? fallbackId.slice(0, 8) : '');

  const resolvedTitle = title ?? 'Dashboard';
  const hasSections = Boolean(sections && sections.length > 0);

  return (
    <header className="ib-premium-nav sticky top-0 z-40 pt-[calc(env(safe-area-inset-top,0px)+0.65rem)]">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-4 md:flex-nowrap md:px-8 md:py-4">
        <div className="flex flex-1 min-w-0 flex-wrap items-center justify-start gap-x-2 gap-y-1 text-left sm:gap-x-3 md:flex-row">
          <div className="min-w-0">
            <p className="text-[0.62rem] uppercase tracking-[0.3em] text-[color:var(--color-text-subtle)] md:text-xs">
              Innerbloom
            </p>
            <h1 className="font-display text-[1.05rem] font-semibold text-[color:var(--color-text)] md:text-xl lg:text-2xl">
              {resolvedTitle}
            </h1>
          </div>
        </div>
        {hasSections ? (
          <nav
            aria-label="Navegación principal en vista desktop"
            className="hidden flex-1 justify-center gap-1.5 md:flex lg:gap-2"
          >
            {sections?.map((section) => (
              <NavLink
                key={section.key}
                to={section.to}
                end={section.end}
                onClick={() => {
                  onSectionClick?.(section);
                  if (section.key === 'dquest' && onDailyClick) {
                    onDailyClick();
                  }
                }}
                className={({ isActive }: { isActive: boolean }) =>
                  combine(
                    'ib-premium-pill relative inline-flex items-center whitespace-nowrap px-3 py-1.5 text-[9px] font-semibold tracking-[0.24em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-overlay-4)]',
                    isActive
                      ? 'ib-premium-pill-active text-[color:var(--color-accent-primary)]'
                      : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]',
                  )
                }
              >
                {section.label}
                {section.showPulseDot ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-1.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-[color:var(--color-accent-secondary)]"
                    style={{
                      boxShadow: '0 0 0 3px color-mix(in srgb,var(--color-accent-secondary) 22%, transparent), 0 0 12px color-mix(in srgb,var(--color-accent-secondary) 88%, transparent), 0 0 20px color-mix(in srgb,var(--color-accent-secondary) 48%, transparent)',
                      animation: 'ibOnboardingPulse 1.2s ease-in-out infinite',
                    }}
                  />
                ) : null}
              </NavLink>
            ))}
          </nav>
        ) : (
          <div className="hidden flex-1 md:flex" aria-hidden="true" />
        )}
        <div className="ml-auto flex items-center gap-2 sm:gap-3 md:hidden">
          {planSlot}
          {menuSlot}
        </div>
        <div className="hidden flex-1 items-center justify-end gap-2 sm:gap-3 md:flex">
          {menuSlot}
          {planSlot}
          {displayName && (
            <span className="ib-premium-pill ib-premium-muted hidden px-3 py-1 text-xs md:inline-flex">
              {displayName}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
