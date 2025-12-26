import { forwardRef, useId } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';

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

  return (
    <section
      ref={ref}
      role="region"
      aria-labelledby={labelledBy}
      className={combine(
        'relative overflow-hidden rounded-2xl border border-white/10',
        variant === 'default' &&
          'bg-[radial-gradient(ellipse_at_top,_rgba(35,43,76,0.35),_rgba(17,24,39,0.55))] backdrop-blur-md shadow-[0_8px_24px_rgba(0,0,0,0.35)]',
        className,
      )}
      {...sectionProps}
    >
      <div
        className={combine(
          'relative z-10 flex flex-col gap-4 p-1.5 text-slate-100 md:p-2 lg:p-2.5',
          bodyClassName,
        )}
      >
        {(title || subtitle || rightSlot) && (
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              {title && (
                <h3 id={labelledBy} className="text-base font-semibold tracking-wide text-slate-200">
                  {title}
                </h3>
              )}
              {subtitle && <div className="text-sm text-slate-400">{subtitle}</div>}
            </div>
            {rightSlot}
          </header>
        )}
        <div className="flex flex-col gap-4 text-sm leading-relaxed text-slate-200/90">{children}</div>
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
