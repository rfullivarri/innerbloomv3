import { Link, NavLink } from 'react-router-dom';
import { useId, type CSSProperties, type ReactNode } from 'react';
import { mobilePremiumThemeVars, type MobilePremiumTheme } from './mobilePremiumTokens';
import { TraitIcon } from './traitIconRegistry';

type Tone = 'neutral' | 'violet' | 'green' | 'amber' | 'red';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const toneClass: Record<Tone, string> = {
  neutral: 'border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] text-[color:var(--mp-text-secondary)]',
  violet: 'border-[color:var(--mp-violet)] bg-[color:var(--mp-toggle-active-bg)] text-[color:var(--mp-violet-strong)]',
  green: 'border-[color:var(--mp-green)] bg-[color:var(--mp-surface)] text-[color:var(--mp-green)]',
  amber: 'border-[color:var(--mp-amber)] bg-[color:var(--mp-surface)] text-[color:var(--mp-amber)]',
  red: 'border-[color:var(--mp-red)] bg-[color:var(--mp-surface)] text-[color:var(--mp-red)]',
};

export function InnerbloomFlowerMark({ className = 'h-7 w-7' }: { className?: string }) {
  const gradientId = useId();
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 64 48">
      <defs>
        <linearGradient id={gradientId} x1="10" x2="54" y1="42" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="0.52" stopColor="#A78BFA" />
          <stop offset="1" stopColor="#C4B5FD" />
        </linearGradient>
      </defs>
      <path
        d="M31.9 42.2c-6.9-6-10.1-13-9.3-20.9.6-6.2 3.8-12.2 9.3-18 5.5 5.8 8.7 11.8 9.3 18 .8 7.9-2.4 14.9-9.3 20.9Z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M29.3 43.6c-8 .4-14.5-1.8-19.3-6.7C6.4 33.2 4.2 28.2 3.5 22c7.5.3 13.7 2.7 18.4 7.2 3.9 3.8 6.4 8.6 7.4 14.4Z"
        fill={`url(#${gradientId})`}
        opacity="0.9"
      />
      <path
        d="M34.7 43.6c8 .4 14.5-1.8 19.3-6.7 3.6-3.7 5.8-8.7 6.5-14.9-7.5.3-13.7 2.7-18.4 7.2-3.9 3.8-6.4 8.6-7.4 14.4Z"
        fill={`url(#${gradientId})`}
        opacity="0.9"
      />
      <path
        d="M23.4 44.2c-7.2-.4-12.9-2.8-17.1-7.1C3.2 33.9 1.3 29.8.5 24.9c5.3.8 9.9 2.7 13.8 5.9 4 3.3 7 7.7 9.1 13.4Z"
        fill={`url(#${gradientId})`}
        opacity="0.72"
      />
      <path
        d="M40.6 44.2c7.2-.4 12.9-2.8 17.1-7.1 3.1-3.2 5-7.3 5.8-12.2-5.3.8-9.9 2.7-13.8 5.9-4 3.3-7 7.7-9.1 13.4Z"
        fill={`url(#${gradientId})`}
        opacity="0.72"
      />
    </svg>
  );
}

export function InnerbloomBrand({
  className,
  markClassName = 'h-7 w-7',
  style,
  textClassName,
}: {
  className?: string;
  markClassName?: string;
  style?: CSSProperties;
  textClassName?: string;
}) {
  return (
    <span className={cx('inline-flex min-w-0 items-center gap-2', className)} style={style}>
      <InnerbloomFlowerMark className={cx('shrink-0', markClassName)} />
      <span className={cx('truncate text-[11px] font-semibold uppercase tracking-[0.22em]', textClassName ?? 'text-[color:var(--mp-text-secondary)]')}>
        Innerbloom
      </span>
    </span>
  );
}

export type PremiumNavItem = {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  active?: boolean;
  onboardingCue?: boolean;
};

export function PremiumChip({
  children,
  active = false,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex min-h-9 items-center justify-center rounded-full border px-3.5 text-xs font-semibold tracking-normal',
        active
          ? 'border-[color:var(--mp-border-strong)] bg-[color:var(--mp-surface-strong)] text-[color:var(--mp-text)]'
          : 'border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] text-[color:var(--mp-text-secondary)]',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SemanticChip({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span className={cx('inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-semibold', toneClass[tone], className)}>
      {children}
    </span>
  );
}

export function CircularCheckbox({
  checked,
  label,
  tone = 'green',
}: {
  checked: boolean;
  label?: string;
  tone?: Extract<Tone, 'green' | 'amber' | 'red' | 'violet'>;
}) {
  const color = tone === 'green' ? 'var(--mp-green)' : tone === 'amber' ? 'var(--mp-amber)' : tone === 'red' ? 'var(--mp-red)' : 'var(--mp-violet)';
  return (
    <span
      aria-label={label}
      aria-checked={checked}
      role="checkbox"
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[color:var(--mp-border-strong)] bg-[color:var(--mp-surface)]"
      style={checked ? { borderColor: color, color } : undefined}
    >
      {checked ? (
        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16">
          <path d="m3.5 8.2 2.8 2.7 6.2-6.4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      ) : (
        <span className="h-2 w-2 rounded-full bg-[color:var(--mp-text-muted)]" />
      )}
    </span>
  );
}

export function CompactMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-[color:var(--mp-text-muted)]">{label}</p>
      <p className="mt-1 text-[1.35rem] font-semibold leading-none text-[color:var(--mp-text)]">{value}</p>
      {detail ? <p className="mt-1 truncate text-[11px] text-[color:var(--mp-text-secondary)]">{detail}</p> : null}
    </div>
  );
}

