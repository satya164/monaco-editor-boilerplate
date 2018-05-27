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
  path: string,
  value: string,
  onValueChange: (value: string) => mixed,
  annotations: Annotation[],
  language: 'json' | 'css' | 'html' | 'typescript' | 'javascript',
  lineNumbers?: 'on' | 'off',
  scrollBeyondLastLine?: boolean,
};

const models = new Map();

export default class Editor extends React.Component<Props> {
  static defaultProps = {
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
  };

  static removePath(path: string) {
    const model = models.get(path);

    model && model.dispose();
    models.delete(path);
  }

  static renamePath(prevPath: string, nextPath: string) {
    const model = models.get(prevPath);

    models.delete(prevPath);
    models.set(nextPath, model);
  }

  componentDidMount() {
    // eslint-disable-next-line no-unused-vars
    const { path, annotations, value, language, ...rest } = this.props;
    const model = monaco.editor.createModel(value, language, path);

    this._editor = monaco.editor.create(this._node, rest);
    this._editor.setModel(model);
    this._subscribe();

    models.set(this.props.path, this._editor.getModel());
  }

  componentDidUpdate(prevProps: Props) {
    const { path, annotations, value, language, ...rest } = this.props;

    this._editor.updateOptions(rest);

    if (path !== prevProps.path) {
      let model = models.get(path);

      if (!model) {
        model = monaco.editor.createModel(value, language, path);
        models.set(path, model);
      }

      this._editor.setModel(model);
      this._editor.focus();
      this._subscribe();
    } else if (value !== this._editor.getModel().getValue()) {
      this._editor.getModel().setValue(value);
    }

    if (annotations !== prevProps.annotations) {
      monaco.editor.setModelMarkers(
        this._editor.getModel(),
        null,
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

  componentWillUnmount() {
    this._subscription && this._subscription.dispose();
    this._editor.dispose();
  }

  _subscribe = () => {
    this._subscription && this._subscription.dispose();
    this._subscription = this._editor
      .getModel()
      .onDidChangeContent(() =>
        this.props.onValueChange(this._editor.getModel().getValue())
      );
  };

  _subscription: any;
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
