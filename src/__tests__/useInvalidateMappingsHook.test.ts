/**
 * Tests the useInvalidateMappings *hook* — specifically its useEffect + subscribe
 * logic. The underlying store action (removeInvalidMappings) is tested separately
 * in mapping-invalidation.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOntologyStore } from '../store/ontologyStore';
import { useMappingStore } from '../store/mappingStore';
import type { OntologyNode } from '../types/index';

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeNode(id: string, propertyUris: string[]): OntologyNode {
  return {
    id,
    type: 'classNode',
    position: { x: 0, y: 0 },
    data: {
      uri: `http://example.org/${id}`,
      label: id,
      prefix: 'ex',
      properties: propertyUris.map((uri) => ({
        uri,
        label: uri.split('#').pop() ?? uri,
        range: 'xsd:string',
        kind: 'datatype' as const,
      })),
    },
  };
}

function makeMapping(propUri: string) {
  return {
    sourceId: 'src-1',
    sourceClassUri: 'http://example.org/Source',
    sourcePropUri: propUri,
    targetClassUri: 'http://example.org/Class',
    targetPropUri: propUri,
    sourceHandle: `prop_x`,
    targetHandle: `target_prop_x`,
    kind: 'direct' as const,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useOntologyStore.setState({ nodes: [], edges: [], turtleSource: '' });
  useMappingStore.setState({
    mappings: {},
    selectedMappingId: null,
    groups: {},
    _undoStack: [],
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useInvalidateMappings hook — subscription', () => {
  it('does not remove mappings on initial mount', async () => {
    const { useInvalidateMappings } =
      await import('../hooks/useInvalidateMappings');
    const propUri = 'http://example.org#speed';

    useOntologyStore.setState({ nodes: [makeNode('Track', [propUri])] });
    useMappingStore.getState().addMapping(makeMapping(propUri));

    renderHook(() => useInvalidateMappings());

    // Nothing removed — just mounted
    expect(useMappingStore.getState().mappings['src-1']).toHaveLength(1);
  });

  it('removes mappings when a property URI disappears from nodes', async () => {
    const { useInvalidateMappings } =
      await import('../hooks/useInvalidateMappings');
    const propUri = 'http://example.org#speed';

    useOntologyStore.setState({ nodes: [makeNode('Track', [propUri])] });
    useMappingStore.getState().addMapping(makeMapping(propUri));

    renderHook(() => useInvalidateMappings());

    // Remove the property from ontology nodes
    useOntologyStore.setState({ nodes: [makeNode('Track', [])] });

    expect(useMappingStore.getState().mappings['src-1']).toHaveLength(0);
  });

  it('keeps mappings when URIs only grow (no removal)', async () => {
    const { useInvalidateMappings } =
      await import('../hooks/useInvalidateMappings');
    const propA = 'http://example.org#speed';
    const propB = 'http://example.org#altitude';

    useOntologyStore.setState({ nodes: [makeNode('Track', [propA])] });
    useMappingStore.getState().addMapping(makeMapping(propA));

    renderHook(() => useInvalidateMappings());

    // Add a new property — propA still present
    useOntologyStore.setState({ nodes: [makeNode('Track', [propA, propB])] });

    expect(useMappingStore.getState().mappings['src-1']).toHaveLength(1);
  });

  it('keeps mappings when URIs stay identical across state updates', async () => {
    const { useInvalidateMappings } =
      await import('../hooks/useInvalidateMappings');
    const propUri = 'http://example.org#speed';

    useOntologyStore.setState({ nodes: [makeNode('Track', [propUri])] });
    useMappingStore.getState().addMapping(makeMapping(propUri));

    renderHook(() => useInvalidateMappings());

    // Same nodes object re-set — nothing changed
    useOntologyStore.setState({ nodes: [makeNode('Track', [propUri])] });

    expect(useMappingStore.getState().mappings['src-1']).toHaveLength(1);
  });

  it('handles nodes with no properties gracefully', async () => {
    const { useInvalidateMappings } =
      await import('../hooks/useInvalidateMappings');

    useOntologyStore.setState({ nodes: [makeNode('EmptyClass', [])] });

    renderHook(() => useInvalidateMappings());

    // Trigger a state change with more empty nodes — should not throw
    expect(() => {
      useOntologyStore.setState({
        nodes: [makeNode('EmptyClass', []), makeNode('AnotherClass', [])],
      });
    }).not.toThrow();
  });

  it('unsubscribes from ontology store on unmount', async () => {
    const { useInvalidateMappings } =
      await import('../hooks/useInvalidateMappings');
    const propUri = 'http://example.org#speed';

    useOntologyStore.setState({ nodes: [makeNode('Track', [propUri])] });
    useMappingStore.getState().addMapping(makeMapping(propUri));

    const { unmount } = renderHook(() => useInvalidateMappings());
    unmount();

    // After unmount, removing the property should NOT trigger removeInvalidMappings
    useOntologyStore.setState({ nodes: [] });

    // Mapping still present — hook is no longer subscribed
    expect(useMappingStore.getState().mappings['src-1']).toHaveLength(1);
  });
});
