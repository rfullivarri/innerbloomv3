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
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-transparent pb-3 md:hidden"
      aria-label="Navegación principal en vista móvil"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
    >
      <ul className="flex w-full max-w-xl items-center justify-evenly gap-1 rounded-3xl border border-white/10 bg-slate-950/80 px-3 py-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        {items.map((item) => (
          <li key={item.key} className="flex flex-1 justify-center">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                combine(
                  'group flex w-full flex-col items-center gap-1 rounded-2xl px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] transition',
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
                      'flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-base shadow-[0_1px_10px_rgba(15,23,42,0.45)] transition-all duration-300 ease-out group-active:scale-95',
                      isActive &&
                        'scale-105 border-emerald-300/60 bg-emerald-400/15 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.35)]',
                    )}
                  >
                    <span className="transition-transform duration-300 group-hover:scale-110">{item.icon}</span>
                  </span>
                  <span
                    className={combine(
                      'text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-400 transition-colors duration-300',
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
