import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PlusIcon, ExportIcon, DownloadSimpleIcon, UploadSimpleIcon } from '@phosphor-icons/react'
import * as N3 from 'n3'
import jsonld from 'jsonld'
import { useOntologyStore } from '@/store/ontologyStore'
import { parseTurtle } from '@/lib/rdf'
import type { ProjectFile } from '@/types/index'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadBlob(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function serializeToNQuads(turtleSource: string): Promise<string> {
  const store = new N3.Store()
  await new Promise<void>((resolve, reject) => {
    const parser = new N3.Parser({ format: 'Turtle' })
    parser.parse(turtleSource, (error, quad) => {
      if (error) { reject(error); return }
      if (quad) { store.addQuad(quad) } else { resolve() }
    })
  })

  return new Promise<string>((resolve, reject) => {
    const writer = new N3.Writer({ format: 'N-Quads' })
    for (const quad of store) {
      writer.addQuad(quad)
    }
    writer.end((error, result: string) => {
      if (error) { reject(error); return }
      resolve(result)
    })
  })
}

// ─── Type guard for ProjectFile ────────────────────────────────────────────

function isValidProjectFile(value: unknown): value is ProjectFile {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (v['version'] !== 1) return false
  if (typeof v['ontology'] !== 'object' || v['ontology'] === null) return false
  const ont = v['ontology'] as Record<string, unknown>
  if (typeof ont['turtleSource'] !== 'string') return false
  if (typeof ont['nodePositions'] !== 'object' || ont['nodePositions'] === null) return false
  return true
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

export function Toolbar() {
  const turtleSource = useOntologyStore((s) => s.turtleSource)
  const nodes = useOntologyStore((s) => s.nodes)
  const setTurtleSource = useOntologyStore((s) => s.setTurtleSource)
  const setNodes = useOntologyStore((s) => s.setNodes)
  const setEdges = useOntologyStore((s) => s.setEdges)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)

  // ── Export Turtle ────────────────────────────────────────────────────────
  function handleExportTurtle(): void {
    downloadBlob('ontology.ttl', turtleSource, 'text/turtle')
  }

  // ── Export JSON-LD ───────────────────────────────────────────────────────
  async function handleExportJsonLd(): Promise<void> {
    try {
      const nquads = await serializeToNQuads(turtleSource)
      const doc = await jsonld.fromRDF(nquads)
      downloadBlob('ontology.jsonld', JSON.stringify(doc, null, 2), 'application/ld+json')
    } catch (err) {
      console.error('JSON-LD export failed:', err)
    }
  }

  // ── Export Project ───────────────────────────────────────────────────────
  function handleExportProject(): void {
    const snapshot: ProjectFile = {
      version: 1,
      ontology: {
        turtleSource,
        nodePositions: Object.fromEntries(nodes.map((n) => [n.id, n.position])),
      },
      sources: [],
      mappings: {},
      timestamp: new Date().toISOString(),
    }
    downloadBlob('project.onto-mapper.json', JSON.stringify(snapshot, null, 2), 'application/json')
  }

  // ── Import Project ───────────────────────────────────────────────────────
  function handleImportClick(): void {
    setImportError(null)
    fileInputRef.current?.click()
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so re-selecting same file fires change again
    e.target.value = ''

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(reader.result as string)

        if (!isValidProjectFile(parsed)) {
          setImportError('Invalid project file: missing required fields.')
          return
        }

        if (!window.confirm('Import will replace your current work. Continue?')) {
          return
        }

        const { turtleSource: turtle, nodePositions } = parsed.ontology

        void parseTurtle(turtle).then(({ nodes: parsedNodes, edges: parsedEdges }) => {
          const positioned = parsedNodes.map((n) => ({
            ...n,
            position: nodePositions[n.id] ?? n.position,
          }))
          setTurtleSource(turtle)
          setNodes(positioned)
          setEdges(parsedEdges)
          setImportError(null)
        }).catch(() => {
          setImportError('Failed to parse Turtle in imported project file.')
        })
      } catch {
        setImportError('Failed to read file. Make sure it is valid JSON.')
      }
    }
    reader.onerror = () => {
      setImportError('Failed to read file.')
    }
    reader.readAsText(file)
  }

  return (
    <div
      className="h-10 flex items-center px-4 gap-2 border-b border-border bg-background shrink-0"
      role="toolbar"
      aria-label="Main toolbar"
    >
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        aria-label="Add a new data source"
      >
        <PlusIcon size={14} />
        Add Source
      </Button>

      <div className="flex items-center gap-1 ml-auto">
        {/* Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              aria-label="Export options"
            >
              <ExportIcon size={14} />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem
              className="text-xs gap-2 cursor-pointer"
              onSelect={handleExportTurtle}
            >
              <DownloadSimpleIcon size={14} />
              Export Turtle (.ttl)
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs gap-2 cursor-pointer"
              onSelect={() => { void handleExportJsonLd() }}
            >
              <DownloadSimpleIcon size={14} />
              Export JSON-LD (.jsonld)
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs gap-2 cursor-pointer"
              onSelect={handleExportProject}
            >
              <DownloadSimpleIcon size={14} />
              Export Project (.onto-mapper.json)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Import button + hidden file input */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          aria-label="Import project file"
          onClick={handleImportClick}
        >
          <UploadSimpleIcon size={14} />
          Import
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".onto-mapper.json,.json"
          className="hidden"
          onChange={handleFileSelected}
          aria-hidden="true"
        />
      </div>

      {importError !== null && (
        <p role="alert" className="text-xs text-destructive ml-2">
          {importError}
        </p>
      )}
    </div>
  )
}
