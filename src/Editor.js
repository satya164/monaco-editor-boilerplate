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

export type Annotation = {
  row: number,
  column: number,
  severity: number,
  text: string,
  type: 'error',
  source: string,
};

type Props = {
  value: string,
  onValueChange: (value: string) => mixed,
  annotations: Annotation[],
  language: 'json' | 'css' | 'html' | 'typescript' | 'javascript',
  lineNumbers?: 'on' | 'off',
  scrollBeyondLastLine?: boolean,
};

export default class Editor extends React.Component<Props> {
  static defaultProps = {
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
  };

  componentDidMount() {
    // eslint-disable-next-line no-unused-vars
    const { annotations, ...rest } = this.props;

    this._editor = monaco.editor.create(this._node, rest);
    this._editor.model.onDidChangeContent(() =>
      this.props.onValueChange(this._editor.viewModel.model.getValue())
    );
  }

  componentDidUpdate(prevProps: Props) {
    const { annotations, value, ...rest } = this.props;

    this._editor.updateOptions(rest);

    if (value !== prevProps.value) {
      this._editor.viewModel.model.setValue(value);
    }

    if (annotations !== prevProps.annotations) {
      monaco.editor.setModelMarkers(
        this._editor.model,
        '',
        annotations.map(annotation => ({
          startLineNumber: annotation.row,
          endLineNumber: annotation.row,
          startColumn: annotation.column,
          endColumn: annotation.column,
          message: annotation.text,
          severity: annotation.severity,
          source: annotation.source,
        }))
      );
    }
  }

  _editor: any;
  _node: any;

  render() {
    return (
      <div
        ref={c => (this._node = findDOMNode(c))}
        style={{ display: 'flex', flex: 1, overflow: 'hidden' }}
      />
    );
  }
}
