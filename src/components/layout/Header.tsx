import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  QuestionIcon,
  InfoIcon,
  GithubLogoIcon,
  CircleNotchIcon,
  CheckCircleIcon,
  WarningIcon,
  FolderSimpleIcon,
  TrashIcon,
  ArrowCounterClockwiseIcon,
  UploadSimpleIcon,
  DownloadSimpleIcon,
} from '@phosphor-icons/react'
import { del } from 'idb-keyval'
import { useOntologyStore, SEED_TURTLE } from '@/store/ontologyStore'
import { useSourcesStore, generateSourceId } from '@/store/sourcesStore'
import { useMappingStore } from '@/store/mappingStore'
import { parseTurtle } from '@/lib/rdf'
import { jsonToSchema } from '@/lib/jsonToSchema'
import { generateConstruct } from '@/lib/sparql'
import type { ProjectFile } from '@/types/index'
import type { SaveStatus } from '@/hooks/useAutoSave'
import sampleNorwegianRaw from '@/data/sample-source-a-norwegian.json?raw'
import sampleGermanRaw from '@/data/sample-source-b-german.json?raw'

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

const IDB_KEY = 'rosetta-project'

function resetAllStores(): void {
  useOntologyStore.getState().reset()
  useSourcesStore.getState().reset()
  useMappingStore.getState().reset()
}

// ─── Header ───────────────────────────────────────────────────────────────────

interface HeaderProps {
  saveStatus: SaveStatus
}

