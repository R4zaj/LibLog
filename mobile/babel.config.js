module.exports = function(api) {
  api.cache(true);
  const plugins = [];
  if (process.env.NODE_ENV === 'production') {
    plugins.push('transform-remove-console');
  }
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ...plugins,
      [
        '@tamagui/babel-plugin',
        {
          components: ['tamagui'],
          config: './tamagui.config.ts',
          logTimings: true,
          disableExtraction: process.env.NODE_ENV === 'development',
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
