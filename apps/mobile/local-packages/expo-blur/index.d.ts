import type { ComponentProps, ForwardedRef } from 'react';
import type { View } from 'react-native';

export type BlurViewProps = ComponentProps<typeof import('react-native').View> & {
  tint?: 'light' | 'dark' | 'default' | 'extraLight';
  intensity?: number;
};

export const BlurView: (props: BlurViewProps & { ref?: ForwardedRef<View> }) => JSX.Element;
