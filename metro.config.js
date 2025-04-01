const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = {
  ...config,
  resolver: {
    ...config.resolver,
    sourceExts: [...config.resolver.sourceExts, 'mjs'],
    assetExts: [
      ...config.resolver.assetExts,
      'ttf',
      'png',
      'jpg',
      'reanimated'
    ],
  },
};
