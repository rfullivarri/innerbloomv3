import type { ComponentProps } from 'react';
import type Svg from 'react-native-svg';

type IconProps = ComponentProps<typeof Svg> & {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

type LucideIcon = (props: IconProps) => JSX.Element;

export const Route: LucideIcon;
export const Flame: LucideIcon;
export const CircleDot: LucideIcon;
export const Sparkles: LucideIcon;
export const Sprout: LucideIcon;

export type { IconProps, LucideIcon };
