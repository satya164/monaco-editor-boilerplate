/* @flow */

import * as monaco from 'monaco-editor'; // eslint-disable-line import/no-unresolved
import * as React from 'react';
import { findDOMNode } from 'react-dom';

const WORKER_BASE_URL = 'http://localhost:3021';

global.MonacoEnvironment = {
  getWorkerUrl(moduleId, label) {
    const workers = {
      json: 'json.worker.bundle.js',
      css: 'css.worker.bundle.js',
      html: 'html.worker.bundle.js',
      typescript: 'ts.worker.bundle.js',
      javascript: 'ts.worker.bundle.js',
      default: 'editor.worker.bundle.js',
    };

    return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
      self.MonacoEnvironment = {
        baseUrl: '${WORKER_BASE_URL}'
      };

      importScripts('${WORKER_BASE_URL}/${workers[label] || workers.default}');
    `)}`;
  },
};

const code = `function x() {
  console.log("Hello world!");
}`;

export default class Editor extends React.Component<*> {
  componentDidMount() {
    monaco.editor.create(this._node, {
      value: code,
      language: 'javascript',
    });
  }

  _node: any;

  render() {
    return (
      <div
        ref={c => (this._node = findDOMNode(c))}
        style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}
      />
    );
  }
}
