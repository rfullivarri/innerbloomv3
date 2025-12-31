import type { ComponentProps, ForwardedRef } from 'react';
import type { View } from 'react-native';

export type SvgProps = ComponentProps<typeof import('react-native').View> & {
  viewBox?: string;
};

export type ShapeProps = ComponentProps<typeof import('react-native').View>;

export const Svg: (props: SvgProps & { ref?: ForwardedRef<View> }) => JSX.Element;
export const Circle: (props: ShapeProps & { ref?: ForwardedRef<View> }) => JSX.Element;
export const Path: (props: ShapeProps & { ref?: ForwardedRef<View> }) => JSX.Element;
export const G: (props: ShapeProps & { ref?: ForwardedRef<View> }) => JSX.Element;

export default Svg;
