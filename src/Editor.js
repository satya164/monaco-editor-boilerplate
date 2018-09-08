/* @flow */

import * as monaco from 'monaco-editor/esm/vs/editor/editor.main';
import { SimpleEditorModelResolverService } from 'monaco-editor/esm/vs/editor/standalone/browser/simpleServices';
import * as React from 'react';
import debounce from 'lodash/debounce';
import light from './themes/light';
import dark from './themes/dark';
import config from '../serve.config';
import './Editor.css';

/**
 * Monkeypatch to make 'Find All References' work across multiple files
 * https://github.com/Microsoft/monaco-editor/issues/779#issuecomment-374258435
 */
SimpleEditorModelResolverService.prototype.findModel = function(
  editor,
  resource
) {
  return monaco.editor
    .getModels()
    .find(model => model.uri.toString() === resource.toString());
};

const WORKER_BASE_URL = `http://localhost:${config.port}/dist`;

const setupWorker = (name, callback) => {
  const worker = new Worker(`${WORKER_BASE_URL}/${name}.worker.bundle.js`);

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

    return `${WORKER_BASE_URL}/${workers[label] ||
      workers.default}.worker.bundle.js`;
  },
};

monaco.editor.defineTheme('ayu-light', light);
monaco.editor.defineTheme('ayu-dark', dark);

monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);

monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: true,
});

monaco.languages.registerDocumentFormattingEditProvider('javascript', {
  async provideDocumentFormattingEdits(model) {
    const prettier = await import('prettier/standalone');
    const babylon = await import('prettier/parser-babylon');
    const text = prettier.format(model.getValue(), {
      parser: 'babylon',
      plugins: [babylon],
      singleQuote: true,
    });

    return [
      {
        range: model.getFullModelRange(),
        text,
      },
    ];
  },
});

type Props = {
  files: { [path: string]: string },
  path: string,
  value: string,
  onOpenPath: (path: string) => mixed,
  onValueChange: (value: string) => mixed,
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
  theme: 'ayu-light' | 'ayu-dark',
};

const editorStates = new Map();

export default class Editor extends React.Component<Props> {
  static defaultProps = {
    lineNumbers: 'on',
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    minimap: {
      enabled: false,
    },
    theme: 'ayu-light',
  };

  static removePath(path: string) {
    // Remove editor states
    editorStates.delete(path);

    // Remove associated models
    const model = monaco.editor
      .getModels()
      .find(model => model.uri.path === path);

    model && model.dispose();
  }

  static renamePath(oldPath: string, newPath: string) {
    const selection = editorStates.get(oldPath);

    editorStates.delete(oldPath);
    editorStates.set(newPath, selection);

    this.removePath(oldPath);
  }

  componentDidMount() {
    this._linterWorker = setupWorker('eslint', this._updateMarkers);

    const { path, value, ...rest } = this.props;

    this._editor = monaco.editor.create(this._node, rest, {
      codeEditorService: {
        addCodeEditor: () => {},
        removeCodeEditor: () => {},
        listCodeEditors: () => [this._editor],

        getFocusedCodeEditor: () => this._editor,

        registerDecorationType: () => {},
        removeDecorationType: () => {},
        resolveDecorationOptions: () => {},

        setTransientModelProperty: () => {},
        getTransientModelProperty: () => {},

        getActiveCodeEditor: () => this._editor,
        openCodeEditor: async ({ resource, options }, editor) => {
          // Open the file with this path
          // This should set the model with the path and value
          this.props.onOpenPath(resource.path);

          // Move cursor to the desired position
          editor.setSelection(options.selection);

          // Scroll the editor to bring the desired line into focus
          editor.revealLine(options.selection.startLineNumber);

          return Promise.resolve({
            getControl: () => editor,
          });
        },
      },
    });

    Object.keys(this.props.files).forEach(path =>
      this._initializeFile(path, this.props.files[path])
    );

    this._openFile(path, value);
    this._phantom.contentWindow.addEventListener('resize', this._handleResize);
  }

  componentDidUpdate(prevProps: Props) {
    const { path, value, ...rest } = this.props;

    this._editor.updateOptions(rest);

    if (path !== prevProps.path) {
      editorStates.set(prevProps.path, this._editor.saveViewState());

      this._openFile(path, value);
    } else if (value !== this._editor.getModel().getValue()) {
      const model = this._editor.getModel();

      if (value !== model.getValue()) {
        model.pushEditOperations(
          [],
          [
            {
              range: model.getFullModelRange(),
              text: value,
            },
          ]
        );
      }
    }
  }

  componentWillUnmount() {
    this._subscription && this._subscription.dispose();
    this._editor && this._editor.dispose();
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

  _initializeFile = (path: string, value: string) => {
    let model = monaco.editor
      .getModels()
      .find(model => model.uri.path === path);

    if (model) {
      // If a model exists, we need to update it's value
      // This is needed because the content for the file might have been modified externally
      // Use `pushEditOperations` instead of `setValue` or `applyEdits` to preserve undo stack
      model.pushEditOperations(
        [],
        [
          {
            range: model.getFullModelRange(),
            text: value,
          },
        ]
      );
    } else {
      model = monaco.editor.createModel(
        value,
        'javascript',
        new monaco.Uri().with({ path })
      );
      model.updateOptions({
        tabSize: 2,
        insertSpaces: true,
      });
    }
  };

  _openFile = (path: string, value: string) => {
    this._initializeFile(path, value);

    const model = monaco.editor
      .getModels()
      .find(model => model.uri.path === path);

    this._editor.setModel(model);

    // Restore the editor state for the file
    const editorState = editorStates.get(path);

    if (editorState) {
      this._editor.restoreViewState(editorState);
    }

    this._editor.focus();

    // Subscribe to change in value so we can notify the parent
    this._subscription && this._subscription.dispose();
    this._subscription = this._editor.getModel().onDidChangeContent(() => {
      const value = this._editor.getModel().getValue();

      this.props.onValueChange(value);
      this._lintCode(value);
    });
  };

  _lintCode = code => {
    const model = this._editor.getModel();

    monaco.editor.setModelMarkers(model, 'eslint', []);

    this._linterWorker.postMessage({
      code,
      version: model.getVersionId(),
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
          className={this.props.theme}
        />
      </div>
    );
  }
}
