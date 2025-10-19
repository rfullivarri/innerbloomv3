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
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-transparent pb-1.5 md:hidden"
      aria-label="Navegación principal en vista móvil"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)' }}
    >
      <ul
        className="flex w-full max-w-[16rem] items-center justify-evenly gap-1 rounded-[2rem] border border-white/15 bg-white/10 px-1.5 py-1 shadow-[0_12px_28px_rgba(15,23,42,0.5)] backdrop-blur-3xl backdrop-saturate-150"
      >
        {items.map((item) => (
          <li key={item.key} className="flex flex-1 justify-center">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                combine(
                  'group flex w-full flex-col items-center gap-0.5 rounded-[1.5rem] px-1 py-0.5 text-[7px] font-semibold uppercase tracking-[0.26em] transition',
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
                      'flex h-5 w-5 items-center justify-center rounded-[1.5rem] border border-white/15 bg-white/15 text-xs shadow-[0_4px_12px_rgba(15,23,42,0.4)] transition-all duration-300 ease-out group-active:scale-95 backdrop-blur-xl',
                      isActive &&
                        'scale-105 border-emerald-300/60 bg-emerald-300/20 text-emerald-100 shadow-[0_0_14px_rgba(16,185,129,0.4)]',
                    )}
                  >
                    <span className="transition-transform duration-300 group-hover:scale-110">{item.icon}</span>
                  </span>
                  <span
                    className={combine(
                      'text-[7px] font-semibold uppercase tracking-[0.32em] text-slate-300 transition-colors duration-300',
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
