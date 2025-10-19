import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';

export interface MobileBottomNavItem {
  key: string;
  label: string;
  to: string;
  icon: ReactNode;
  end?: boolean;
}

interface MobileBottomNavProps {
  items: MobileBottomNavItem[];
}

function combine(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function MobileBottomNav({ items }: MobileBottomNavProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-slate-950/80 backdrop-blur-xl md:hidden"
      aria-label="Navegación principal en vista móvil"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
    >
      <ul className="mx-auto flex max-w-xl items-stretch justify-evenly gap-1 px-2 py-2">
        {items.map((item) => (
          <li key={item.key} className="flex flex-1 justify-center">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                combine(
                  'group flex w-full flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition',
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={combine(
                      'flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg shadow-[0_1px_12px_rgba(15,23,42,0.55)] transition-all duration-300 ease-out group-active:scale-95',
                      isActive &&
                        'scale-105 border-emerald-300/50 bg-emerald-400/20 text-emerald-200 shadow-[0_0_25px_rgba(16,185,129,0.35)]',
                    )}
                  >
                    <span className="transition-transform duration-300 group-hover:scale-105">{item.icon}</span>
                  </span>
                  <span
                    className={combine(
                      'text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400 transition-colors duration-300',
                      isActive && 'text-white',
                    )}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
