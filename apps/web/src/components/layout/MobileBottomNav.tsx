import { cloneElement, isValidElement, type ReactElement, type SVGProps } from 'react';
import { NavLink } from 'react-router-dom';

export interface MobileBottomNavItem {
  key: string;
  label: string;
  to: string;
  icon: ReactElement<SVGProps<SVGSVGElement>>;
  end?: boolean;
  onClick?: () => void;
  showPulseDot?: boolean;
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
    'group relative flex w-full flex-col items-center gap-0.5 rounded-2xl px-1.5 py-1 text-[9px] font-semibold leading-tight tracking-[0.08em] transition';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-transparent px-3 pb-1.5 md:hidden"
      aria-label="Navegación principal en vista móvil"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.56rem)' }}
    >
      <ul className="flex w-full max-w-xl items-center justify-between gap-1 rounded-[1.75rem] border border-[color:var(--glass-border)] bg-[image:var(--glass-bg)] px-2 py-1 shadow-[var(--shadow-elev-2)] backdrop-blur-2xl backdrop-saturate-150">
        {items.map((item) => (
          <li key={item.key} className="relative flex flex-1 justify-center">
            <NavLink
              to={item.to}
              end={item.end}
              onClick={() => item.onClick?.()}
              className={({ isActive }: { isActive: boolean }) =>
                combine(
                  baseItemClasses,
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-overlay-4)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-surface-muted)]',
                  isActive
                    ? 'text-[color:var(--color-text)]'
                    : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]'
                )
              }
            >
              {({ isActive }: { isActive: boolean }) => (
                <div className="relative flex flex-col items-center gap-0.5">
                  <div className="relative flex items-center justify-center">
                    <span
                      className={combine(
                        'relative z-10 flex h-7 w-7 items-center justify-center rounded-2xl text-[10px] shadow-[var(--shadow-elev-1)] transition-all duration-400 ease-out backdrop-blur-xl group-active:scale-95',
                        item.key === 'dashboard' && 'h-8 w-8',
                        isActive
                          ? 'bg-[color:var(--color-surface)] text-[color:var(--color-accent-primary)]'
                          : 'bg-[color:var(--color-overlay-1)] text-[color:var(--color-text-muted)]'
                      )}
                    >
                      <span
                        className={combine(
                          'relative flex h-full w-full items-center justify-center transition-all duration-400 ease-out',
                          isActive
                            ? 'text-[color:var(--color-accent-primary)]'
                            : 'text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-text)]'
                        )}
                      >
                        {isValidElement<SVGProps<SVGSVGElement>>(item.icon)
                          ? cloneElement<SVGProps<SVGSVGElement>>(item.icon, {
                              className: combine(
                                item.icon.props.className,
                                'stroke-[1.75] transition-all duration-300',
                                item.key === 'dashboard' ? 'h-[28px] w-[28px]' : 'h-[24px] w-[24px]'
                              ),
                              stroke: item.icon.props.stroke ?? 'currentColor',
                              'aria-hidden': true,
                            })
                          : null}
                      </span>
                    </span>
                    {item.showPulseDot ? (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute -right-1 top-0.5 z-20 h-2.5 w-2.5 rounded-full bg-violet-500"
                        style={{
                          boxShadow: '0 0 6px rgba(255,255,255,0.6), 0 0 10px rgba(139,92,246,0.8)',
                          animation: 'ibOnboardingPulse 1.4s ease-in-out infinite',
                        }}
                      />
                    ) : null}
                  </div>
                  <span
                    className={combine(
                      'font-semibold leading-tight text-[color:var(--color-text-muted)] transition-all duration-300',
                      item.key === 'dashboard' ? 'text-[10px] tracking-[0.09em]' : 'text-[9px] tracking-[0.08em]',
                      isActive
                        ? 'text-[color:var(--color-text)]'
                        : 'group-hover:text-[color:var(--color-text)]'
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
