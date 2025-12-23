import { motion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef, type ReactNode } from 'react';

type MotionButtonProps = HTMLMotionProps<'button'>;

interface CardProps extends Omit<MotionButtonProps, 'children'> {
  children: ReactNode;
  active?: boolean;
  subtitle?: string;
}

export const Card = forwardRef<HTMLButtonElement, CardProps>(function Card(
  { children, className, active = false, subtitle, type = 'button', ...rest },
  ref,
) {
  const classes = [
    'glass-card relative flex h-full flex-col gap-2 rounded-3xl px-5 py-6 text-left transition',
    active
      ? 'border-sky-400/60 shadow-lg shadow-white/25 ring-2 ring-sky-400/50'
      : 'border-white/5 hover:border-white/20 hover:shadow-[0_18px_40px_rgba(255,255,255,0.08)]',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={{ scale: 0.98 }}
      className={classes}
      {...rest}
    >
      <span className="text-base font-semibold text-white">{children}</span>
      {subtitle ? <span className="text-sm text-white/70">{subtitle}</span> : null}
      {active ? (
        <span className="absolute right-4 top-4 inline-flex items-center rounded-full bg-emerald-500/90 px-2 py-0.5 text-xs font-semibold text-white">
          Seleccionado
        </span>
      ) : null}
    </motion.button>
  );
});
