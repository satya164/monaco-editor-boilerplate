/* @flow */

import * as React from 'react';
import Editor, { type Annotation } from './Editor';
import ESLint from './vendor/eslint.bundle';

const code = `function x() {
  console.log("Hello world!");
}`;

type State = {
  files: {
    [name: string]: string,
  },
  current: string,
  annotations: Annotation[],
};

export default class App extends React.Component<{}, State> {
  state = {
    files: {
      'App.js': code,
      'Stuff.js': '',
    },
    current: 'App.js',
    annotations: [],
  };

  _handleValueChange = code =>
    this.setState(state => {
      const annotations = ESLint.verify(state.files[state.current], {
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

      return {
        files: {
          ...state.files,
          [state.current]: code,
        },
        annotations,
      };
    });

  render() {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          width: '100vw',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ width: 200, padding: '16px 0' }}>
          {Object.keys(this.state.files).map(name => (
            <div
              key={name}
              style={{
                padding: '8px 24px',
                backgroundColor:
                  this.state.current === name ? 'black' : 'transparent',
                color: this.state.current === name ? 'white' : 'black',
                cursor: 'pointer',
              }}
              onClick={() => this.setState({ current: name })}
            >
              {name}
            </div>
          ))}
        </div>
        <Editor
          value={this.state.files[this.state.current]}
          onValueChange={this._handleValueChange}
          language="javascript"
          annotations={this.state.annotations}
        />
      </div>
    );
  }
}
