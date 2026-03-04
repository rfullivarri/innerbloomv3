import { forwardRef, useId } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { DashboardMeta, DashboardTitle } from '../dashboard-v3/DashboardTypography';

function normalizeDashboardTitle(title: ReactNode): ReactNode {
  if (typeof title !== 'string') {
    return title;
  }

  return title
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .trim()
    .toLocaleUpperCase('es-AR');
}

function isPrimitiveText(value: ReactNode): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  rightSlot?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  variant?: 'default' | 'plain';
}

function combine(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  {
    title,
    subtitle,
    rightSlot,
    children,
    className,
    bodyClassName,
    variant = 'default',
    ...sectionProps
  },
  ref,
) {
  const headingId = useId();
  const labelledBy = title ? `${headingId}-title` : undefined;
  const normalizedTitle = normalizeDashboardTitle(title);

  return (
    <section
      ref={ref}
      role="region"
      aria-labelledby={labelledBy}
      className={combine(
        'relative overflow-hidden rounded-ib-lg border border-[color:var(--color-border-subtle)]',
        variant === 'default' &&
          'bg-[image:var(--color-card-gradient)] backdrop-blur-md shadow-[var(--color-card-shadow)]',
        className,
      )}
      {...sectionProps}
    >
      <div
        className={combine(
          'relative z-10 flex flex-col gap-4 p-1.5 text-text md:p-2 lg:p-2.5',
          bodyClassName,
        )}
      >
        {(title || subtitle || rightSlot) && (
          <header className="flex flex-wrap items-center justify-between gap-3 pl-1.5 pt-1.5 md:pl-0 md:pt-0">
            <div className="space-y-1">
              {title && (
                <DashboardTitle
                  level="h1"
                  as="h3"
                  id={labelledBy}
                >
                  {normalizedTitle}
                </DashboardTitle>
              )}
              {subtitle &&
                (isPrimitiveText(subtitle) ? <DashboardMeta>{subtitle}</DashboardMeta> : subtitle)}
            </div>
            {rightSlot}
          </header>
        )}
        <div className="flex flex-col gap-4 text-sm leading-relaxed text-text-muted">{children}</div>
      </div>
    </section>
  );
});

interface CardSectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  bodyClassName?: string;
  variant?: CardProps['variant'];
}

export const CardSection = forwardRef<HTMLElement, CardSectionProps>(function CardSection(
  { children, className, bodyClassName, variant, ...props },
  ref,
) {
  return (
    <Card
      ref={ref}
      className={className}
      bodyClassName={bodyClassName}
      variant={variant}
      {...props}
    >
      {children}
    </Card>
  );
});
