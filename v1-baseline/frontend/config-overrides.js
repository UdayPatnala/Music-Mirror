const webpack = require("webpack");

module.exports = function override(config) {
  config.resolve.fallback = {
    fs: false,
    util: require.resolve("util/"),
    buffer: require.resolve("buffer/"),
    process: require.resolve("process/browser")
  };

  config.plugins.push(
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process/browser"
    })
  );

  config.ignoreWarnings = [
    ...(config.ignoreWarnings || []),
    (warning) =>
      warning.message.includes("Failed to parse source map") &&
      warning.message.includes("face-api.js"),
  ];

  return config;
};
