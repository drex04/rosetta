import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useValidationStore, subscribeValidationToMappings } from '../store/validationStore'
import { useMappingStore } from '../store/mappingStore'
import { useSourcesStore } from '../store/sourcesStore'

// Mock validateSource so tests don't run real SHACL logic
vi.mock('../lib/shacl/index', () => ({
  validateSource: vi.fn().mockResolvedValue([]),
}))

import { validateSource } from '../lib/shacl/index'
const mockValidateSource = vi.mocked(validateSource)

// Reset stores between tests
beforeEach(() => {
  useValidationStore.setState({
    results: {},
    loading: false,
    stale: false,
    error: null,
    lastRun: null,
    highlightedCanvasNodeId: null,
  })
  useMappingStore.setState({ mappings: {}, selectedMappingId: null })
  useSourcesStore.setState({ sources: [], activeSourceId: null })
  mockValidateSource.mockResolvedValue([])
})

describe('useValidationStore — setStale', () => {
  it('sets stale to true', () => {
    useValidationStore.getState().setStale(true)
    expect(useValidationStore.getState().stale).toBe(true)
  })

  it('sets stale back to false', () => {
    useValidationStore.setState({ stale: true })
    useValidationStore.getState().setStale(false)
    expect(useValidationStore.getState().stale).toBe(false)
  })
})

describe('useValidationStore — reset', () => {
  it('clears results, stale, and highlightedCanvasNodeId', () => {
    useValidationStore.setState({
      results: { 'src-1': [] },
      stale: true,
      highlightedCanvasNodeId: 'node-42',
      error: 'some error',
      lastRun: 12345,
    })

    useValidationStore.getState().reset()

    const state = useValidationStore.getState()
    expect(state.results).toEqual({})
    expect(state.stale).toBe(false)
    expect(state.highlightedCanvasNodeId).toBeNull()
    expect(state.error).toBeNull()
    expect(state.lastRun).toBeNull()
    expect(state.loading).toBe(false)
  })
})

describe('useValidationStore — setHighlightedCanvasNodeId', () => {
  it('sets and clears highlightedCanvasNodeId', () => {
    useValidationStore.getState().setHighlightedCanvasNodeId('node-1')
    expect(useValidationStore.getState().highlightedCanvasNodeId).toBe('node-1')

    useValidationStore.getState().setHighlightedCanvasNodeId(null)
    expect(useValidationStore.getState().highlightedCanvasNodeId).toBeNull()
  })
})

describe('subscribeValidationToMappings', () => {
  it('sets stale=true when mappingStore changes', () => {
    const unsubscribe = subscribeValidationToMappings()
    expect(useValidationStore.getState().stale).toBe(false)

    // Trigger a change in mappingStore
    useMappingStore.getState().addMapping({
      sourceId: 'src-1',
      sourceClassUri: 'http://ex.org/Foo',
      sourcePropUri: 'http://ex.org/bar',
      targetClassUri: 'http://nato.int/onto#Track',
      targetPropUri: 'http://nato.int/onto#id',
      sourceHandle: 'prop_bar',
      targetHandle: 'target_prop_id',
      kind: 'direct',
      sparqlConstruct: '',
    })

    expect(useValidationStore.getState().stale).toBe(true)
    unsubscribe()
  })
})

describe('useValidationStore — runValidation double-click guard', () => {
  it('returns early without changing state if already loading', async () => {
    useValidationStore.setState({ loading: true, error: null })

    await useValidationStore.getState().runValidation()

    // loading should still be true (not reset by the guard path)
    expect(useValidationStore.getState().loading).toBe(true)
    expect(useValidationStore.getState().error).toBeNull()
    // validateSource should NOT have been called
    expect(mockValidateSource).not.toHaveBeenCalled()
  })
})

describe('useValidationStore — runValidation error handling', () => {
  it('sets error string and loading:false when validateSource throws', async () => {
    // Add a source so runValidation iterates over it
    useSourcesStore.setState({
      sources: [
        {
          id: 'src-err',
          name: 'Error Source',
          order: 0,
          json: '{}',
          schemaNodes: [{ id: 'n1', type: 'sourceNode', position: { x: 0, y: 0 }, data: { uri: 'http://ex.org/Foo', label: 'Foo', properties: [] } }],
          schemaEdges: [],
        },
      ],
      activeSourceId: 'src-err',
    })

    mockValidateSource.mockRejectedValueOnce(new Error('SHACL engine exploded'))

    await useValidationStore.getState().runValidation()

    const state = useValidationStore.getState()
    expect(state.loading).toBe(false)
    expect(state.error).toBe('SHACL engine exploded')
    expect(state.stale).toBe(false)
  })

  it('does not crash when validateSource throws a non-Error', async () => {
    useSourcesStore.setState({
      sources: [
        {
          id: 'src-err2',
          name: 'Bad Source',
          order: 0,
          json: '{}',
          schemaNodes: [{ id: 'n1', type: 'sourceNode', position: { x: 0, y: 0 }, data: { uri: 'http://ex.org/Bar', label: 'Bar', properties: [] } }],
          schemaEdges: [],
        },
      ],
      activeSourceId: 'src-err2',
    })

    mockValidateSource.mockRejectedValueOnce('string error')

    await useValidationStore.getState().runValidation()

    const state = useValidationStore.getState()
    expect(state.loading).toBe(false)
    expect(state.error).toBe('Validation failed')
  })
})

describe('useValidationStore — runValidation success', () => {
  it('populates results and clears loading/stale on success', async () => {
    useSourcesStore.setState({
      sources: [
        {
          id: 'src-ok',
          name: 'OK Source',
          order: 0,
          json: '{}',
          schemaNodes: [{ id: 'n1', type: 'sourceNode', position: { x: 0, y: 0 }, data: { uri: 'http://ex.org/Ok', label: 'Ok', properties: [] } }],
          schemaEdges: [],
        },
      ],
      activeSourceId: 'src-ok',
    })

    const violation = {
      id: 'v1',
      sourceId: 'src-ok',
      targetClassUri: 'http://nato.int/onto#Track',
      targetPropUri: null,
      message: 'missing required property',
      severity: 'Violation',
      canvasNodeId: null,
    }
    mockValidateSource.mockResolvedValueOnce([violation])

    await useValidationStore.getState().runValidation()

    const state = useValidationStore.getState()
    expect(state.loading).toBe(false)
    expect(state.stale).toBe(false)
    expect(state.error).toBeNull()
    expect(state.lastRun).toBeGreaterThan(0)
    expect(state.results['src-ok']).toHaveLength(1)
    expect(state.results['src-ok']![0]!.message).toBe('missing required property')
  })
})
