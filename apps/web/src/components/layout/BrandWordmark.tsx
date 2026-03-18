import type { HTMLAttributes } from 'react';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type BrandWordmarkProps = {
  textClassName?: string;
  iconClassName?: string;
} & HTMLAttributes<HTMLSpanElement>;

export function BrandWordmark({ className, textClassName, iconClassName, ...props }: BrandWordmarkProps) {
  return (
    <span
      className={cn('inline-flex items-center justify-center gap-2', className)}
      {...props}
    >
      <span className={cn('uppercase', textClassName)}>Innerbloom</span>
      <img
        src="/IB-COLOR-LOGO.png"
        alt="Innerbloom logo"
        className={cn('h-[1.9em] w-auto', iconClassName)}
      />
    </span>
  );
}
