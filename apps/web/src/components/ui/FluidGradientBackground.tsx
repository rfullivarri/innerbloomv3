import type { ReactNode } from 'react';
import './FluidGradientBackground.css';

interface FluidGradientBackgroundProps {
  children: ReactNode;
  className?: string;
}

function combine(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function FluidGradientBackground({ children, className }: FluidGradientBackgroundProps) {
  return (
    <div className={combine('fluid-gradient', className)}>
      <div className="fluid-gradient__surface" aria-hidden="true">
        <span className="fluid-gradient__blob fluid-gradient__blob--one" />
        <span className="fluid-gradient__blob fluid-gradient__blob--two" />
        <span className="fluid-gradient__blob fluid-gradient__blob--three" />
        <span className="fluid-gradient__blob fluid-gradient__blob--four" />
      </div>
      <div className="fluid-gradient__content">{children}</div>
    </div>
  );
}
