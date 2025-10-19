import { useAuth, useUser } from '@clerk/clerk-react';
import { type RefObject } from 'react';
import { NavLink } from 'react-router-dom';

export interface NavbarSection {
  key: string;
  label: string;
  to: string;
  end?: boolean;
}

type NavbarProps = {
  onDailyClick?: () => void;
  dailyButtonRef?: RefObject<HTMLButtonElement>;
  title?: string;
  sections?: NavbarSection[];
};

function combine(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function Navbar({ onDailyClick, dailyButtonRef, title, sections }: NavbarProps) {
  const { userId, signOut } = useAuth();
  const { user } = useUser();

  const handleSignOut = async () => {
    await signOut({ redirectUrl: '/' });
  };

  const fallbackId = userId == null ? '' : typeof userId === 'string' ? userId : String(userId);
  const displayName =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    (fallbackId ? fallbackId.slice(0, 8) : '');

  const resolvedTitle = title ?? 'Dashboard';
  const hasSections = Boolean(sections && sections.length > 0);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-surface/75 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-8">
        <div className="flex flex-1 items-center gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.35em] text-text-muted">Innerbloom</p>
            <h1 className="font-display text-xl font-semibold text-white md:text-2xl">{resolvedTitle}</h1>
          </div>
          {onDailyClick && (
            <button
              ref={dailyButtonRef}
              type="button"
              onClick={onDailyClick}
              className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-white/20 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Daily
            </button>
          )}
        </div>
        {hasSections ? (
          <nav
            aria-label="Navegación principal en vista desktop"
            className="hidden flex-1 justify-center gap-2 md:flex"
          >
            {sections?.map((section) => (
              <NavLink
                key={section.key}
                to={section.to}
                end={section.end}
                className={({ isActive }) =>
                  combine(
                    'inline-flex items-center rounded-full border px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
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
        <div className="flex flex-1 items-center justify-end gap-3">
          {displayName && (
            <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs text-text-muted md:inline-flex">
              {displayName}
            </span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-text transition hover:border-white/20 hover:bg-white/10"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
