import { createElement, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { useAdaptiveTextColor } from '../../hooks/useAdaptiveTextColor';

type AdaptiveTextTag = 'h1' | 'h2' | 'h3' | 'p' | 'span';

type AdaptiveTextProps = {
  as?: AdaptiveTextTag;
  className?: string;
  children: ReactNode;
  startHex?: string;
  endHex?: string;
  threshold?: number;
} & Omit<HTMLAttributes<HTMLElement>, 'children' | 'className' | 'color'>;

export function AdaptiveText({
  as = 'p',
  className,
  children,
  startHex = '#000c40',
  endHex = '#f8cdda',
  threshold,
  style,
  ...rest
}: AdaptiveTextProps) {
  const ref = useRef<HTMLElement | null>(null);
  const adaptiveStyle = useAdaptiveTextColor(ref, { startHex, endHex, threshold });

  return createElement(
    as,
    {
      ...rest,
      ref,
      className,
      style: {
        ...adaptiveStyle,
        ...style
      }
    },
    children
  );
}

