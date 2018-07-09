/* @flow */

import * as monaco from 'monaco-editor'; // eslint-disable-line import/no-unresolved
import * as React from 'react';
import debounce from 'lodash/debounce';
import light from './themes/light';
import dark from './themes/dark';
import config from '../serve.config';
import './Editor.css';

const WORKER_BASE_URL = `http://localhost:${config.port}/dist`;

const getWorkerURL = (name, header?: string) => {
  const code = `
    ${header || ''}

    importScripts('${WORKER_BASE_URL}/${name}.worker.bundle.js');
  `;

  if ('Blob' in window) {
    return URL.createObjectURL(
      new Blob([code], { type: 'application/javascript' })
    );
  } else {
    return `data:text/javascript;charset=utf-8,${encodeURIComponent(code)}`;
  }
};

const setupWorker = (name, callback) => {
  const worker = new Worker(getWorkerURL(name));

  worker.addEventListener('message', ({ data }: any) => callback(data));

  return worker;
};

global.MonacoEnvironment = {
  getWorkerUrl(moduleId, label) {
    const workers = {
      json: 'json',
      css: 'css',
      html: 'html',
      typescript: 'ts',
      javascript: 'ts',
      default: 'editor',
    };

    return getWorkerURL(
      workers[label] || workers.default,
      `self.MonacoEnvironment = {
        baseUrl: '${WORKER_BASE_URL}'
      };`
    );
  },
};

monaco.editor.defineTheme('snack-light', light);
monaco.editor.defineTheme('snack-dark', dark);

type Language = 'json' | 'css' | 'html' | 'typescript' | 'javascript';

type Props = {
  path: string,
  value: string,
  onValueChange: (value: string) => mixed,
  language: Language,
  lineNumbers?: 'on' | 'off',
  wordWrap: 'off' | 'on' | 'wordWrapColumn' | 'bounded',
  scrollBeyondLastLine?: boolean,
  minimap?: {
    enabled?: boolean,
    maxColumn?: number,
    renderCharacters?: boolean,
    showSlider?: 'always' | 'mouseover',
    side?: 'right' | 'left',
  },
  theme: 'snack-light' | 'snack-dark',
};

const models = new Map();
const selections = new Map();

export default class Editor extends React.Component<Props> {
  static defaultProps = {
    lineNumbers: 'on',
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    minimap: {
      enabled: false,
    },
    theme: 'snack-light',
  };

  static removePath(path: string) {
    const model = models.get(path);

    model && model.dispose();
    models.delete(path);

    selections.delete(path);
  }

  static renamePath(prevPath: string, nextPath: string) {
    const model = models.get(prevPath);

    models.delete(prevPath);
    models.set(nextPath, model);

    const selection = selections.get(prevPath);

    selections.delete(prevPath);
    selections.set(nextPath, selection);
  }

  componentDidMount() {
    this._syntaxWorker = setupWorker('jsx-syntax', this._updateDecorations);
    this._linterWorker = setupWorker('eslint', this._updateMarkers);

    this._syntaxWorker.addEventListener('message', ({ data }: any) =>
      this._updateDecorations(data)
    );

    const { path, value, language, ...rest } = this.props;

    this._editor = monaco.editor.create(this._node, rest);
    this._editor.onDidChangeCursorSelection(selectionChange => {
      selections.set(this.props.path, {
        selection: selectionChange.selection,
        secondarySelections: selectionChange.secondarySelections,
      });
    });

    this._openFile(path, value, language);
    this._phantom.contentWindow.addEventListener('resize', this._handleResize);
  }

  componentDidUpdate(prevProps: Props) {
    const { path, value, language, ...rest } = this.props;

    this._editor.updateOptions(rest);

    if (path !== prevProps.path) {
      this._openFile(path, value, language);
    } else if (value !== this._editor.getModel().getValue()) {
      this._editor.getModel().setValue(value);
      this._sytaxHighlight(path, value, language);
    }
  }

  componentWillUnmount() {
    this._subscription && this._subscription.dispose();
    this._editor && this._editor.dispose();
    this._syntaxWorker && this._syntaxWorker.terminate();
    this._phantom &&
      this._phantom.contentWindow.removeEventListener(
        'resize',
        this._handleResize
      );
  }

  clearSelection() {
    const selection = this._editor.getSelection();

    this._editor.setSelection(
      new monaco.Selection(
        selection.startLineNumber,
        selection.startColumn,
        selection.startLineNumber,
        selection.startColumn
      )
    );
  }

  _openFile = (path: string, value: string, language: Language) => {
    let model = models.get(path);

    if (!model) {
      model = monaco.editor.createModel(value, language, path);
      models.set(path, model);
    }

    this._editor.setModel(model);

    const selection = selections.get(path);

    if (selection) {
      this._editor.setSelection(selection.selection);

      if (selection.secondarySelections.length) {
        this._editor.setSelections(selection.secondarySelections);
      }
    }

    this._editor.focus();

    this._subscription && this._subscription.dispose();
    this._subscription = this._editor.getModel().onDidChangeContent(() => {
      const value = this._editor.getModel().getValue();

      this.props.onValueChange(value);
      this._sytaxHighlight(value, language, path);
      this._lintCode(value, language);
    });

    this._sytaxHighlight(value, language, path);
    this._lintCode(value, language);
  };

  _lintCode = (code, language) => {
    const model = this._editor.getModel();

    if (language === 'javascript') {
      this._linterWorker.postMessage({
        code,
        version: model.getVersionId(),
      });
    } else {
      monaco.editor.setModelMarkers(model, 'eslint', []);
    }
  };

  _sytaxHighlight = (code, language, path) => {
    if (language === 'typescript' || language === 'javascript') {
      this._syntaxWorker.postMessage({
        code,
        title: path,
        version: this._editor.getModel().getVersionId(),
      });
    }
  };

  _updateDecorations = ({ classifications, version }: any) => {
    requestAnimationFrame(() => {
      const model = this._editor.getModel();

      if (model && model.getVersionId() === version) {
        const decorations = classifications.map(classification => ({
          range: new monaco.Range(
            classification.startLine,
            classification.start,
            classification.endLine,
            classification.end
          ),
          options: {
            inlineClassName: classification.type
              ? `${classification.kind} ${classification.type}-of-${
                  classification.parentKind
                }`
              : classification.kind,
          },
        }));

        const model = this._editor.getModel();

        model.decorations = this._editor.deltaDecorations(
          model.decorations || [],
          decorations
        );
      }
    });
  };

  _updateMarkers = ({ markers, version }: any) => {
    requestAnimationFrame(() => {
      const model = this._editor.getModel();

      if (model && model.getVersionId() === version) {
        monaco.editor.setModelMarkers(model, 'eslint', markers);
      }
    });
  };

  _handleResize = debounce(() => this._editor.layout(), 100, {
    leading: true,
    trailing: true,
  });

  _syntaxWorker: Worker;
  _linterWorker: Worker;
  _subscription: any;
  _editor: any;
  _phantom: any;
  _node: any;

  render() {
    return (
      <div
        style={{
          display: 'flex',
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <iframe
          ref={c => (this._phantom = c)}
          type="text/html"
          style={{
            display: 'block',
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: '100%',
            pointerEvents: 'none',
            opacity: 0,
          }}
        />
        <div
          ref={c => (this._node = c)}
          style={{ display: 'flex', flex: 1, overflow: 'hidden' }}
          className={`theme-${this.props.theme}`}
        />
      </div>
    );
  }
}
