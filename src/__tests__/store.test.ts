import { describe, it, expect, beforeEach } from 'vitest'
import { useOntologyStore } from '../store/ontologyStore'
import { useSourcesStore } from '../store/sourcesStore'
import { useUiStore } from '../store/uiStore'
import type { Source } from '../store/sourcesStore'
import type { OntologyNode, OntologyEdge } from '../types/index'

// Reset each store between tests
beforeEach(() => {
  useOntologyStore.setState({ nodes: [], edges: [], turtleSource: '' })
  useSourcesStore.setState({ sources: [], activeSourceId: null })
  useUiStore.setState({ activeRightTab: 'SRC' })
})

describe('useOntologyStore', () => {
  it('has correct initial state', () => {
    const state = useOntologyStore.getState()
    expect(state.nodes).toEqual([])
    expect(state.edges).toEqual([])
    expect(state.turtleSource).toBe('')
  })

  it('setNodes updates nodes', () => {
    const nodes = [{ id: 'n1', position: { x: 0, y: 0 }, data: { uri: '', label: '', prefix: '', properties: [] }, type: 'classNode' }] as OntologyNode[]
    useOntologyStore.getState().setNodes(nodes)
    expect(useOntologyStore.getState().nodes).toEqual(nodes)
  })

  it('setEdges updates edges', () => {
    const edges = [{ id: 'e1', source: 'n1', target: 'n2', type: 'subclassEdge', data: { predicate: 'rdfs:subClassOf' as const } }] as OntologyEdge[]
    useOntologyStore.getState().setEdges(edges)
    expect(useOntologyStore.getState().edges).toEqual(edges)
  })

  it('setTurtleSource updates turtleSource', () => {
    useOntologyStore.getState().setTurtleSource('@prefix ex: <http://example.org/> .')
    expect(useOntologyStore.getState().turtleSource).toBe('@prefix ex: <http://example.org/> .')
  })
})

describe('useSourcesStore', () => {
  it('has correct initial state', () => {
    const state = useSourcesStore.getState()
    expect(state.sources).toEqual([])
    expect(state.activeSourceId).toBeNull()
  })

  it('setActiveSourceId updates activeSourceId', () => {
    useSourcesStore.getState().setActiveSourceId('src-1')
    expect(useSourcesStore.getState().activeSourceId).toBe('src-1')
  })

  it('setActiveSourceId accepts null', () => {
    useSourcesStore.getState().setActiveSourceId('src-1')
    useSourcesStore.getState().setActiveSourceId(null)
    expect(useSourcesStore.getState().activeSourceId).toBeNull()
  })

  it('addSource appends a source', () => {
    const source: Source = {
      id: 'src-1',
      name: 'Test Source',
      order: 0,
      json: '{}',
      schemaNodes: [],
      schemaEdges: [],
    }
    useSourcesStore.getState().addSource(source)
    expect(useSourcesStore.getState().sources).toHaveLength(1)
    expect(useSourcesStore.getState().sources[0]).toEqual(source)
  })

  it('addSource appends multiple sources in order', () => {
    const s1: Source = { id: 'src-1', name: 'A', order: 0, json: '{}', schemaNodes: [], schemaEdges: [] }
    const s2: Source = { id: 'src-2', name: 'B', order: 1, json: '{}', schemaNodes: [], schemaEdges: [] }
    useSourcesStore.getState().addSource(s1)
    useSourcesStore.getState().addSource(s2)
    const { sources } = useSourcesStore.getState()
    expect(sources).toHaveLength(2)
    expect(sources[0]!.id).toBe('src-1')
    expect(sources[1]!.id).toBe('src-2')
  })

  it('removeSource removes by id', () => {
    const s1: Source = { id: 'src-1', name: 'A', order: 0, json: '{}', schemaNodes: [], schemaEdges: [] }
    const s2: Source = { id: 'src-2', name: 'B', order: 1, json: '{}', schemaNodes: [], schemaEdges: [] }
    useSourcesStore.getState().addSource(s1)
    useSourcesStore.getState().addSource(s2)
    useSourcesStore.getState().removeSource('src-1')
    const { sources } = useSourcesStore.getState()
    expect(sources).toHaveLength(1)
    expect(sources[0]!.id).toBe('src-2')
  })

  it('removeSource on unknown id is a no-op', () => {
    const s1: Source = { id: 'src-1', name: 'A', order: 0, json: '{}', schemaNodes: [], schemaEdges: [] }
    useSourcesStore.getState().addSource(s1)
    useSourcesStore.getState().removeSource('does-not-exist')
    expect(useSourcesStore.getState().sources).toHaveLength(1)
  })
})

describe('useUiStore', () => {
  it('has correct initial state', () => {
    const state = useUiStore.getState()
    expect(state.activeRightTab).toBe('SRC')
  })

  it('setActiveRightTab updates to MAP', () => {
    useUiStore.getState().setActiveRightTab('MAP')
    expect(useUiStore.getState().activeRightTab).toBe('MAP')
  })

  it('setActiveRightTab updates to OUT', () => {
    useUiStore.getState().setActiveRightTab('OUT')
    expect(useUiStore.getState().activeRightTab).toBe('OUT')
  })

  it('setActiveRightTab updates back to SRC', () => {
    useUiStore.getState().setActiveRightTab('MAP')
    useUiStore.getState().setActiveRightTab('SRC')
    expect(useUiStore.getState().activeRightTab).toBe('SRC')
  })
})
