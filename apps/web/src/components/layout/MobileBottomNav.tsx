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
      <ul
        className="flex w-full max-w-xl items-center justify-evenly gap-1 rounded-[2.75rem] border border-white/15 bg-white/10 px-3 py-2 shadow-[0_18px_40px_rgba(15,23,42,0.55)] backdrop-blur-3xl backdrop-saturate-150"
      >
        {items.map((item) => (
          <li key={item.key} className="flex flex-1 justify-center">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                combine(
                  'group flex w-full flex-col items-center gap-1 rounded-[1.75rem] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] transition',
                  isActive
                    ? 'text-white'
                    : 'text-slate-300 hover:text-white/90 hover:bg-white/10',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={combine(
                      'flex h-10 w-10 items-center justify-center rounded-[1.75rem] border border-white/15 bg-white/15 text-base shadow-[0_4px_16px_rgba(15,23,42,0.45)] transition-all duration-300 ease-out group-active:scale-95 backdrop-blur-xl',
                      isActive &&
                        'scale-105 border-emerald-300/60 bg-emerald-300/20 text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.45)]',
                    )}
                  >
                    <span className="transition-transform duration-300 group-hover:scale-110">{item.icon}</span>
                  </span>
                  <span
                    className={combine(
                      'text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-300 transition-colors duration-300',
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
