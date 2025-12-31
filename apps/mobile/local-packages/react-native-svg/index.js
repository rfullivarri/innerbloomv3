const React = require('react');
const { View } = require('react-native');

function createPrimitive(displayName) {
  const Comp = React.forwardRef(function SvgPrimitive(props, ref) {
    return React.createElement(View, { ...props, ref });
  });
  Comp.displayName = displayName;
  return Comp;
}

const Svg = React.forwardRef(function SvgComponent(props, ref) {
  return React.createElement(View, { ...props, ref });
});

const Circle = createPrimitive('Circle');
const Path = createPrimitive('Path');
const G = createPrimitive('G');

module.exports = Object.assign(Svg, {
  default: Svg,
  Svg,
  Circle,
  Path,
  G,
});
