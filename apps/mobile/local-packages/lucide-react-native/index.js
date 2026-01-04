const React = require('react');
const SvgLib = require('react-native-svg');

const SvgComponent = SvgLib.default || SvgLib.Svg || SvgLib;
const { Path, Circle } = SvgLib;

function BaseIcon({ size = 24, color = 'currentColor', strokeWidth = 2, children, ...rest }, ref) {
  return React.createElement(
    SvgComponent,
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      strokeWidth,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      ...rest,
      ref,
    },
    children,
  );
}

function createIcon(renderChildren, displayName) {
  const Icon = React.forwardRef((props, ref) =>
    React.createElement(BaseIcon, { ...props, ref }, renderChildren(props)),
  );

  Icon.displayName = displayName;
  return Icon;
}

const Route = createIcon(
  () => [
    React.createElement(Path, { key: 'r1', d: 'M4 18c4 0 4-12 8-12s4 12 8 12' }),
    React.createElement(Circle, { key: 'r2', cx: '4', cy: '18', r: '2' }),
    React.createElement(Circle, { key: 'r3', cx: '20', cy: '18', r: '2' }),
    React.createElement(Circle, { key: 'r4', cx: '12', cy: '6', r: '2' }),
  ],
  'RouteIcon',
);

const Flame = createIcon(
  () => [
    React.createElement(Path, { key: 'f1', d: 'M12 3c1 3-2 4-2 7a3 3 0 0 0 6 0c0-3-3-4-4-7Z' }),
    React.createElement(Path, { key: 'f2', d: 'M8 14a4 4 0 1 0 8 0 6 6 0 0 0-2-4' }),
  ],
  'FlameIcon',
);

const CircleDot = createIcon(
  () => [
    React.createElement(Circle, { key: 'c1', cx: '12', cy: '12', r: '9' }),
    React.createElement(Circle, { key: 'c2', cx: '12', cy: '12', r: '2' }),
  ],
  'CircleDotIcon',
);

const Sparkles = createIcon(
  () => [
    React.createElement(Path, { key: 's1', d: 'M12 4 13.5 7.5 17 9l-3.5 1.5L12 14l-1.5-3.5L7 9l3.5-1.5Z' }),
    React.createElement(Path, { key: 's2', d: 'm6 16 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z' }),
    React.createElement(Path, { key: 's3', d: 'm18 14 .75 1.5L20 16l-1.25.5L18 18l-.75-1.5L16 16l1.25-.5Z' }),
  ],
  'SparklesIcon',
);

const Sprout = createIcon(
  () => [
    React.createElement(Path, { key: 'sp1', d: 'M12 22v-6' }),
    React.createElement(Path, { key: 'sp2', d: 'M16 10c0 2-1.79 4-4 4s-4-2-4-4a4 4 0 0 1 4-4c2.21 0 4 2 4 4Z' }),
    React.createElement(Path, { key: 'sp3', d: 'M9 9C9 6 7 4 4 4c0 3 2 5 5 5Z' }),
    React.createElement(Path, { key: 'sp4', d: 'M15 9c0-3 2-5 5-5 0 3-2 5-5 5Z' }),
  ],
  'SproutIcon',
);

module.exports = {
  Route,
  Flame,
  CircleDot,
  Sparkles,
  Sprout,
};
