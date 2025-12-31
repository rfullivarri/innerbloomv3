const React = require('react');
const { View } = require('react-native');

const BlurView = React.forwardRef(function BlurView(props, ref) {
  return React.createElement(View, { ...props, ref });
});

module.exports = { BlurView };
