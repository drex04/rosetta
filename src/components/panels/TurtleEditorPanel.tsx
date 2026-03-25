import { useEffect, useRef } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { lineNumbers, highlightActiveLine } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { turtle } from 'codemirror-lang-turtle'

// Light theme — keeps editor consistent with the app's white aesthetic
const lightTheme = EditorView.theme({
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

interface TurtleEditorPanelProps {
  turtleSource: string
  onEditorChange: (value: string) => void
}

export function TurtleEditorPanel({ turtleSource, onEditorChange }: TurtleEditorPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  // Track whether a programmatic update is in flight so we don't echo it back
  const isExternalUpdate = useRef(false)

  // Mount the editor once
  useEffect(() => {
    if (containerRef.current === null) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return
      if (isExternalUpdate.current) return
      onEditorChange(update.state.doc.toString())
    })

    const state = EditorState.create({
      doc: turtleSource,
      extensions: [
        basicSetup,
        lineNumbers(),
        highlightActiveLine(),
        turtle(),
        lightTheme,
        updateListener,
      ],
    })

    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only mount once — external updates handled below

  // Canvas → Editor: update content when turtleSource changes externally (R-03)
  useEffect(() => {
    const view = viewRef.current
    if (view === null) return

    const currentDoc = view.state.doc.toString()
    if (currentDoc === turtleSource) return

    // R-03: Skip dispatch when the editor has focus — prevents cursor jumps
    if (view.hasFocus) return

    isExternalUpdate.current = true
    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: turtleSource,
      },
    })
    isExternalUpdate.current = false
  }, [turtleSource])

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden"
      aria-label="Turtle ontology editor"
    />
  )
}
