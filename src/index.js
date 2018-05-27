/* @flow */

import * as React from 'react';
import ReactDOM from 'react-dom';
import Editor from './Editor';

const render = Component => ReactDOM.render(<Component />, window.root);

render(Editor);

/* $FlowFixMe */
if (module.hot) {
  /* $FlowFixMe */
  module.hot.accept('./Editor', () => render(Editor));
}
