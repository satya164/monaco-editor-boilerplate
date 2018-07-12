/* eslint-disable import/no-commonjs */

const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { dev } = require('./serve.config');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  devtool: 'source-map',
  entry: {
    // Main bundle
    app: './src/index',

    // Language service workers
    'editor.worker': 'monaco-editor/esm/vs/editor/editor.worker',
    'json.worker': 'monaco-editor/esm/vs/language/json/json.worker',
    'ts.worker': 'monaco-editor/esm/vs/language/typescript/ts.worker',

    // Custom workers
    'jsx-syntax.worker': './src/workers/jsx-syntax.worker',
    'eslint.worker': './src/workers/eslint.worker',
  },
  output: {
    globalObject: 'self',
    path: path.resolve(__dirname, 'dist'),
    publicPath: dev.publicPath,
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
      /monaco-editor(\\|\/)esm(\\|\/)vs(\\|\/)editor(\\|\/)common(\\|\/)services/
    ),
  ].concat(
    process.env.NODE_ENV === 'production'
      ? [
          new webpack.LoaderOptionsPlugin({
            minimize: true,
            debug: false,
          }),
          new MiniCssExtractPlugin({
            filename: 'styles.css',
          }),
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
        use:
          process.env.NODE_ENV === 'production'
            ? [MiniCssExtractPlugin.loader, 'css-loader']
            : ['style-loader', 'css-loader'],
      },
    ],
  },
};
