const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const config = getDefaultConfig(projectRoot);

const escapeForRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const blockedRoots = [
  path.join(workspaceRoot, 'apps', 'web', '.next'),
  path.join(workspaceRoot, 'apps', 'web', '.next 2'),
  path.join(workspaceRoot, 'apps', 'web', '.next.broken-20260322-155128'),
  path.join(workspaceRoot, 'apps', 'web', '.next.broken-20260322-160340'),
  path.join(workspaceRoot, 'apps', 'web', '.next.stale-20260322-150943'),
  path.join(workspaceRoot, 'apps', 'web', '.next_stale_20260327_2329'),
];

config.watchFolders = [
  path.join(workspaceRoot, 'node_modules'),
  path.join(workspaceRoot, 'packages'),
];

config.resolver.blockList = [
  ...blockedRoots.map(
    (blockedRoot) => new RegExp(`^${escapeForRegex(blockedRoot)}\\/.*$`),
  ),
];

// Force a single React instance to avoid hook/runtime mismatches.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  react: path.join(projectRoot, 'node_modules', 'react'),
  'react-dom': path.join(projectRoot, 'node_modules', 'react-dom'),
  'react-native': path.join(projectRoot, 'node_modules', 'react-native'),
};

module.exports = withNativeWind(config, {
  input: './src/design/global.css',
});
