import { useEffect, useRef } from 'react';
import type { HTMLAttributes, PropsWithChildren } from 'react';
import { attachInfoDots } from './attachInfoDots';
import type { InfoKey } from '../../content/infoTips';
import type { InfoDotPlacement } from './InfoDot';
import './InfoDot.css';

interface InfoDotTargetProps extends PropsWithChildren, HTMLAttributes<HTMLDivElement> {
  id: InfoKey;
  placement?: InfoDotPlacement;
}

function combine(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function InfoDotTarget({ id, placement, className, children, ...rest }: InfoDotTargetProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    attachInfoDots(host);
  }, [id, placement]);

  return (
    <div
      ref={hostRef}
      data-info={id}
      data-info-placement={placement}
      className={combine('info-dot-target', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
