import { useMemo, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

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

  const location = useLocation();
  const activeKey = useMemo(() => {
    const match = items.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
    );
    return match?.key ?? items[0].key;
  }, [items, location.pathname]);

  const baseItemClasses = 'group flex w-full flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-semibold tracking-[0.08em] uppercase transition';

  const renderParticles = activeKey
    ? [0, 1, 2].map((index) => (
        <span
          key={index}
          className={combine(
            'pointer-events-none absolute rounded-full bg-white/60 blur-[6px]',
            index === 0 && 'h-1 w-1 -left-2 top-2 animate-[pulse_2.2s_ease-in-out_infinite]',
            index === 1 && 'h-1 w-1 right-1 -top-1 animate-[pulse_2.4s_ease-in-out_infinite]',
            index === 2 && 'h-1 w-1 -right-3 top-4 animate-[pulse_2.8s_ease-in-out_infinite]'
          )}
          aria-hidden
          style={{ animationDelay: `${index * 0.35}s` }}
        />
      ))
    : null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-transparent px-4 pb-2 md:hidden"
      aria-label="Navegación principal en vista móvil"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.8rem)' }}
    >
      <ul className="flex w-full max-w-xl items-center justify-between gap-1 rounded-[2.6rem] border border-white/15 bg-white/10 px-1.5 py-1.5 shadow-[0_18px_44px_rgba(8,15,35,0.55)] backdrop-blur-2xl backdrop-saturate-150">
        {items.map((item) => (
          <li key={item.key} className="relative flex flex-1 justify-center">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }: { isActive: boolean }) =>
                combine(
                  baseItemClasses,
                  isActive
                    ? 'text-white'
                    : 'text-white/60 hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900/80'
                )
              }
            >
              {({ isActive }: { isActive: boolean }) => (
                <div className="relative flex flex-col items-center">
                  {isActive && (
                    <motion.span
                      layoutId="nav-glow"
                      className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-white/10 via-white/5 to-transparent"
                      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                      aria-hidden
                    />
                  )}
                  <span
                    className={combine(
                      'relative flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-base shadow-[0_12px_28px_rgba(15,23,42,0.38)] transition-all duration-500 ease-out backdrop-blur-xl group-active:scale-95',
                      item.key === 'dashboard' && 'h-12 w-12 text-lg',
                      isActive && 'scale-105 border-white/40 bg-gradient-to-br from-white/20 to-white/5 text-white'
                    )}
                  >
                    {isActive && (
                      <>
                        <span className="pointer-events-none absolute inset-[-18%] rounded-full bg-gradient-to-br from-cyan-400/15 via-indigo-400/12 to-fuchsia-400/10 blur-xl animate-[pulse_2.2s_ease-in-out_infinite]" aria-hidden />
                        {renderParticles}
                      </>
                    )}
                    <span
                      className={combine(
                        'transition-all duration-400 ease-out',
                        isActive ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-indigo-200 to-fuchsia-200 scale-110 drop-shadow-[0_0_12px_rgba(99,102,241,0.4)]' : 'text-white/70 group-hover:text-white'
                      )}
                    >
                      {item.icon}
                    </span>
                  </span>
                  <span
                    className={combine(
                      'mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60 transition-all duration-300',
                      item.key === 'dashboard' && 'text-[11px]',
                      isActive && 'text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-indigo-200 to-fuchsia-200 scale-105'
                    )}
                  >
                    {item.label}
                  </span>
                </div>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
