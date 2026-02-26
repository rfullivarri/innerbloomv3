import { useAuth, useUser } from '@clerk/clerk-react';
import { type ReactNode, type RefObject } from 'react';
import { NavLink } from 'react-router-dom';

export interface NavbarSection {
  key: string;
  label: string;
  to: string;
  end?: boolean;
}

type NavbarProps = {
  onDailyClick?: () => void;
  dailyButtonRef?: RefObject<HTMLButtonElement | null>;
  title?: string;
  sections?: NavbarSection[];
  menuSlot?: ReactNode;
  planSlot?: ReactNode;
};

function combine(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function Navbar({ onDailyClick, dailyButtonRef, title, sections, menuSlot, planSlot }: NavbarProps) {
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
    <header className="sticky top-0 z-40 border-b border-white/5 bg-surface/60 backdrop-blur-xl">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-3 sm:px-4 md:flex-nowrap md:px-8 md:py-4">
        <div className="flex flex-1 min-w-0 flex-wrap items-center justify-start gap-x-2 gap-y-1 text-left sm:gap-x-3 md:flex-row">
          <div className="min-w-0">
            <p className="text-[0.6rem] uppercase tracking-[0.35em] text-text-muted md:text-xs">Innerbloom</p>
            <h1 className="font-display text-[1.05rem] font-semibold text-white md:text-xl lg:text-2xl">
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
                  if (section.key === 'dquest' && onDailyClick) {
                    onDailyClick();
                  }
                }}
                className={({ isActive }: { isActive: boolean }) =>
                  combine(
                    'inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.24em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                    isActive
                      ? 'border-white/40 bg-white/20 text-white shadow-[0_8px_24px_rgba(148,163,184,0.35)]'
                      : 'border-white/10 bg-white/5 text-text hover:border-white/20 hover:bg-white/10',
                  )
                }
              >
                {section.label}
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
            <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs text-text-muted md:inline-flex">
              {displayName}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