export function Header({ saveStatus }: HeaderProps) {
  const turtleSource = useOntologyStore((s) => s.turtleSource)
  const nodes = useOntologyStore((s) => s.nodes)
  const setTurtleSource = useOntologyStore((s) => s.setTurtleSource)
  const setNodes = useOntologyStore((s) => s.setNodes)
  const setEdges = useOntologyStore((s) => s.setEdges)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)

  // ── New Project ────────────────────────────────────────────────────────────
  async function handleNewProject(): Promise<void> {
    if (!window.confirm('This will clear all work. Continue?')) return
    resetAllStores()
    await del(IDB_KEY)
  }

  // ── Example Project ────────────────────────────────────────────────────────
  async function handleExampleProject(): Promise<void> {
    if (!window.confirm('This will replace your current work with the example project. Continue?')) return
    resetAllStores()
    await useOntologyStore.getState().loadTurtle(SEED_TURTLE)

    const resultA = jsonToSchema(sampleNorwegianRaw, 'Norway')
    const resultB = jsonToSchema(sampleGermanRaw, 'Germany')
    const idA = generateSourceId()
    const idB = generateSourceId()
    const sources = [
      { id: idA, name: 'Norway', order: 0, json: sampleNorwegianRaw, schemaNodes: resultA.nodes, schemaEdges: resultA.edges },
      { id: idB, name: 'Germany', order: 1, json: sampleGermanRaw, schemaNodes: resultB.nodes, schemaEdges: resultB.edges },
    ]
    useSourcesStore.setState({ sources, activeSourceId: idA })

    // Add a seed mapping: Norway spd_kts → AirTrack speed
    const radarTracksNode = resultA.nodes.find((n) => n.data.uri === 'http://src_norway_#RadarTracks')
    const airTrackNode = useOntologyStore.getState().nodes.find((n) => n.data.uri === 'http://nato.int/onto#AirTrack')
    if (radarTracksNode && airTrackNode) {
      const srcProp = radarTracksNode.data.properties.find((p) => p.label === 'spd_kts')
      const tgtProp = airTrackNode.data.properties.find((p) => p.label === 'speed')
      if (srcProp && tgtProp) {
        const sparqlConstruct = generateConstruct({
          sourceId: idA,
          sourceClassUri: radarTracksNode.data.uri,
          sourcePropUri: srcProp.uri,
          sourceHandle: 'prop_spd_kts',
          targetClassUri: airTrackNode.data.uri,
          targetPropUri: tgtProp.uri,
          targetHandle: 'target_prop_speed',
        })
        useMappingStore.getState().addMapping({
          sourceId: idA,
          sourceClassUri: radarTracksNode.data.uri,
          sourcePropUri: srcProp.uri,
          targetClassUri: airTrackNode.data.uri,
          targetPropUri: tgtProp.uri,
          sourceHandle: 'prop_spd_kts',
          targetHandle: 'target_prop_speed',
          kind: 'direct',
          sparqlConstruct,
        })
      }
    }
  }

  // ── Export Project ─────────────────────────────────────────────────────────
  function handleExportProject(): void {
    const sourcesState = useSourcesStore.getState()
    const mappings = useMappingStore.getState().mappings
    const snapshot: ProjectFile = {
      version: 1,
      ontology: {
        turtleSource,
        nodePositions: Object.fromEntries(nodes.map((n) => [n.id, n.position])),
      },
      sources: sourcesState.sources,
      activeSourceId: sourcesState.activeSourceId,
      mappings,
      timestamp: new Date().toISOString(),
    }
    downloadBlob('project.onto-mapper.json', JSON.stringify(snapshot, null, 2), 'application/json')
  }

  // ── Import Project ─────────────────────────────────────────────────────────
  function handleImportClick(): void {
    setImportError(null)
    fileInputRef.current?.click()
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(reader.result as string)
        if (!isValidProjectFile(parsed)) {
          setImportError('Invalid project file.')
          return
        }
        if (!window.confirm('Import will replace your current work. Continue?')) return

        const { turtleSource: turtle, nodePositions } = parsed.ontology
        void parseTurtle(turtle).then(({ nodes: parsedNodes, edges: parsedEdges }) => {
          const positioned = parsedNodes.map((n) => ({
            ...n,
            position: nodePositions[n.id] ?? n.position,
          }))
          setTurtleSource(turtle)
          setNodes(positioned)
          setEdges(parsedEdges)
          if (Array.isArray(parsed.sources) && parsed.sources.length > 0) {
            useSourcesStore.setState({
              sources: parsed.sources,
              activeSourceId: parsed.activeSourceId ?? null,
            })
          }
          if (parsed.mappings && typeof parsed.mappings === 'object') {
            useMappingStore.getState().hydrate(parsed.mappings)
          }
          setImportError(null)
        }).catch(() => {
          setImportError('Failed to parse Turtle in project file.')
        })
      } catch {
        setImportError('Failed to read file.')
      }
    }
    reader.onerror = () => { setImportError('Failed to read file.') }
    reader.readAsText(file)
  }

  return (
    <header
      className="h-12 flex items-center justify-between px-4 border-b border-border bg-background shrink-0"
      role="banner"
    >
      {/* Left: brand */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tracking-tight text-foreground select-none">
          Rosetta
        </span>
      </div>

      {/* Right: save status + project menu + auxiliary buttons */}
      <div className="flex items-center gap-2">
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1 text-xs text-foreground px-2 py-0.5 rounded-full bg-muted" aria-live="polite">
            <CircleNotchIcon size={14} className="animate-spin" />
            Saving…
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1 text-xs text-foreground px-2 py-0.5 rounded-full bg-muted" aria-live="polite">
            <CheckCircleIcon size={14} className="text-green-500" />
            Saved
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="flex items-center gap-1 text-xs text-amber-500 px-2 py-0.5 rounded-full bg-muted" aria-live="polite">
            <WarningIcon size={14} />
            Save failed
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Project menu"
            >
              <FolderSimpleIcon size={13} />
              Project
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem
              className="text-xs gap-2 cursor-pointer"
              onSelect={() => { void handleNewProject() }}
            >
              <TrashIcon size={14} />
              New Project
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-xs gap-2 cursor-pointer"
              onSelect={() => { void handleExampleProject() }}
            >
              <ArrowCounterClockwiseIcon size={14} />
              Example Project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs gap-2 cursor-pointer"
              onSelect={handleImportClick}
            >
              <UploadSimpleIcon size={14} />
              Import Project
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

        {importError !== null && (
          <p role="alert" className="text-xs text-destructive">{importError}</p>
        )}

        {/* Hidden file input for import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".onto-mapper.json,.json"
          className="hidden"
          onChange={handleFileSelected}
          aria-hidden="true"
        />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            aria-label="View source on GitHub"
            onClick={() => window.open('https://github.com/drex04/rosetta', '_blank', 'noopener,noreferrer')}
          >
            <GithubLogoIcon size={16} />
            <span className="text-xs">GitHub</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            aria-label="Open help"
          >
            <QuestionIcon size={16} />
            <span className="text-xs">Help</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            aria-label="About Rosetta"
          >
            <InfoIcon size={16} />
            <span className="text-xs">About</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
