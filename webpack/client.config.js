/* eslint-disable import/no-commonjs */

const webpack = require('webpack');
const path = require('path');

const PORT = 3000;
const entry = ['./src/index.js'];

module.exports = (env = { NODE_ENV: 'development' }) => ({
  devtool: 'source-map',
  entry:
    env.NODE_ENV === 'production'
      ? entry
      : [
          `webpack-dev-server/client?http://localhost:${PORT}`,
          'webpack/hot/only-dev-server',
          ...entry,
        ],
  output: {
    path: path.resolve(__dirname, '..', 'dist'),
    publicPath: '/dist/',
    filename: 'app.bundle.js',
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': { NODE_ENV: JSON.stringify(env.NODE_ENV) },
    }),
    // Ignore require() calls in vs/language/typescript/lib/typescriptServices.js
    new webpack.IgnorePlugin(
      /^((fs)|(path)|(os)|(crypto)|(source-map-support))$/,
      /vs(\/|\\)language(\/|\\)typescript(\/|\\)lib/
    ),
    new webpack.ContextReplacementPlugin(
      /monaco-editor(\\|\/)esm(\\|\/)vs(\\|\/)editor(\\|\/)common(\\|\/)services/,
      path.join(__dirname, '..')
    ),
  ].concat(
    env.NODE_ENV === 'production'
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
        test: /\.(bmp|gif|jpg|jpeg|png|svg|webp|ttf|otf)$/,
        use: { loader: 'url-loader', options: { limit: 25000 } },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  devServer: {
    contentBase: 'static/',
    hot: true,
    port: PORT,
  },
});
