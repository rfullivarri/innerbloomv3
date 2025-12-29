import type { CSSProperties, ReactNode } from 'react';

interface AuroraBackgroundProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
  speed?: number;
}

function combine(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function AuroraBackground({ children, className, intensity, speed }: AuroraBackgroundProps) {
  const style: CSSProperties = {
    ...(intensity !== undefined ? { ['--aurora-intensity' as string]: intensity } : {}),
    ...(speed !== undefined ? { ['--aurora-speed' as string]: `${speed}s` } : {})
  };

  return (
    <div className={combine('aurora-background', className)} style={style}>
      <div className="aurora-surface" aria-hidden="true">
        <div className="aurora-gradient aurora-gradient--back" />
        <div className="aurora-gradient aurora-gradient--mid" />
        <div className="aurora-gradient aurora-gradient--front" />
        <div className="aurora-noise" />
      </div>
      <div className="aurora-content">{children}</div>
    </div>
  );
}
