import { cloneElement, isValidElement, type ReactElement, type SVGProps } from 'react';
import { NavLink } from 'react-router-dom';

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

  const baseItemClasses =
    'group relative flex w-full flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[4.5px] font-semibold leading-tight tracking-[0.08em] uppercase transition';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-transparent px-3 pb-1.5 md:hidden"
      aria-label="Navegación principal en vista móvil"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.56rem)' }}
    >
      <ul className="flex w-full max-w-xl items-center justify-between gap-1 rounded-[1.75rem] bg-white/12 px-2 py-1 shadow-[0_12px_26px_rgba(8,15,35,0.52)] backdrop-blur-2xl backdrop-saturate-150">
        {items.map((item) => (
          <li key={item.key} className="relative flex flex-1 justify-center">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }: { isActive: boolean }) =>
                combine(
                  baseItemClasses,
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/65 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950/70',
                  isActive
                    ? 'text-white'
                    : 'text-white/60 hover:text-white/85'
                )
              }
            >
              {({ isActive }: { isActive: boolean }) => (
                <div className="relative flex flex-col items-center gap-1">
                  <div className="relative flex items-center justify-center">
                    <span
                      className={combine(
                        'relative z-10 flex h-7 w-7 items-center justify-center rounded-2xl text-[10px] shadow-[0_8px_18px_rgba(10,16,35,0.35)] transition-all duration-400 ease-out backdrop-blur-xl group-active:scale-95',
                        item.key === 'dashboard' && 'h-8 w-8',
                        isActive
                          ? 'bg-white/15 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.28)]'
                          : 'bg-white/8 text-white/55'
                      )}
                    >
                      <span
                        className={combine(
                          'relative flex h-full w-full items-center justify-center transition-all duration-400 ease-out',
                          isActive
                            ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]'
                            : 'text-white/60 group-hover:text-white/85'
                        )}
                      >
                        {isValidElement<SVGProps<SVGSVGElement>>(item.icon)
                          ? cloneElement<SVGProps<SVGSVGElement>>(item.icon, {
                              className: combine(
                                item.icon.props.className,
                                'stroke-[1.75] transition-all duration-300',
                                item.key === 'dashboard' ? 'h-5 w-5' : 'h-4 w-4'
                              ),
                              stroke: item.icon.props.stroke ?? 'currentColor',
                              'aria-hidden': true,
                            })
                          : null}
                      </span>
                    </span>
                  </div>
                  <span
                    className={combine(
                      'text-[4.5px] font-semibold uppercase leading-tight tracking-[0.1em] text-white/60 transition-all duration-300',
                      item.key === 'dashboard' && 'text-[4.75px]',
                      isActive && 'text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.22)]'
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
