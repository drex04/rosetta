import { EditorView } from '@codemirror/view'

export const lightTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '12px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    backgroundColor: '#ffffff',
  },
  '.cm-content': {
    padding: '8px 0',
    caretColor: '#000000',
  },
  '.cm-line': {
    padding: '0 8px',
  },
  '.cm-gutters': {
    backgroundColor: '#f8f9fa',
    borderRight: '1px solid #e5e7eb',
    color: '#9ca3af',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#f1f5f9',
  },
  '.cm-activeLine': {
    backgroundColor: '#f8fafc',
  },
  '.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    overflow: 'auto',
  },
})
