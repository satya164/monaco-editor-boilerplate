/* @flow */

import * as React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

const render = Component => ReactDOM.render(<Component />, window.root);

render(App);

/* $FlowFixMe */
if (module.hot) {
  /* $FlowFixMe */
  module.hot.accept('./App', () => render(App));
}
