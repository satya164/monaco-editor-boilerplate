/* eslint-disable import/no-commonjs */

const webpack = require('webpack');
const path = require('path');
const { port } = require('./config.json');

const entry = './src/index.js';

const common = {
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, '..', 'dist'),
    publicPath: '/dist/',
    filename: '[name].bundle.js',
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': { NODE_ENV: JSON.stringify(process.env.NODE_ENV) },
    }),
    // Ignore require() calls in vs/language/typescript/lib/typescriptServices.js
    new webpack.IgnorePlugin(
      /^((fs)|(path)|(os)|(crypto)|(source-map-support))$/,
      /vs(\/|\\)language(\/|\\)typescript(\/|\\)lib/
    ),
    new webpack.ContextReplacementPlugin(
      /monaco-editor(\\|\/)esm(\\|\/)vs(\\|\/)editor(\\|\/)common(\\|\/)services/,
      __dirname
    ),
  ].concat(
    process.env.NODE_ENV === 'production'
      ? [
          new webpack.LoaderOptionsPlugin({ minimize: true, debug: false }),
          new webpack.optimize.UglifyJsPlugin({
            compress: { warnings: false },
            sourceMap: true,
          }),
          new webpack.optimize.ModuleConcatenationPlugin(),
        ]
      : [
          new webpack.HotModuleReplacementPlugin(),
          new webpack.NamedModulesPlugin(),
          new webpack.NoEmitOnErrorsPlugin(),
        ]
  ),
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules|vendor/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
};

module.exports = [
  {
    ...common,
    entry: {
      app:
        process.env.NODE_ENV === 'production'
          ? entry
          : [
              `webpack-dev-server/client?http://localhost:${port}`,
              'webpack/hot/only-dev-server',
              entry,
            ],
    },
  },
  {
    ...common,
    target: 'webworker',
    entry: {
      // Language service workers
      'editor.worker': 'monaco-editor/esm/vs/editor/editor.worker.js',
      'json.worker': 'monaco-editor/esm/vs/language/json/json.worker',
      'ts.worker': 'monaco-editor/esm/vs/language/typescript/ts.worker',

      // Custom workers
      'jsx-syntax.worker': './src/workers/jsx-syntax.worker',
    },
  },
];
