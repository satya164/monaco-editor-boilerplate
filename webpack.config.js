/* eslint-disable import/no-commonjs */

const webpack = require('webpack');
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { devMiddleware } = require('./serve.config');

module.exports = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  devtool: 'source-map',
  entry: {
    app: './src/index',
  },
  output: {
    globalObject: 'self',
    path: path.resolve(__dirname, 'dist'),
    publicPath: devMiddleware.publicPath,
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
      : [new webpack.NamedModulesPlugin(), new webpack.NoEmitOnErrorsPlugin()]
  ),
  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'worker-loader',
          options: {
            name: '[name].[hash].js',
          },
        },
      },
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
