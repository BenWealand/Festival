const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = {
  ...config,
  transformer: {
    ...config.transformer,
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    ...config.resolver,
    unstable_enablePackageExports: false, // 🔧 <- This line fixes the Supabase `stream` issue
    sourceExts: [...config.resolver.sourceExts, 'mjs'],
    assetExts: [
      ...config.resolver.assetExts,
      'ttf',
      'png',
      'jpg',
      'reanimated'
    ],
  },
  server: {
    ...config.server,
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        if (req.url.endsWith('.bundle')) {
          res.setHeader('Content-Type', 'application/javascript');
        }
        return middleware(req, res, next);
      };
    },
  },
};
