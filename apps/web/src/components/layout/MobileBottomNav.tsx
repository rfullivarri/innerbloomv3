import {
  cloneElement,
  isValidElement,
  useId,
  useMemo,
  type ReactElement,
  type SVGProps,
} from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

export interface MobileBottomNavItem {
  key: string;
  label: string;
  to: string;
  icon: ReactElement<SVGProps<SVGSVGElement>>;
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
  const gradientId = useId();
  const activeKey = useMemo(() => {
    const match = items.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
    );
    const fallback = items.find((item) => item.key === 'dashboard');
    return match?.key ?? fallback?.key ?? items[0].key;
  }, [items, location.pathname]);

  const baseItemClasses =
    'group relative flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase transition';

  const renderParticles = activeKey
    ? [0, 1, 2].map((index) => (
        <span
          key={index}
          className={combine(
            'pointer-events-none absolute rounded-full bg-white/70 blur-[5px]',
            index === 0 && 'h-1.5 w-1.5 -left-1 top-1 animate-[pulse_2.2s_ease-in-out_infinite]',
            index === 1 && 'h-1.5 w-1.5 right-1 -top-0.5 animate-[pulse_2.5s_ease-in-out_infinite]',
            index === 2 && 'h-1.5 w-1.5 -right-2 top-3 animate-[pulse_2.8s_ease-in-out_infinite]'
          )}
          aria-hidden
          style={{ animationDelay: `${index * 0.35}s` }}
        />
      ))
    : null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-transparent px-3 pb-1.5 md:hidden"
      aria-label="Navegación principal en vista móvil"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.6rem)' }}
    >
      <svg aria-hidden className="pointer-events-none absolute h-0 w-0">
        <defs>
          <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(125 211 252)" />
            <stop offset="50%" stopColor="rgb(129 140 248)" />
            <stop offset="100%" stopColor="rgb(236 72 153)" />
          </linearGradient>
        </defs>
      </svg>
      <ul className="flex w-full max-w-xl items-center justify-between gap-0.5 rounded-[1.9rem] bg-white/10 px-2 py-1.5 shadow-[0_14px_34px_rgba(8,15,35,0.55)] backdrop-blur-2xl backdrop-saturate-150">
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
                    : 'text-white/65 hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950/70'
                )
              }
            >
              {({ isActive }: { isActive: boolean }) => (
                <div className="relative flex flex-col items-center gap-1">
                  <div className="relative flex items-center justify-center">
                    {isActive && (
                      <motion.span
                        layoutId="nav-glow"
                        className="pointer-events-none absolute -left-2 -top-2 -z-10 h-14 w-14 rounded-full bg-gradient-to-br from-white/12 via-white/8 to-transparent shadow-[0_18px_38px_rgba(59,130,246,0.4)]"
                        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                        aria-hidden
                      />
                    )}
                    <span
                      className={combine(
                        'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-white/[0.08] text-xs shadow-[0_12px_24px_rgba(15,23,42,0.34)] transition-all duration-500 ease-out backdrop-blur-xl group-active:scale-95',
                        item.key === 'dashboard' && 'h-11 w-11 text-sm',
                        isActive &&
                          'scale-105 border-white/45 bg-gradient-to-br from-white/16 to-white/6 text-white shadow-[0_0_0_10px_rgba(59,130,246,0.12),0_18px_32px_rgba(14,22,45,0.55)]',
                        !isActive && 'opacity-80'
                      )}
                    >
                      {isActive && (
                        <>
                          <span className="pointer-events-none absolute inset-[-22%] rounded-full bg-gradient-to-br from-cyan-400/18 via-indigo-400/14 to-fuchsia-400/12 blur-xl animate-[pulse_2.2s_ease-in-out_infinite]" aria-hidden />
                          {renderParticles}
                        </>
                      )}
                      <span
                        className={combine(
                          'relative flex h-full w-full items-center justify-center transition-all duration-400 ease-out',
                          isActive
                            ? 'text-white drop-shadow-[0_0_12px_rgba(99,102,241,0.55)]'
                            : 'text-white/45 group-hover:text-white/80'
                        )}
                      >
                        {isValidElement<SVGProps<SVGSVGElement>>(item.icon)
                          ? cloneElement<SVGProps<SVGSVGElement>>(item.icon, {
                              className: combine(
                                'h-full w-full stroke-[1.85] transition-all duration-300',
                                item.icon.props.className,
                                isActive ? 'animate-[pulse_2.2s_ease-in-out_infinite]' : ''
                              ),
                              stroke: isActive ? `url(#${gradientId})` : item.icon.props.stroke ?? 'currentColor',
                              'aria-hidden': true,
                            })
                          : null}
                        {isActive && (
                          <span className="pointer-events-none absolute inset-[6%] -z-10 rounded-full bg-gradient-to-r from-cyan-300/30 via-indigo-200/25 to-fuchsia-200/25 blur-md" aria-hidden />
                        )}
                      </span>
                    </span>
                  </div>
                  <span
                    className={combine(
                      'text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/55 transition-all duration-300',
                      item.key === 'dashboard' && 'text-[10px]',
                      isActive &&
                        'text-transparent bg-clip-text bg-gradient-to-r from-sky-200 via-indigo-200 to-fuchsia-200 scale-105 drop-shadow-[0_0_8px_rgba(59,130,246,0.35)]'
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
