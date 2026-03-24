import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCanvasData } from '../hooks/useCanvasData'
import { useOntologyStore } from '../store/ontologyStore'
import { useSourcesStore } from '../store/sourcesStore'
import type { Edge, Node } from '@xyflow/react'
import type { Source } from '../store/sourcesStore'
import type { OntologyEdge, OntologyNode } from '../types/index'

beforeEach(() => {
  useOntologyStore.setState({ nodes: [], edges: [], turtleSource: '' })
  useSourcesStore.setState({ sources: [], activeSourceId: null })
})

describe('useCanvasData', () => {
  it('case 1: empty stores → returns empty nodes and edges', () => {
    const { result } = renderHook(() => useCanvasData())
    expect(result.current.nodes).toEqual([])
    expect(result.current.edges).toEqual([])
  })

  it('case 2: active source matching activeSourceId → merges master + source nodes/edges', () => {
    const masterNode = { id: 'master-n1', type: 'classNode' as const, position: { x: 0, y: 0 }, data: { label: 'Master', uri: '', prefix: '', properties: [] } } as OntologyNode
    const masterEdge = { id: 'master-e1', source: 'master-n1', target: 'master-n2', type: 'subclassEdge' as const, data: { predicate: 'rdfs:subClassOf' as const } } as OntologyEdge
    useOntologyStore.setState({ nodes: [masterNode], edges: [masterEdge], turtleSource: '' })

    const sourceNode: Node = { id: 'src-n1', position: { x: 100, y: 100 }, data: { label: 'Source' } }
    const sourceEdge: Edge = { id: 'src-e1', source: 'src-n1', target: 'src-n2' }
    const source: Source = {
      id: 'src-1',
      name: 'Test Source',
      order: 0,
      json: '{}',
      schemaNodes: [sourceNode],
      schemaEdges: [sourceEdge],
    }
    useSourcesStore.setState({ sources: [source], activeSourceId: 'src-1' })

    const { result } = renderHook(() => useCanvasData())
    expect(result.current.nodes).toHaveLength(2)
    expect(result.current.nodes[0]).toEqual(masterNode)
    expect(result.current.nodes[1]).toEqual(sourceNode)
    expect(result.current.edges).toHaveLength(2)
    expect(result.current.edges[0]).toEqual(masterEdge)
    expect(result.current.edges[1]).toEqual(sourceEdge)
  })

  it('case 3: activeSourceId set but source not found → returns master nodes only, no crash', () => {
    const masterNode = { id: 'master-n1', type: 'classNode' as const, position: { x: 0, y: 0 }, data: { label: 'Master', uri: '', prefix: '', properties: [] } } as OntologyNode
    const masterEdge = { id: 'master-e1', source: 'master-n1', target: 'master-n2', type: 'subclassEdge' as const, data: { predicate: 'rdfs:subClassOf' as const } } as OntologyEdge
    useOntologyStore.setState({ nodes: [masterNode], edges: [masterEdge], turtleSource: '' })

    // activeSourceId points to a source that doesn't exist (e.g. after deletion)
    useSourcesStore.setState({ sources: [], activeSourceId: 'deleted-src-id' })

    const { result } = renderHook(() => useCanvasData())
    expect(result.current.nodes).toHaveLength(1)
    expect(result.current.nodes[0]).toEqual(masterNode)
    expect(result.current.edges).toHaveLength(1)
    expect(result.current.edges[0]).toEqual(masterEdge)
  })
})
