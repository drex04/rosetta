import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOntologyStore } from '../store/ontologyStore';
import type { OntologyNode, OntologyEdge } from '../types/index';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../lib/rdf', () => ({
  parseTurtle: vi.fn(),
  canvasToTurtle: vi.fn(),
}));

import { parseTurtle, canvasToTurtle } from '../lib/rdf';

const mockParseTurtle = vi.mocked(parseTurtle);
const mockCanvasToTurtle = vi.mocked(canvasToTurtle);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_NODE: OntologyNode = {
  id: 'node_Track',
  type: 'classNode',
  position: { x: 0, y: 0 },
  data: {
    uri: 'http://nato.int/onto#Track',
    label: 'Track',
    prefix: 'http://nato.int/onto#',
    properties: [],
  },
};

const MOCK_EDGE: OntologyEdge = {
  id: 'e_node_AirTrack_subclassEdge_node_Track',
  type: 'subclassEdge',
  source: 'node_AirTrack',
  target: 'node_Track',
  data: { predicate: 'rdfs:subClassOf' as const },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  useOntologyStore.setState({ nodes: [], edges: [], turtleSource: '' });
  mockParseTurtle.mockReset();
  mockCanvasToTurtle.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useOntologySync', () => {
  it('no circular update: onEditorChange calls parseTurtle but does not trigger canvasToTurtle', async () => {
    const { useOntologySync } = await import('../hooks/useOntologySync');

    mockParseTurtle.mockResolvedValue({ nodes: [MOCK_NODE], edges: [] });

    const { result } = renderHook(() => useOntologySync());

    act(() => {
      result.current.onEditorChange('some turtle text');
    });

    // Debounce not yet fired — parseTurtle should not have been called yet
    expect(mockParseTurtle).not.toHaveBeenCalled();

    // Advance the debounce timer (600ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    expect(mockParseTurtle).toHaveBeenCalledWith('some turtle text');
    // canvasToTurtle must NOT be called during editor→canvas path
    expect(mockCanvasToTurtle).not.toHaveBeenCalled();
  });

  it('editor parse failure: invalid Turtle leaves nodes/edges unchanged', async () => {
    const { useOntologySync } = await import('../hooks/useOntologySync');

    // Set up pre-existing nodes so we can verify they're not cleared
    useOntologyStore.setState({
      nodes: [MOCK_NODE],
      edges: [MOCK_EDGE],
      turtleSource: 'good turtle',
    });

    // parseTurtle rejects on bad input
    mockParseTurtle.mockRejectedValue(new Error('Parse error'));

    const { result } = renderHook(() => useOntologySync());

    act(() => {
      result.current.onEditorChange('invalid turtle !!!');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    // turtleSource is updated immediately (raw write), but nodes/edges stay
    const state = useOntologyStore.getState();
    expect(state.nodes).toEqual([MOCK_NODE]);
    expect(state.edges).toEqual([MOCK_EDGE]);
  });

  it('canvas change: onCanvasChange calls canvasToTurtle and updates turtleSource', async () => {
    const { useOntologySync } = await import('../hooks/useOntologySync');

    mockCanvasToTurtle.mockResolvedValue(
      '@prefix nato: <http://nato.int/onto#> .',
    );

    const { result } = renderHook(() => useOntologySync());

    await act(async () => {
      await result.current.onCanvasChange([MOCK_NODE], [MOCK_EDGE]);
    });

    expect(mockCanvasToTurtle).toHaveBeenCalledWith([MOCK_NODE], [MOCK_EDGE]);
    expect(useOntologyStore.getState().turtleSource).toBe(
      '@prefix nato: <http://nato.int/onto#> .',
    );
  });

  it('canvas change clears pending editor state after a successful overwrite', async () => {
    const { useOntologySync } = await import('../hooks/useOntologySync');

    mockParseTurtle.mockRejectedValue(new Error('Parse error'));
    mockCanvasToTurtle.mockResolvedValue('@prefix ex: <http://example.org/> .');

    const { result } = renderHook(() => useOntologySync());

    act(() => {
      result.current.onEditorChange('invalid turtle');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    expect(result.current.hasPendingEdits.current).toBe(true);

    await act(async () => {
      await result.current.onCanvasChange([MOCK_NODE], [MOCK_EDGE]);
    });

    expect(result.current.hasPendingEdits.current).toBe(false);
  });
});
