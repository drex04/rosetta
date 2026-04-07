import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  QuestionIcon,
  InfoIcon,
  FolderSimpleIcon,
  TrashIcon,
  ArrowCounterClockwiseIcon,
  UploadSimpleIcon,
  DownloadSimpleIcon,
  GithubLogoIcon,
  CompassIcon,
} from '@phosphor-icons/react';
import { del } from 'idb-keyval';
import { useOntologyStore, SEED_TURTLE } from '@/store/ontologyStore';
import { useSourcesStore, generateSourceId } from '@/store/sourcesStore';
import { useMappingStore } from '@/store/mappingStore';
import { useValidationStore } from '@/store/validationStore';
import { useUiStore } from '@/store/uiStore';
import sampleShapesTtl from '@/data/sample-shapes.ttl?raw';
import { parseTurtle } from '@/lib/rdf';
import { jsonToSchema } from '@/lib/jsonToSchema';
import { xmlToSchema } from '@/lib/xmlToSchema';
import type { ProjectFile } from '@/types/index';
import sampleNorwegianRaw from '@/data/sample-source-a-norwegian.json?raw';
import sampleGermanRaw from '@/data/sample-source-b-german.json?raw';
import sampleUkRaw from '@/data/sample-source-c-uk.xml?raw';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadBlob(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function isValidProjectFile(value: unknown): value is ProjectFile {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v['version'] !== 1) return false;
  if (typeof v['ontology'] !== 'object' || v['ontology'] === null) return false;
  const ont = v['ontology'] as Record<string, unknown>;
  if (typeof ont['turtleSource'] !== 'string') return false;
  if (typeof ont['nodePositions'] !== 'object' || ont['nodePositions'] === null)
    return false;
  return true;
}

const IDB_KEY = 'rosetta-project';

function resetAllStores(): void {
  useOntologyStore.getState().reset();
  useSourcesStore.getState().reset();
  useMappingStore.getState().reset();
}

// ─── Header ───────────────────────────────────────────────────────────────────

interface HeaderProps {
  onAboutClick: () => void;
}

