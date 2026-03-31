import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSourcesStore } from '../store/sourcesStore'
import { useMappingStore } from '../store/mappingStore'
import type { SourceNode, OntologyEdge } from '../types/index'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../lib/rdf', () => ({
  parseTurtle: vi.fn(),
  sourceCanvasToTurtle: vi.fn(),
  convertToSourceNodes: vi.fn(),
}))

vi.mock('../lib/jsonToSchema', () => ({
  jsonToSchema: vi.fn(),
}))

vi.mock('../lib/xmlToSchema', () => ({
  xmlToSchema: vi.fn(),
}))

import { parseTurtle, sourceCanvasToTurtle, convertToSourceNodes } from '../lib/rdf'
import { jsonToSchema } from '../lib/jsonToSchema'

const mockParseTurtle = vi.mocked(parseTurtle)
const mockSourceCanvasToTurtle = vi.mocked(sourceCanvasToTurtle)
const mockConvertToSourceNodes = vi.mocked(convertToSourceNodes)
const mockJsonToSchema = vi.mocked(jsonToSchema)

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SOURCE_ID = 'src-001'

const MOCK_SOURCE_NODE: SourceNode = {
  id: 'node_Track',
  type: 'sourceNode',
  position: { x: 100, y: 200 },
  data: {
    uri: 'http://src.test/Track',
    label: 'Track',
    prefix: 'http://src.test/',
    properties: [],
  },
}

const MOCK_EDGE: OntologyEdge = {
  id: 'e_subclass',
  type: 'subclassEdge',
  source: 'node_Track',
  target: 'node_Base',
  data: { predicate: 'rdfs:subClassOf' as const },
}

