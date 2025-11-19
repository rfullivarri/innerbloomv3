const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [
  path.join(projectRoot, 'node_modules'),
  path.join(workspaceRoot, 'node_modules'),
];

const unifiedModules = ['react', 'react-native'];
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  ...Object.fromEntries(
    unifiedModules.map((moduleName) => [
      moduleName,
      path.join(projectRoot, 'node_modules', moduleName),
    ]),
  ),
};

module.exports = config;