export function Header({ onAboutClick }: HeaderProps) {
  const setTourRunning = useUiStore((s) => s.setTourRunning);
  const turtleSource = useOntologyStore((s) => s.turtleSource);
  const nodes = useOntologyStore((s) => s.nodes);
  const setTurtleSource = useOntologyStore((s) => s.setTurtleSource);
  const setNodes = useOntologyStore((s) => s.setNodes);
  const setEdges = useOntologyStore((s) => s.setEdges);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // ── New Project ────────────────────────────────────────────────────────────
  async function handleNewProject(): Promise<void> {
    if (!window.confirm('This will clear all work. Continue?')) return;
    resetAllStores();
    await del(IDB_KEY);
  }

  // ── Example Project ────────────────────────────────────────────────────────
  async function handleExampleProject(): Promise<void> {
    if (
      !window.confirm(
        'This will replace your current work with the example project. Continue?',
      )
    )
      return;
    resetAllStores();
    await useOntologyStore.getState().loadTurtle(SEED_TURTLE);

    const resultA = jsonToSchema(sampleNorwegianRaw, 'Norway');
    const resultB = jsonToSchema(sampleGermanRaw, 'Germany');
    const resultC = xmlToSchema(sampleUkRaw, 'United Kingdom');
    const idA = generateSourceId();
    const idB = generateSourceId();
    const idC = generateSourceId();
    const sources = [
      {
        id: idA,
        name: 'Norway',
        order: 0,
        rawData: sampleNorwegianRaw,
        dataFormat: 'json' as const,
        schemaNodes: resultA.nodes,
        schemaEdges: resultA.edges,
        parseError: null,
      },
      {
        id: idB,
        name: 'Germany',
        order: 1,
        rawData: sampleGermanRaw,
        dataFormat: 'json' as const,
        schemaNodes: resultB.nodes,
        schemaEdges: resultB.edges,
        parseError: null,
      },
      {
        id: idC,
        name: 'United Kingdom',
        order: 2,
        rawData: sampleUkRaw,
        dataFormat: 'xml' as const,
        schemaNodes: resultC.nodes,
        schemaEdges: resultC.edges,
        parseError: null,
      },
    ];
    useSourcesStore.setState({ sources, activeSourceId: idA });
    useValidationStore.getState().setUserShapesTurtle(sampleShapesTtl);

    // ── Pre-seed Norway mappings (direct) ────────────────────────────────────
    // Norway source: flat JSON → properties live on the RadarTracks class node
    const radarTracksNode = resultA.nodes.find(
      (n) => n.data.uri === 'http://src_norway_#RadarTracks',
    );
    const airTrackNode = useOntologyStore
      .getState()
      .nodes.find((n) => n.data.uri === 'http://nato.int/onto#AirTrack');

    if (radarTracksNode && airTrackNode) {
      // Pairs of [source property label, target ontology property label]
      const mappingPairs: Array<[string, string]> = [
        ['trkNo', 'trackNumber'],
        ['lat', 'latitude'],
        ['lon', 'longitude'],
        ['spd_kts', 'speedKts'],
        ['time', 'timestamp'],
      ];

      for (const [srcLabel, tgtLabel] of mappingPairs) {
        const srcProp = radarTracksNode.data.properties.find(
          (p) => p.label === srcLabel,
        );
        const tgtProp = airTrackNode.data.properties.find(
          (p) => p.label === tgtLabel,
        );
        if (srcProp && tgtProp) {
          useMappingStore.getState().addMapping({
            sourceId: idA,
            sourceClassUri: radarTracksNode.data.uri,
            sourcePropUri: srcProp.uri,
            targetClassUri: airTrackNode.data.uri,
            targetPropUri: tgtProp.uri,
            sourceHandle: `prop_${srcLabel}`,
            targetHandle: `target_prop_${tgtLabel}`,
            kind: 'direct',
          });
        }
      }
    }
  }

  // ── Export Project ─────────────────────────────────────────────────────────
  function handleExportProject(): void {
    const sourcesState = useSourcesStore.getState();
    const { mappings, groups } = useMappingStore.getState();
    const snapshot: ProjectFile = {
      version: 1,
      ontology: {
        turtleSource,
        nodePositions: Object.fromEntries(nodes.map((n) => [n.id, n.position])),
      },
      sources: sourcesState.sources,
      activeSourceId: sourcesState.activeSourceId,
      mappings,
      groups,
      userShapesTurtle: useValidationStore.getState().snapshot()
        .userShapesTurtle,
      activeRightTab: useUiStore.getState().activeRightTab,
      timestamp: new Date().toISOString(),
    };
    downloadBlob(
      'project.onto-mapper.json',
      JSON.stringify(snapshot, null, 2),
      'application/json',
    );
  }

  // ── Import Project ─────────────────────────────────────────────────────────
  function handleImportClick(): void {
    setImportError(null);
    fileInputRef.current?.click();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(reader.result as string);
        if (!isValidProjectFile(parsed)) {
          setImportError('Invalid project file.');
          return;
        }
        if (!window.confirm('Import will replace your current work. Continue?'))
          return;

        const { turtleSource: turtle, nodePositions } = parsed.ontology;
        void parseTurtle(turtle)
          .then(({ nodes: parsedNodes, edges: parsedEdges }) => {
            const positioned = parsedNodes.map((n) => ({
              ...n,
              position: nodePositions[n.id] ?? n.position,
            }));
            setTurtleSource(turtle);
            setNodes(positioned);
            setEdges(parsedEdges);
            if (Array.isArray(parsed.sources) && parsed.sources.length > 0) {
              const validSources = parsed.sources.filter(
                (s) =>
                  typeof s === 'object' &&
                  s !== null &&
                  typeof s.id === 'string' &&
                  typeof s.name === 'string',
              );
              useSourcesStore.setState({
                sources: validSources,
                activeSourceId: parsed.activeSourceId ?? null,
              });
            }
            if (parsed.mappings && typeof parsed.mappings === 'object') {
              const groups =
                parsed.groups &&
                typeof parsed.groups === 'object' &&
                !Array.isArray(parsed.groups)
                  ? (parsed.groups as Record<
                      string,
                      import('@/types/index').MappingGroup[]
                    >)
                  : undefined;
              useMappingStore.getState().hydrate(parsed.mappings, groups);
            }
            if (typeof parsed.userShapesTurtle === 'string') {
              useValidationStore
                .getState()
                .hydrate({ userShapesTurtle: parsed.userShapesTurtle });
            }
            useUiStore
              .getState()
              .setActiveRightTab(parsed.activeRightTab ?? 'SOURCE');
            setImportError(null);
          })
          .catch(() => {
            setImportError('Failed to parse Turtle in project file.');
          });
      } catch {
        setImportError('Failed to read file.');
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read file.');
    };
    reader.readAsText(file);
  }

  return (
    <header
      className="h-10 flex items-center justify-between px-4 border-b border-slate-700 bg-slate-800 shrink-0"
      role="banner"
    >
      {/* Left: brand */}
      <div className="flex items-center gap-3">
        <span className="font-semibold text-slate-50 text-2xl select-none">
          <span className="sm:hidden">Rosetta</span>
          <span className="hidden sm:inline">Rosetta Workbench</span>
        </span>
      </div>

      {/* Right: project menu + auxiliary buttons */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-300 hover:text-white hover:bg-slate-700"
                  aria-label="Project menu"
                >
                  <FolderSimpleIcon size={13} />
                  <span className="hidden sm:inline">Project</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>New, load, import or export project</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="text-sm">
            <DropdownMenuItem
              className="text-sm gap-2 cursor-pointer"
              onSelect={() => {
                void handleNewProject();
              }}
            >
              <TrashIcon size={14} />
              New Project
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-sm gap-2 cursor-pointer"
              onSelect={() => {
                void handleExampleProject();
              }}
            >
              <ArrowCounterClockwiseIcon size={14} />
              Example Project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-sm gap-2 cursor-pointer"
              onSelect={handleImportClick}
            >
              <UploadSimpleIcon size={14} />
              Import Project
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-sm gap-2 cursor-pointer"
              onSelect={handleExportProject}
            >
              <DownloadSimpleIcon size={14} />
              Export Project (.onto-mapper.json)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {importError !== null && (
          <p role="alert" className="text-sm text-destructive">
            {importError}
          </p>
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white hover:bg-slate-700"
                aria-label="Take the tour"
                onClick={() => setTourRunning(true)}
              >
                <CompassIcon size={13} />
                <span className="hidden sm:inline">Tour</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Take the tour</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white hover:bg-slate-700"
                aria-label="Open help"
              >
                <QuestionIcon size={13} />
                <span className="hidden sm:inline">Help</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open help documentation</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white hover:bg-slate-700"
                aria-label="About Rosetta"
                onClick={onAboutClick}
              >
                <InfoIcon size={13} />
                <span className="hidden sm:inline">About</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>About Rosetta Workbench</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white hover:bg-slate-700"
                aria-label="View source on GitHub"
                onClick={() =>
                  window.open(
                    'https://github.com/drex04/rosetta',
                    '_blank',
                    'noopener,noreferrer',
                  )
                }
              >
                <GithubLogoIcon size={13} />
                <span className="hidden sm:inline">GitHub</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>View source on GitHub</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
