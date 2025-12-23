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
  to?: string;
  icon: ReactElement<SVGProps<SVGSVGElement>>;
  end?: boolean;
  onClick?: () => void;
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
    const itemsWithPath = items.filter((item) => item.to);
    const match = itemsWithPath.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to!),
    );
    const fallback = itemsWithPath.find((item) => item.key === 'dashboard') ?? itemsWithPath[0];
    return match?.key ?? fallback?.key ?? items[0]?.key ?? '';
  }, [items, location.pathname]);

  const baseItemClasses =
    'group relative flex w-full flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase transition';

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
      <ul className="flex w-full max-w-xl items-center justify-between gap-1 rounded-[1.9rem] border border-white/16 bg-white/10 px-2 py-1.5 shadow-[0_14px_34px_rgba(8,15,35,0.55)] backdrop-blur-2xl backdrop-saturate-150">
        {items.map((item) => {
          const isAction = typeof item.onClick === 'function' || !item.to;
          const itemContent = (isActive: boolean) => (
            <div className="relative flex flex-col items-center">
              {isActive && (
                <motion.span
                  layoutId="nav-glow"
                  className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-white/12 via-white/8 to-transparent shadow-[0_10px_28px_rgba(59,130,246,0.35)]"
                  transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                  aria-hidden
                />
              )}
              <span
                className={combine(
                  'relative z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/18 bg-white/12 text-sm shadow-[0_10px_22px_rgba(15,23,42,0.34)] transition-all duration-500 ease-out backdrop-blur-xl group-active:scale-95',
                  item.key === 'dashboard' && 'h-10 w-10 text-base',
                  isActive &&
                    'scale-105 border-white/40 bg-gradient-to-br from-white/14 to-white/5 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_16px_30px_rgba(59,130,246,0.32)]'
                )}
              >
                {isActive && (
                  <>
                    <span className="pointer-events-none absolute inset-[-28%] rounded-full bg-gradient-to-br from-cyan-400/20 via-indigo-400/16 to-fuchsia-400/14 blur-xl animate-[pulse_2.2s_ease-in-out_infinite]" aria-hidden />
                    {renderParticles}
                  </>
                )}
                <span
                  className={combine(
                    'relative transition-all duration-400 ease-out',
                    isActive
                      ? 'text-white drop-shadow-[0_0_12px_rgba(99,102,241,0.55)]'
                      : 'text-white/70 group-hover:text-white'
                  )}
                >
                  {isValidElement<SVGProps<SVGSVGElement>>(item.icon)
                    ? cloneElement<SVGProps<SVGSVGElement>>(item.icon, {
                        className: combine(
                          'h-[19px] w-[19px] stroke-[1.9] transition-all duration-300',
                          item.icon.props.className,
                          isActive ? 'animate-[pulse_2.2s_ease-in-out_infinite]' : ''
                        ),
                        stroke: isActive ? `url(#${gradientId})` : item.icon.props.stroke,
                        'aria-hidden': true,
                      })
                    : null}
                  {isActive && (
                    <span className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-gradient-to-r from-cyan-300/30 via-indigo-200/25 to-fuchsia-200/25 blur-lg" aria-hidden />
                  )}
                </span>
              </span>
              <span
                className={combine(
                  'mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60 transition-all duration-300',
                  item.key === 'dashboard' && 'text-[10.5px]',
                  isActive &&
                    'text-transparent bg-clip-text bg-gradient-to-r from-sky-200 via-indigo-200 to-fuchsia-200 scale-105 drop-shadow-[0_0_8px_rgba(59,130,246,0.35)]'
                )}
              >
                {item.label}
              </span>
            </div>
          );

          if (isAction) {
            return (
              <li key={item.key} className="relative flex flex-1 justify-center">
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    item.onClick?.();
                  }}
                  className={combine(
                    baseItemClasses,
                    'text-white/70 hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950/70',
                  )}
                >
                  {itemContent(false)}
                </button>
              </li>
            );
          }

          return (
            <li key={item.key} className="relative flex flex-1 justify-center">
              <NavLink
                to={item.to ?? '#'}
                end={item.end}
                className={({ isActive }: { isActive: boolean }) =>
                  combine(
                    baseItemClasses,
                    isActive
                      ? 'text-white'
                      : 'text-white/70 hover:text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950/70'
                  )
                }
              >
                {({ isActive }: { isActive: boolean }) => itemContent(isActive)}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
