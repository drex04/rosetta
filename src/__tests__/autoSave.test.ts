import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOntologyStore } from '../store/ontologyStore'
import type { ProjectFile } from '../types/index'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
}))

vi.mock('../lib/rdf', () => ({
  parseTurtle: vi.fn(),
  canvasToTurtle: vi.fn(),
}))

import { get, set } from 'idb-keyval'
import { parseTurtle } from '../lib/rdf'

const mockGet = vi.mocked(get)
const mockSet = vi.mocked(set)
const mockParseTurtle = vi.mocked(parseTurtle)

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_TURTLE = `@prefix nato: <http://nato.int/onto#> .
nato:Track a <http://www.w3.org/2002/07/owl#Class> .`

const MOCK_NODE = {
  id: 'node_Track',
  type: 'classNode' as const,
  position: { x: 0, y: 0 },
  data: {
    uri: 'http://nato.int/onto#Track',
    label: 'Track',
    prefix: 'http://nato.int/onto#',
    properties: [],
  },
}

const VALID_PROJECT_FILE: ProjectFile = {
  version: 1,
  ontology: {
    turtleSource: MOCK_TURTLE,
    nodePositions: { node_Track: { x: 200, y: 150 } },
  },
  sources: [],
  mappings: [],
  timestamp: '2026-01-01T00:00:00.000Z',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers()
  useOntologyStore.setState({ nodes: [], edges: [], turtleSource: '' })
  mockGet.mockReset()
  mockSet.mockReset()
  mockParseTurtle.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useAutoSave', () => {
  it('auto-save: writes to IDB after 500ms debounce when store changes', async () => {
    mockGet.mockResolvedValue(undefined)
    mockSet.mockResolvedValue(undefined)

    const { useAutoSave } = await import('../hooks/useAutoSave')
    renderHook(() => useAutoSave())

    // Trigger a state change
    act(() => {
      useOntologyStore.getState().setTurtleSource(MOCK_TURTLE)
    })

    // Not yet written — debounce hasn't fired
    expect(mockSet).not.toHaveBeenCalled()

    // Advance past the 500ms debounce
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })

    expect(mockSet).toHaveBeenCalledOnce()
    const [key, value] = mockSet.mock.calls[0] as [string, ProjectFile]
    expect(key).toBe('rosetta-project')
    expect(value.version).toBe(1)
    expect(value.ontology.turtleSource).toBe(MOCK_TURTLE)
    expect(value.sources).toEqual([])
    expect(value.mappings).toEqual([])
    expect(typeof value.timestamp).toBe('string')
  })

  it('load on mount: restores turtleSource and node positions from IDB', async () => {
    mockGet.mockResolvedValue(VALID_PROJECT_FILE)
    mockSet.mockResolvedValue(undefined)
    mockParseTurtle.mockResolvedValue({ nodes: [MOCK_NODE], edges: [] })

    const { useAutoSave } = await import('../hooks/useAutoSave')

    await act(async () => {
      renderHook(() => useAutoSave())
      // Let mount effects resolve
      await vi.runAllTimersAsync()
    })

    const state = useOntologyStore.getState()
    expect(state.turtleSource).toBe(MOCK_TURTLE)
    // Position should be overlaid from nodePositions
    const trackNode = state.nodes.find(n => n.id === 'node_Track')
    expect(trackNode?.position).toEqual({ x: 200, y: 150 })
  })

  it('corrupt IDB: logs warning and leaves store unchanged when data is invalid', async () => {
    // Return something that will cause parseTurtle to throw
    mockGet.mockResolvedValue(VALID_PROJECT_FILE)
    mockSet.mockResolvedValue(undefined)
    mockParseTurtle.mockRejectedValue(new Error('Invalid Turtle'))

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const { useAutoSave } = await import('../hooks/useAutoSave')

    await act(async () => {
      renderHook(() => useAutoSave())
      await vi.runAllTimersAsync()
    })

    // Store should remain unchanged (empty)
    const state = useOntologyStore.getState()
    expect(state.nodes).toEqual([])
    expect(state.edges).toEqual([])

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('rosetta: failed to restore project from IDB'),
    )

    warnSpy.mockRestore()
  })

  it('IDB write failure: saveStatus becomes error when set rejects', async () => {
    mockGet.mockResolvedValue(undefined)
    mockSet.mockRejectedValue(new Error('QuotaExceededError'))

    const { useAutoSave } = await import('../hooks/useAutoSave')
    const { result } = renderHook(() => useAutoSave())

    // Trigger a state change
    act(() => {
      useOntologyStore.getState().setTurtleSource(MOCK_TURTLE)
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })

    expect(result.current.saveStatus).toBe('error')
  })
})
