/* @flow */

import 'babel-polyfill';
import * as React from 'react';
import dedent from 'dedent';
import Editor from './Editor';

const files = {
  'App.js': dedent`import React, { Component } from 'react';
  import { Text, View, StyleSheet } from 'react-native';
  import { Constants } from 'expo';
  import AssetExample from './AssetExample';

  export default class App extends Component {
    render() {
      return (
        <View style={styles.container}>
          <Text style={styles.paragraph}>
            Change code in the editor and watch it change on your phone!
            Save to get a shareable url.
          </Text>
          <AssetExample />
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
  });`,
  'AssetExample.js': dedent`import React, { Component } from 'react';
  import { Text, View, StyleSheet, Image } from 'react-native';

  export default class AssetExample extends Component {
    render() {
      return (
        <View style={styles.container}>
          <Text style={styles.paragraph}>
            Local files and assets can be imported by dragging and dropping them into the editor
          </Text>
          <Image style={styles.logo} source={require("../assets/expo.symbol.white.png")}/>
        </View>
      );
    }
  }

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    paragraph: {
      margin: 24,
      marginTop: 0,
      fontSize: 14,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#34495e',
    },
    logo: {
      backgroundColor: "#056ecf",
      height: 128,
      width: 128,
    }
  });`,
};

type State = {
  files: {
    [name: string]: string,
  },
  current: string,
};

export default class App extends React.Component<{}, State> {
  state = {
    files,
    current: 'App.js',
  };

  _handleValueChange = code =>
    this.setState(state => ({
      files: {
        ...state.files,
        [state.current]: code,
      },
    }));

  _handleOpenPath = path => this.setState({ current: path });

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
              onClick={() => this._handleOpenPath(name)}
            >
              {name}
            </div>
          ))}
        </div>
        <Editor
          files={this.state.files}
          path={this.state.current}
          value={this.state.files[this.state.current]}
          onOpenPath={this._handleOpenPath}
          onValueChange={this._handleValueChange}
        />
      </div>
    );
  }
}
