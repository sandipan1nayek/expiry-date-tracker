module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Removed react-native-reanimated/plugin for Expo compatibility
    ],
  };
};
