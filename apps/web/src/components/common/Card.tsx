import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, subtitle, action, children, className = '' }: CardProps) {
  return (
    <section className={`glass-card flex flex-col gap-4 rounded-2xl p-6 shadow-glow transition hover:border-white/10 ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="font-display text-lg font-semibold text-white md:text-xl">{title}</h2>}
            {subtitle && <p className="text-sm text-text-subtle">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className="flex-1 text-sm text-text-muted">{children}</div>
    </section>
  );
}
