import { describe, it, expect, beforeEach } from 'vitest';
import { useOntologyStore } from '../store/ontologyStore';
import { useMappingStore } from '../store/mappingStore';
import type { OntologyNode } from '../types/index';

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

/**
 * Creates a mapping where both sourcePropUri and targetPropUri are the same URI.
 * removeInvalidMappings checks both ends, so valid sets must include both.
 */
function makeMapping(propUri: string) {
  return {
    sourceId: 'src-1',
    sourceClassUri: 'http://example.org/Source',
    sourcePropUri: propUri,
    targetClassUri: 'http://example.org/Class',
    targetPropUri: propUri,
    sourceHandle: `prop_${propUri.split('#').pop() ?? 'x'}`,
    targetHandle: `target_prop_${propUri.split('#').pop() ?? 'x'}`,
    kind: 'direct' as const,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useOntologyStore.setState({ nodes: [], edges: [] });
  useMappingStore.setState({
    mappings: {},
    selectedMappingId: null,
    groups: {},
    _undoStack: [],
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useInvalidateMappings — property deletion', () => {
  it('removes a mapping when the target property URI is deleted from ontology nodes', () => {
    const propA = 'http://nato.int/onto#speed';

    // Set up ontology with propA
    useOntologyStore.setState({ nodes: [makeNode('Track', [propA])] });

    // Create a mapping referencing propA
    const mappingStore = useMappingStore.getState();
    mappingStore.addMapping(makeMapping(propA));
    expect(useMappingStore.getState().mappings['src-1']).toHaveLength(1);

    // Simulate invalidation: remove propA from nodes
    const currentUris = new Set<string>(); // propA no longer present
    useMappingStore.getState().removeInvalidMappings(currentUris);

    expect(useMappingStore.getState().mappings['src-1']).toHaveLength(0);
  });

  it('keeps a mapping when its target property URI is still in ontology nodes', () => {
    const propA = 'http://nato.int/onto#speed';

    useOntologyStore.setState({ nodes: [makeNode('Track', [propA])] });

    useMappingStore.getState().addMapping(makeMapping(propA));
    expect(useMappingStore.getState().mappings['src-1']).toHaveLength(1);

    // propA still valid
    const currentUris = new Set([propA]);
    useMappingStore.getState().removeInvalidMappings(currentUris);

    expect(useMappingStore.getState().mappings['src-1']).toHaveLength(1);
  });
});

describe('useInvalidateMappings — property rename', () => {
  it('removes a mapping referencing old URI when property is renamed (old URI disappears)', () => {
    const propA = 'http://nato.int/onto#speed';
    const propB = 'http://nato.int/onto#velocity';

    // Ontology initially has propA
    useOntologyStore.setState({ nodes: [makeNode('Track', [propA])] });

    // Mapping references propA
    useMappingStore.getState().addMapping(makeMapping(propA));
    expect(useMappingStore.getState().mappings['src-1']).toHaveLength(1);

    // Rename: propA → propB (propA disappears, propB appears)
    useOntologyStore.setState({ nodes: [makeNode('Track', [propB])] });

    // Hook logic: current valid URIs are now {propB}; propA is gone
    const currentUris = new Set([propB]);
    useMappingStore.getState().removeInvalidMappings(currentUris);

    expect(useMappingStore.getState().mappings['src-1']).toHaveLength(0);
  });

  it('removes only the mapping for the renamed property, keeps others', () => {
    const propA = 'http://nato.int/onto#speed';
    const propB = 'http://nato.int/onto#velocity';
    const propC = 'http://nato.int/onto#altitude';

    useOntologyStore.setState({ nodes: [makeNode('Track', [propA, propC])] });

    useMappingStore.getState().addMapping(makeMapping(propA));
    useMappingStore.getState().addMapping(makeMapping(propC));
    expect(useMappingStore.getState().mappings['src-1']).toHaveLength(2);

    // propA renamed to propB; propC remains
    const currentUris = new Set([propB, propC]);
    useMappingStore.getState().removeInvalidMappings(currentUris);

    const remaining = useMappingStore.getState().mappings['src-1'] ?? [];
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.targetPropUri).toBe(propC);
  });
});

describe('useInvalidateMappings — undo', () => {
  it('undoLastRemoval restores the removed mappings', () => {
    const propA = 'http://nato.int/onto#speed';

    useOntologyStore.setState({ nodes: [makeNode('Track', [propA])] });
    useMappingStore.getState().addMapping(makeMapping(propA));

    useMappingStore.getState().removeInvalidMappings(new Set());
    expect(useMappingStore.getState().mappings['src-1']).toHaveLength(0);

    useMappingStore.getState().undoLastRemoval();
    expect(useMappingStore.getState().mappings['src-1']).toHaveLength(1);
    expect(
      useMappingStore.getState().mappings['src-1']![0]!.targetPropUri,
    ).toBe(propA);
  });
});
