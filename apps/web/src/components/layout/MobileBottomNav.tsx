import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type SVGProps,
} from "react";
import { NavLink } from "react-router-dom";

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
  return classes.filter(Boolean).join(" ");
}

export function MobileBottomNav({ items }: MobileBottomNavProps) {
  if (!items || items.length === 0) {
    return null;
  }

  const baseItemClasses =
    "group relative flex w-full flex-col items-center gap-0.5 rounded-2xl px-1.5 py-1 text-[9px] font-semibold leading-tight tracking-[0.08em] transition";

  return (
    <nav
      className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 flex justify-center bg-transparent px-3 pb-1.5 md:hidden"
      aria-label="Navegación principal en vista móvil"
      style={{
        paddingBottom:
          "var(--mobile-bottom-nav-padding-bottom, calc(env(safe-area-inset-bottom, 0px) + 0.56rem))",
        transform: "var(--mobile-bottom-nav-transform, none)",
      }}
    >
      <ul className="ib-premium-nav flex w-full max-w-xl items-center justify-between gap-1 rounded-[1.75rem] px-2 py-1">
        {items.map((item) => (
          <li key={item.key} className="relative flex flex-1 justify-center">
            <NavLink
              to={item.to}
              end={item.end}
              onClick={() => item.onClick?.()}
              className={({ isActive }: { isActive: boolean }) =>
                combine(
                  baseItemClasses,
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-overlay-4)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-surface-muted)]",
                  isActive
                    ? "text-[color:var(--color-text)]"
                    : "text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]",
                )
              }
            >
              {({ isActive }: { isActive: boolean }) => {
                const isDashboard = item.key === "dashboard";
                const resolvedIcon = isValidElement<SVGProps<SVGSVGElement>>(item.icon)
                  ? cloneElement<SVGProps<SVGSVGElement>>(item.icon, {
                      className: combine(
                        item.icon.props.className,
                        "transition-all duration-300",
                        isDashboard ? "h-[26px] w-[26px]" : "h-[24px] w-[24px]",
                      ),
                      strokeWidth: isDashboard ? 2.5 : 2,
                      strokeLinecap: isDashboard ? "round" : item.icon.props.strokeLinecap,
                      strokeLinejoin: isDashboard ? "round" : item.icon.props.strokeLinejoin,
                      stroke: "currentColor",
                      fill: "none",
                      opacity: isActive ? 1 : isDashboard ? 0.88 : 0.85,
                      "aria-hidden": true,
                    })
                  : null;

                return (
                  <div className="relative flex flex-col items-center gap-0.5">
                    <div className="relative flex items-center justify-center">
                      <span
                        className={combine(
                          "relative z-10 flex h-7 w-7 items-center justify-center rounded-2xl text-[10px] shadow-[var(--shadow-elev-1)] transition-all duration-400 ease-out group-active:scale-95",
                          isDashboard ? "h-8 w-8 rounded-full" : null,
                          "ib-premium-card-soft",
                          isDashboard
                            ? isActive
                              ? "ib-premium-pill-active text-[color:color-mix(in_srgb,var(--color-accent-primary)_72%,var(--color-text)_28%)]"
                              : "bg-transparent text-[color:color-mix(in_srgb,var(--color-text-muted)_86%,transparent)] shadow-none"
                            : isActive
                              ? "ib-premium-pill-active text-[color:color-mix(in_srgb,var(--color-accent-primary)_76%,var(--color-text)_24%)]"
                              : "text-[color:var(--color-text-muted)]",
                        )}
                      >
                        <span
                          className={combine(
                            "relative flex h-full w-full items-center justify-center transition-all duration-400 ease-out",
                            isDashboard
                              ? isActive
                                ? "text-[color:color-mix(in_srgb,var(--color-accent-primary)_72%,var(--color-text)_28%)] dark:text-[color:color-mix(in_srgb,#ffffff_86%,var(--color-accent-secondary)_14%)]"
                                : "text-[color:color-mix(in_srgb,var(--color-text-muted)_92%,transparent)] dark:text-[color:color-mix(in_srgb,var(--color-text-muted)_86%,transparent)]"
                              : isActive
                                ? "text-[color:color-mix(in_srgb,var(--color-accent-primary)_76%,var(--color-text)_24%)] dark:text-[color:color-mix(in_srgb,#ffffff_84%,var(--color-accent-primary)_16%)]"
                                : "text-[color:var(--color-text-muted)] group-hover:text-[color:var(--color-text)]",
                          )}
                        >
                          {resolvedIcon}
                        </span>
                      </span>
                      {item.showPulseDot ? (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute -right-2 -top-0.5 z-20 h-4 w-4 rounded-full bg-[color:var(--color-accent-secondary)]"
                          style={{
                            boxShadow:
                              "0 0 0 3px color-mix(in srgb,var(--color-accent-secondary) 22%, transparent), 0 0 12px color-mix(in srgb,var(--color-accent-secondary) 88%, transparent), 0 0 20px color-mix(in srgb,var(--color-accent-secondary) 48%, transparent)",
                            animation:
                              "ibOnboardingPulse 1.2s ease-in-out infinite",
                          }}
                        />
                      ) : null}
                    </div>
                    <span
                      className={combine(
                        "font-semibold leading-tight text-[color:var(--color-text-muted)] transition-all duration-300",
                        item.key === "dashboard"
                          ? "text-[10px] tracking-[0.09em]"
                          : "text-[9px] tracking-[0.08em]",
                        isActive
                          ? "text-[color:var(--color-text)]"
                          : "group-hover:text-[color:var(--color-text)]",
                      )}
                    >
                      {item.label}
                    </span>
                  </div>
                );
              }}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