export function ThinSeparator({ className }: { className?: string }) {
  return <div className={cx('h-px w-full bg-[color:var(--mp-border)]', className)} />;
}

export function MobileSectionHeader({
  eyebrow,
  title,
  action,
  to,
}: {
  eyebrow?: string;
  title: string;
  action?: string;
  to?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--mp-text-muted)]">{eyebrow}</p> : null}
        <h2 className="mt-1 text-xl font-semibold leading-tight text-[color:var(--mp-text)]">{title}</h2>
      </div>
      {action && to ? (
        <Link className="shrink-0 text-xs font-semibold text-[color:var(--mp-violet)]" to={to}>
          {action}
        </Link>
      ) : null}
    </div>
  );
}

export function PremiumBottomNav({ items }: { items: PremiumNavItem[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[430px] border-t border-[color:var(--mp-border)] bg-[color:var(--mp-nav-bg)] px-4 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5 shadow-[var(--mp-nav-shadow)] backdrop-blur-2xl">
      <style>{`
        @keyframes mpOnboardingNavCue {
          0%, 100% { transform: scale(1); opacity: .72; box-shadow: 0 0 0 0 rgba(139, 92, 246, .34); }
          50% { transform: scale(1.18); opacity: 1; box-shadow: 0 0 0 8px rgba(139, 92, 246, 0); }
        }
        .mp-onboarding-nav-cue { animation: mpOnboardingNavCue 1.65s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .mp-onboarding-nav-cue { animation: none !important; } }
      `}</style>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cx(
                'grid min-h-[50px] place-items-center rounded-[1.15rem] text-[10px] font-semibold transition',
                item.active ?? isActive
                  ? 'bg-[color:var(--mp-surface-strong)] text-[color:var(--mp-text)]'
                  : 'text-[color:var(--mp-text-muted)]',
              )
            }
          >
            <span className="relative grid h-5 place-items-center">
              {item.icon}
              {item.onboardingCue ? (
                <span
                  aria-label="Siguiente paso del onboarding"
                  className="mp-onboarding-nav-cue absolute -right-2.5 -top-2.5 h-2.5 w-2.5 rounded-full bg-[color:var(--mp-violet)]"
                />
              ) : null}
            </span>
            <span className="mt-0.5">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function WeekBarsCompact({
  values,
}: {
  values: number[];
}) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-16 items-end gap-1.5">
      {values.map((value, index) => (
        <span
          aria-hidden="true"
          className="flex-1 rounded-full bg-violet-200/70"
          key={`${value}-${index}`}
          style={{ height: `${Math.max(18, (value / max) * 100)}%`, opacity: 0.36 + (value / max) * 0.5 }}
        />
      ))}
    </div>
  );
}

export function WeeklyProgressRingCompact({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  const normalized = Math.max(0, Math.min(100, value));
  return (
    <div
      className="grid h-16 w-16 place-items-center rounded-full"
      style={{ background: `conic-gradient(var(--mp-violet) ${normalized}%, var(--mp-track) 0)` }}
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-[color:var(--mp-bg)] text-center">
        <span className="text-sm font-semibold text-[color:var(--mp-text)]">{Math.round(normalized)}%</span>
        {label ? <span className="-mt-1 text-[8px] text-[color:var(--mp-text-muted)]">{label}</span> : null}
      </div>
    </div>
  );
}

export function MobilePremiumHeader({
  title,
  onMenuOpen,
}: {
  title: string;
  eyebrow?: string;
  status?: string;
  theme: MobilePremiumTheme;
  onThemeToggle: () => void;
  onMenuOpen?: () => void;
}) {
  return (
    <header className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Link to="/labs" className="flex min-w-0 items-center gap-2">
          <InnerbloomBrand />
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <button
            aria-label="Abrir menú"
            className="grid h-10 w-10 place-items-center rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] text-[color:var(--mp-text)]"
            onClick={onMenuOpen}
            type="button"
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24">
              <path d="M6 8h12M6 12h12M6 16h12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            </svg>
          </button>
        </div>
      </div>
      <h1 className="text-[1.85rem] font-semibold leading-[1.04] text-[color:var(--mp-text)]">{title}</h1>
    </header>
  );
}

export function MobilePremiumShell({
  children,
  title,
  eyebrow,
  status,
  navItems,
  theme,
  onThemeToggle,
  onMenuOpen,
}: {
  children: ReactNode;
  title: string;
  eyebrow?: string;
  status?: string;
  navItems: PremiumNavItem[];
  theme: MobilePremiumTheme;
  onThemeToggle: () => void;
  onMenuOpen?: () => void;
}) {
  return (
    <main className="min-h-screen bg-[color:var(--mp-app-bg)] text-[color:var(--mp-text)]" data-mp-theme={theme} style={mobilePremiumThemeVars[theme]}>
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[image:var(--mp-shell-bg)]">
        <div className="min-h-screen px-5 pb-[calc(78px+env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))]">
          <MobilePremiumHeader eyebrow={eyebrow} onMenuOpen={onMenuOpen} onThemeToggle={onThemeToggle} status={status} theme={theme} title={title} />
          <ThinSeparator className="my-5" />
          {children}
        </div>
        <PremiumBottomNav items={navItems} />
      </div>
    </main>
  );
}

export { TraitIcon };
