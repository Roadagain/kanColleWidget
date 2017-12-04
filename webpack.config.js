/* global process:false */
var webpack = require("webpack");

var plugins = [
  new webpack.DefinePlugin({
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development")
  }),
  new webpack.LoaderOptionsPlugin({
    options: {
      worker: {
        output: {
          filename: "dest/js/worker.[id].js",
        }
      }
    }
  })
];
if (process.env.NODE_ENV == "production") {
  plugins.push(new webpack.optimize.UglifyJsPlugin({
    compress: { warnings: false },
    mangle: false
  }));
}

module.exports = {
  entry: {
    options:    "./src/js/entrypoints/pages/options.js",
    popup:      "./src/js/entrypoints/pages/popup.js",
    dmm:        "./src/js/entrypoints/pages/dmm.js",
    osapi_dmm : "./src/js/entrypoints/pages/osapi.dmm.js",
    iframe:     "./src/js/entrypoints/pages/iframe.js",
    capture:    "./src/js/entrypoints/pages/capture.js",
    stream:     "./src/js/entrypoints/pages/stream.js",
    deckcapture:"./src/js/entrypoints/pages/deckcapture.js",
    dashboard:  "./src/js/entrypoints/pages/dashboard.js",
    dsnapshot:  "./src/js/entrypoints/pages/dsnapshot.js",
    archive:    "./src/js/entrypoints/pages/archive.js",
    wiki:       "./src/js/entrypoints/pages/wiki.js",
    feedback:   "./src/js/entrypoints/pages/feedback.js",
    statistics: "./src/js/entrypoints/pages/statistics.js",
    manual:     "./src/js/entrypoints/pages/manual.js",
    background: "./src/js/entrypoints/background.js",
  },
  output: {filename:"./dest/js/[name].js"},
  module: {
    loaders: [
            {test: /.jsx?$/, loader: "babel-loader"},
            {test: /\.(otf|eot|svg|ttf|woff|woff2)(\?.+)?$/,loader: "url"},
            {test: /\.css$/, loader: "style-loader!css-loader"},
            {test: /.json$/, loader: "json-loader"}
    ]
  },
  resolve: {
    extensions: [".js", ".jsx"]
  },
  plugins: plugins
};
