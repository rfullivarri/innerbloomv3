import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type DashboardTitleLevel = 'h1' | 'h2';

type DashboardTitleProps<T extends ElementType> = {
  level: DashboardTitleLevel;
  as?: T;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

const DASHBOARD_TITLE_BASE =
  'font-sans font-medium tracking-[0.28em] text-text';

const DASHBOARD_TITLE_LEVEL_STYLES: Record<DashboardTitleLevel, string> = {
  h1: 'text-[0.7425rem] uppercase md:text-[0.8025rem]',
  h2: 'text-[0.94rem] leading-tight tracking-[0.02em] md:text-[1rem]',
};

export function DashboardTitle<T extends ElementType = 'h3'>({
  level,
  as,
  children,
  className,
  ...props
}: DashboardTitleProps<T>) {
  const Component = as ?? ('h3' as ElementType);

  return (
    <Component
      className={cx(DASHBOARD_TITLE_BASE, DASHBOARD_TITLE_LEVEL_STYLES[level], className)}
      {...props}
    >
      {children}
    </Component>
  );
}

type DashboardMetaProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

export function DashboardMeta<T extends ElementType = 'p'>({
  as,
  children,
  className,
  ...props
}: DashboardMetaProps<T>) {
  const Component = as ?? ('p' as ElementType);

  return (
    <Component
      className={cx(
        'font-sans text-[0.72rem] font-medium leading-snug tracking-[0.01em] text-text-muted md:text-xs',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
