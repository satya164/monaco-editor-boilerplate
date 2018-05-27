/* @flow */

import * as React from 'react';
import Editor, { type Annotation } from './Editor';
import ESLint from './vendor/eslint.bundle';

const code = `function x() {
  console.log("Hello world!");
}`;

type State = {
  code: string,
  annotations: Annotation[],
};

export default class App extends React.Component<{}, State> {
  state = {
    code,
    annotations: [],
  };

  _handleValueChange = code => {
    const annotations = ESLint.verify(code, {
      parser: 'babel-eslint',
      parserOptions: {
        sourceType: 'module',
      },
      env: {
        es6: true,
      },
      plugins: ['babel', 'react', 'react-native'],
      rules: {
        'no-unused-vars': 'error',
      },
    }).map(err => ({
      row: err.line,
      column: err.column,
      severity: err.message.toLowerCase().startsWith('parsing error')
        ? 3
        : err.severity + 1,
      text: `${err.message} (${err.ruleId})`,
      type: 'error',
      source: 'ESLint',
    }));

    this.setState({ code, annotations });
  };

  render() {
    return (
      <Editor
        value={this.state.code}
        onValueChange={this._handleValueChange}
        language="javascript"
        annotations={this.state.annotations}
      />
    );
  }
}
