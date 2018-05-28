/* @flow */
/* eslint-disable import/no-commonjs */

const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const config = require('./webpack.config');
const { port } = require('./config.json');

new WebpackDevServer(webpack(config), {
  contentBase: 'static/',
  hot: true,
}).listen(port, 'localhost', function(err) {
  if (err) {
    console.log(err);
  }

  console.log(`Project is running at http://localhost:${port}`);
});
