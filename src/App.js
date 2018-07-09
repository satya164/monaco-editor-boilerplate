/* @flow */

import * as React from 'react';
import Editor from './Editor';

const code = `import React, { Component } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Constants } from 'expo';

// You can import from local files
import AssetExample from './components/AssetExample';

// or any pure javascript modules available in npm
import { Card } from 'react-native-elements'; // Version can be specified in package.json

export default class App extends Component {
  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.paragraph}>
          Change code in the editor and watch it change on your phone!
          Save to get a shareable url.
        </Text>
        <Card title="Local Modules">
          <AssetExample />
        </Card>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Constants.statusBarHeight,
    backgroundColor: '#ecf0f1',
  },
  paragraph: {
    margin: 24,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#34495e',
  },
});
`;

type State = {
  files: {
    [name: string]: string,
  },
  current: string,
};

export default class App extends React.Component<{}, State> {
  state = {
    files: {
      'App.js': code,
      'Stuff.js': '',
    },
    current: 'App.js',
  };

  _handleValueChange = code =>
    this.setState(state => ({
      files: {
        ...state.files,
        [state.current]: code,
      },
    }));

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
        <div
          style={{ width: 180, borderRight: '1px solid rgba(0, 0, 0, .08)' }}
        >
          {Object.keys(this.state.files).map(name => (
            <div
              key={name}
              style={{
                fontSize: 14,
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
          path={this.state.current}
          value={this.state.files[this.state.current]}
          onValueChange={this._handleValueChange}
          language="javascript"
        />
      </div>
    );
  }
}