function seedStore() {
  useSourcesStore.setState({
    sources: [
      {
        id: SOURCE_ID,
        name: 'TestSource',
        order: 0,
        rawData: '{"records":[{"id":1}]}',
        dataFormat: 'json',
        schemaNodes: [MOCK_SOURCE_NODE],
        schemaEdges: [],
        turtleSource: '',
        parseError: null,
      },
    ],
    activeSourceId: SOURCE_ID,
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers()
  seedStore()
  mockParseTurtle.mockReset()
  mockSourceCanvasToTurtle.mockReset()
  mockConvertToSourceNodes.mockReset()
  mockJsonToSchema.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useSourceSync', () => {
  it('(a) editor change → nodes update after debounce', async () => {
    const { useSourceSync } = await import('../hooks/useSourceSync')

    // parseTurtle returns an OntologyNode (classNode type)
    const ontNode = { ...MOCK_SOURCE_NODE, type: 'classNode' as const }
    mockParseTurtle.mockResolvedValue({ nodes: [ontNode], edges: [MOCK_EDGE] })
    mockConvertToSourceNodes.mockReturnValue([MOCK_SOURCE_NODE])

    const { result } = renderHook(() => useSourceSync())

    act(() => {
      result.current.onSourceEditorChange('@prefix src: <http://src.test/> .')
    })

    // Immediate raw write happens synchronously
    const storeAfterWrite = useSourcesStore.getState().sources.find((s) => s.id === SOURCE_ID)
    expect(storeAfterWrite?.turtleSource).toBe('@prefix src: <http://src.test/> .')

    // parseTurtle not called yet (debounce pending)
    expect(mockParseTurtle).not.toHaveBeenCalled()

    // Advance debounce timer
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700)
    })

    expect(mockParseTurtle).toHaveBeenCalledWith('@prefix src: <http://src.test/> .')
    expect(mockConvertToSourceNodes).toHaveBeenCalled()

    const updated = useSourcesStore.getState().sources.find((s) => s.id === SOURCE_ID)
    expect(updated?.schemaNodes).toEqual([MOCK_SOURCE_NODE])
    expect(updated?.schemaEdges).toEqual([MOCK_EDGE])
    expect(updated?.parseError).toBeNull()
  })

  it('(b) canvas change → turtle updates', async () => {
    const { useSourceSync } = await import('../hooks/useSourceSync')

    mockSourceCanvasToTurtle.mockResolvedValue('@prefix src: <http://src.test/> .\nsrc:Track a owl:Class .')

    const { result } = renderHook(() => useSourceSync())

    await act(async () => {
      await result.current.onSourceCanvasChange([MOCK_SOURCE_NODE], [MOCK_EDGE])
    })

    expect(mockSourceCanvasToTurtle).toHaveBeenCalledWith([MOCK_SOURCE_NODE], [MOCK_EDGE], 'TestSource')

    const updated = useSourcesStore.getState().sources.find((s) => s.id === SOURCE_ID)
    expect(updated?.turtleSource).toBe('@prefix src: <http://src.test/> .\nsrc:Track a owl:Class .')
    expect(updated?.parseError).toBeNull()
  })

  it('(c) source switch during debounce → discards stale parse', async () => {
    const { useSourceSync } = await import('../hooks/useSourceSync')

    const SECOND_SOURCE_ID = 'src-002'

    // Add a second source and switch to it during the debounce window
    useSourcesStore.setState((s) => ({
      sources: [
        ...s.sources,
        {
          id: SECOND_SOURCE_ID,
          name: 'OtherSource',
          order: 1,
          rawData: '',
          dataFormat: 'json' as const,
          schemaNodes: [],
          schemaEdges: [],
          turtleSource: '',
          parseError: null,
        },
      ],
    }))

    mockParseTurtle.mockResolvedValue({ nodes: [], edges: [] })
    mockConvertToSourceNodes.mockReturnValue([])

    const { result } = renderHook(() => useSourceSync())

    act(() => {
      result.current.onSourceEditorChange('some turtle')
    })

    // Switch source before debounce fires
    act(() => {
      useSourcesStore.setState({ activeSourceId: SECOND_SOURCE_ID })
    })

    // Advance timer — the parse should run but the result should be discarded
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700)
    })

    // parseTurtle may or may not have been called (depends on timer resolution),
    // but crucially the FIRST source's schemaNodes must not have changed
    const firstSource = useSourcesStore.getState().sources.find((s) => s.id === SOURCE_ID)
    // The first source's schemaNodes should remain unchanged (MOCK_SOURCE_NODE)
    expect(firstSource?.schemaNodes).toEqual([MOCK_SOURCE_NODE])
  })

  it('(d) reset re-generates from rawData and clears mappings', async () => {
    const { useSourceSync } = await import('../hooks/useSourceSync')

    const resultNodes = [MOCK_SOURCE_NODE]
    mockJsonToSchema.mockReturnValue({
      nodes: resultNodes,
      edges: [],
      turtle: '@prefix src: <http://src.test/> .',
      warnings: [],
    })

    // Seed a mapping for this source
    useMappingStore.setState({
      mappings: {
        [SOURCE_ID]: [
          {
            id: 'map-1',
            sourceId: SOURCE_ID,
            sourceClassUri: 'http://src.test/Track',
            sourcePropUri: 'http://src.test/id',
            targetClassUri: 'http://onto/Track',
            targetPropUri: 'http://onto/identifier',
            sourceHandle: 'prop_id',
            targetHandle: 'target_prop_identifier',
            kind: 'direct',
            sparqlConstruct: '',
          },
        ],
      },
    })

    const { result } = renderHook(() => useSourceSync())

    act(() => {
      result.current.resetSourceSchema()
    })

    expect(mockJsonToSchema).toHaveBeenCalledWith('{"records":[{"id":1}]}', 'TestSource')

    const updated = useSourcesStore.getState().sources.find((s) => s.id === SOURCE_ID)
    expect(updated?.schemaNodes).toEqual(resultNodes)
    expect(updated?.turtleSource).toBe('@prefix src: <http://src.test/> .')
    expect(updated?.parseError).toBeNull()

    // Mappings for this source must be cleared
    const mappings = useMappingStore.getState().mappings
    expect(mappings[SOURCE_ID] ?? []).toHaveLength(0)
  })
})
