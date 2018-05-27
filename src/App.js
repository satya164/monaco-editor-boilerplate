/* @flow */

import * as React from 'react';
import Editor from './Editor';

const code = `function x() {
  console.log("Hello world!");
}`;

type State = {
  code: string,
};

export default class App extends React.Component<{}, State> {
  state = {
    code,
  };

  _handleValueChange = code => this.setState({ code });

  render() {
    return (
      <Editor
        value={this.state.code}
        onValueChange={this._handleValueChange}
        language="javascript"
      />
    );
  }
}
