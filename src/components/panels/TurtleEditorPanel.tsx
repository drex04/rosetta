import { useEffect, useRef } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DownloadSimpleIcon } from '@phosphor-icons/react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { lineNumbers, highlightActiveLine } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { turtle } from 'codemirror-lang-turtle'
import { lightTheme } from '@/lib/codemirror-theme'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface TurtleEditorPanelProps {
  turtleSource: string
  onEditorChange: (value: string) => void
  parseError?: string | null
}

export function TurtleEditorPanel({ turtleSource, onEditorChange, parseError }: TurtleEditorPanelProps) {
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
    <div className="flex flex-col h-full">
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/20">
        <span className="text-xs text-muted-foreground font-mono">ontology.ttl</span>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => downloadBlob(turtleSource, 'ontology.ttl', 'text/turtle')}
        >
          <DownloadSimpleIcon size={12} />
          Download .ttl
        </Button>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden"
        aria-label="Turtle ontology editor"
      />
      {parseError && (
        <Alert variant="destructive" className="shrink-0 rounded-none border-x-0 border-b-0 text-xs font-mono">
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
