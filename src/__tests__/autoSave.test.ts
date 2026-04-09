import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOntologyStore } from '../store/ontologyStore';
import type { ProjectFile } from '../types/index';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock('../lib/rdf', () => ({
  parseTurtle: vi.fn(),
  canvasToTurtle: vi.fn(),
}));

import { get, set } from 'idb-keyval';
import { parseTurtle } from '../lib/rdf';

const mockGet = vi.mocked(get);
const mockSet = vi.mocked(set);
const mockParseTurtle = vi.mocked(parseTurtle);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_TURTLE = `@prefix nato: <http://nato.int/onto#> .
nato:Track a <http://www.w3.org/2002/07/owl#Class> .`;

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
};

const VALID_PROJECT_FILE: ProjectFile = {
  version: 1,
  ontology: {
    turtleSource: MOCK_TURTLE,
    nodePositions: { node_Track: { x: 200, y: 150 } },
  },
  sources: [],
  mappings: {},
  timestamp: '2026-01-01T00:00:00.000Z',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  useOntologyStore.setState({ nodes: [], edges: [], turtleSource: '' });
  mockGet.mockReset();
  mockSet.mockReset();
  mockParseTurtle.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAutoSave', () => {
  it('auto-save: writes to IDB after 500ms debounce when store changes', async () => {
    mockGet.mockResolvedValue(undefined);
    mockSet.mockResolvedValue(undefined);
    mockParseTurtle.mockResolvedValue({ nodes: [], edges: [] });

    const { useAutoSave } = await import('../hooks/useAutoSave');
    renderHook(() => useAutoSave());

    // Flush pending microtasks: IDB get → parseTurtle → hydratedRef = true
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Trigger a state change after hydration so the save guard allows it
    act(() => {
      useOntologyStore.getState().setTurtleSource(MOCK_TURTLE);
    });

    // Not yet written — debounce hasn't fired
    expect(mockSet).not.toHaveBeenCalled();

    // Advance past the 500ms debounce
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(mockSet).toHaveBeenCalledOnce();
    const [key, value] = mockSet.mock.calls[0] as [string, ProjectFile];
    expect(key).toBe('rosetta-project');
    expect(value.version).toBe(1);
    expect(value.ontology.turtleSource).toBe(MOCK_TURTLE);
    expect(value.sources).toEqual([]);
    expect(value.mappings).toEqual({});
    expect(typeof value.timestamp).toBe('string');
  });

  it('load on mount: restores turtleSource and node positions from IDB', async () => {
    mockGet.mockResolvedValue(VALID_PROJECT_FILE);
    mockSet.mockResolvedValue(undefined);
    mockParseTurtle.mockResolvedValue({ nodes: [MOCK_NODE], edges: [] });

    const { useAutoSave } = await import('../hooks/useAutoSave');

    await act(async () => {
      renderHook(() => useAutoSave());
      // Let mount effects resolve
      await vi.runAllTimersAsync();
    });

    const state = useOntologyStore.getState();
    expect(state.turtleSource).toBe(MOCK_TURTLE);
    // Position should be overlaid from nodePositions
    const trackNode = state.nodes.find((n) => n.id === 'node_Track');
    expect(trackNode?.position).toEqual({ x: 200, y: 150 });
  });

  it('corrupt IDB: restores raw turtle, sets parseError, and logs warning when parse fails', async () => {
    // Return something that will cause parseTurtle to throw
    mockGet.mockResolvedValue(VALID_PROJECT_FILE);
    mockSet.mockResolvedValue(undefined);
    mockParseTurtle.mockRejectedValue(new Error('Invalid Turtle'));

    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    const { useAutoSave } = await import('../hooks/useAutoSave');

    await act(async () => {
      renderHook(() => useAutoSave());
      await vi.runAllTimersAsync();
    });

    // Nodes/edges remain empty (parse failed), but raw text is restored
    const state = useOntologyStore.getState();
    expect(state.nodes).toEqual([]);
    expect(state.edges).toEqual([]);
    expect(state.turtleSource).toBe(MOCK_TURTLE);
    expect(state.parseError).toBe('Invalid Turtle');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('rosetta: restored invalid Turtle from IDB'),
    );

    warnSpy.mockRestore();
  });

  it('IDB write failure: saveStatus becomes error when set rejects', async () => {
    mockGet.mockResolvedValue(undefined);
    mockSet.mockRejectedValue(new Error('QuotaExceededError'));
    mockParseTurtle.mockResolvedValue({ nodes: [], edges: [] });

    const { useAutoSave } = await import('../hooks/useAutoSave');
    const { result } = renderHook(() => useAutoSave());

    // Flush pending microtasks: IDB get → parseTurtle → hydratedRef = true
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Trigger a state change after hydration so the save guard allows it
    act(() => {
      useOntologyStore.getState().setTurtleSource(MOCK_TURTLE);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(result.current.saveStatus).toBe('error');
  });

  it('restores sources, mappings, groups, validation shapes, and activeRightTab from IDB', async () => {
    const sourceA = {
      id: 'src-a',
      name: 'Norway',
      order: 0,
      rawData: '{}',
      dataFormat: 'json' as const,
      schemaNodes: [],
      schemaEdges: [],
      parseError: null,
    };
    const savedFile: ProjectFile = {
      version: 1,
      ontology: { turtleSource: MOCK_TURTLE, nodePositions: {} },
      sources: [sourceA],
      activeSourceId: 'src-a',
      mappings: {
        'src-a': [
          {
            id: 'm1',
            sourceId: 'src-a',
            sourceClassUri: 'http://ex.org/A',
            sourcePropUri: 'http://ex.org/a',
            targetClassUri: 'http://ex.org/B',
            targetPropUri: 'http://ex.org/b',
            sourceHandle: 'prop_a',
            targetHandle: 'target_prop_b',
            kind: 'direct' as const,
          },
        ],
      },
      groups: {},
      userShapesTurtle: '@prefix sh: <http://www.w3.org/ns/shacl#> .',
      activeRightTab: 'MAPPING' as const,
      timestamp: '2026-01-01T00:00:00.000Z',
    };

    mockGet.mockResolvedValue(savedFile);
    mockSet.mockResolvedValue(undefined);
    mockParseTurtle.mockResolvedValue({ nodes: [], edges: [] });

    const { useSourcesStore } = await import('../store/sourcesStore');
    const { useMappingStore } = await import('../store/mappingStore');
    const { useValidationStore } = await import('../store/validationStore');
    const { useUiStore } = await import('../store/uiStore');
    const { useAutoSave } = await import('../hooks/useAutoSave');

    await act(async () => {
      renderHook(() => useAutoSave());
      await vi.runAllTimersAsync();
    });

    const sourcesState = useSourcesStore.getState();
    expect(sourcesState.sources).toHaveLength(1);
    expect(sourcesState.activeSourceId).toBe('src-a');

    const mappingState = useMappingStore.getState();
    expect(mappingState.mappings['src-a']).toBeDefined();

    const validationState = useValidationStore.getState();
    expect(validationState.userShapesTurtle).toBe(
      '@prefix sh: <http://www.w3.org/ns/shacl#> .',
    );

    const uiState = useUiStore.getState();
    expect(uiState.activeRightTab).toBe('MAPPING');
  });

  it('skips dangling activeSourceId when saved source id is not in restored sources', async () => {
    const sourceA = {
      id: 'src-a',
      name: 'Norway',
      order: 0,
      rawData: '{}',
      dataFormat: 'json' as const,
      schemaNodes: [],
      schemaEdges: [],
      parseError: null,
    };
    const savedFile: ProjectFile = {
      version: 1,
      ontology: { turtleSource: MOCK_TURTLE, nodePositions: {} },
      sources: [sourceA],
      activeSourceId: 'src-deleted',
      mappings: {},
      timestamp: '2026-01-01T00:00:00.000Z',
    };

    mockGet.mockResolvedValue(savedFile);
    mockSet.mockResolvedValue(undefined);
    mockParseTurtle.mockResolvedValue({ nodes: [], edges: [] });

    const { useSourcesStore } = await import('../store/sourcesStore');
    const { useAutoSave } = await import('../hooks/useAutoSave');

    await act(async () => {
      renderHook(() => useAutoSave());
      await vi.runAllTimersAsync();
    });

    const { activeSourceId } = useSourcesStore.getState();
    expect(activeSourceId).toBeNull();
  });

  it('logs warning and skips malformed mappings', async () => {
    const savedFile: ProjectFile = {
      version: 1,
      ontology: { turtleSource: MOCK_TURTLE, nodePositions: {} },
      sources: [],
      // Not a valid mappings shape
      mappings: 'bad-value' as any,
      timestamp: '2026-01-01T00:00:00.000Z',
    };

    mockGet.mockResolvedValue(savedFile);
    mockSet.mockResolvedValue(undefined);
    mockParseTurtle.mockResolvedValue({ nodes: [], edges: [] });

    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    const { useAutoSave } = await import('../hooks/useAutoSave');

    await act(async () => {
      renderHook(() => useAutoSave());
      await vi.runAllTimersAsync();
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping malformed mappings'),
    );
    warnSpy.mockRestore();
  });

  it('beforeUnload: prevents navigation when saveStatus is saving', async () => {
    mockGet.mockResolvedValue(undefined);
    mockSet.mockResolvedValue(undefined);
    mockParseTurtle.mockResolvedValue({ nodes: [], edges: [] });

    const { useAutoSave } = await import('../hooks/useAutoSave');
    const { result } = renderHook(() => useAutoSave());

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Trigger a store change to put saveStatus into 'saving'
    act(() => {
      useOntologyStore.getState().setTurtleSource(MOCK_TURTLE);
    });

    // saveStatus should now be 'saving' (debounce started but not resolved)
    expect(result.current.saveStatus).toBe('saving');

    // Verify beforeUnload handler calls preventDefault on saving
    const event = new Event('beforeunload') as BeforeUnloadEvent;
    const preventSpy = vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);
    expect(preventSpy).toHaveBeenCalled();
  });
});
