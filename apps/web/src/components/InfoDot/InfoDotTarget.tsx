import type { HTMLAttributes, PropsWithChildren } from 'react';
import { InfoDot } from './InfoDot';
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
  return (
    <div className={combine('info-dot-target', className)} {...rest}>
      {placement === 'left' ? <InfoDot id={id} placement={placement} /> : null}
      {children}
      {placement !== 'left' ? <InfoDot id={id} placement={placement} /> : null}
    </div>
  );
}
