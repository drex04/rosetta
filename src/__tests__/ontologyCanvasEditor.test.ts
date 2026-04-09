import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useOntologyStore,
  setInvalidateMappingsCallback,
} from '../store/ontologyStore';
import type { OntologyNode, OntologyEdge, PropertyData } from '../types/index';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeNode(id: string, properties: PropertyData[] = []): OntologyNode {
  return {
    id,
    position: { x: 0, y: 0 },
    type: 'classNode',
    data: {
      uri: `http://example.org/${id}`,
      label: id,
      prefix: 'ex',
      properties,
    },
  } as OntologyNode;
}

function makeSubclassEdge(
  id: string,
  source: string,
  target: string,
): OntologyEdge {
  return {
    id,
    source,
    target,
    type: 'subclassEdge',
    data: { predicate: 'rdfs:subClassOf' as const },
  } as OntologyEdge;
}

function makeProperty(uri: string): PropertyData {
  return {
    uri,
    label: uri.split('#').pop() ?? uri,
    range: 'xsd:string',
    kind: 'datatype',
  };
}

// ─── Reset state before each test ────────────────────────────────────────────

beforeEach(() => {
  useOntologyStore.setState({
    nodes: [],
    edges: [],
    turtleSource: '',
    parseError: null,
  });
  setInvalidateMappingsCallback(null);
});

// ─── addNode ─────────────────────────────────────────────────────────────────

describe('addNode', () => {
  it('increases node count by one', () => {
    const store = useOntologyStore.getState();
    store.addNode(makeNode('A'));
    expect(useOntologyStore.getState().nodes).toHaveLength(1);
  });

  it('appends multiple nodes in order', () => {
    const store = useOntologyStore.getState();
    store.addNode(makeNode('A'));
    store.addNode(makeNode('B'));
    const ids = useOntologyStore.getState().nodes.map((n) => n.id);
    expect(ids).toEqual(['A', 'B']);
  });
});

// ─── removeNode ──────────────────────────────────────────────────────────────

describe('removeNode', () => {
  it('removes the node from the nodes array', () => {
    useOntologyStore.getState().addNode(makeNode('A'));
    useOntologyStore.getState().addNode(makeNode('B'));
    useOntologyStore.getState().removeNode('A');
    const ids = useOntologyStore.getState().nodes.map((n) => n.id);
    expect(ids).toEqual(['B']);
  });

  it('cascades: removes edges where node is source', () => {
    useOntologyStore.getState().addNode(makeNode('A'));
    useOntologyStore.getState().addNode(makeNode('B'));
    useOntologyStore.getState().addEdge(makeSubclassEdge('e1', 'A', 'B'));
    useOntologyStore.getState().removeNode('A');
    expect(useOntologyStore.getState().edges).toHaveLength(0);
  });

  it('cascades: removes edges where node is target', () => {
    useOntologyStore.getState().addNode(makeNode('A'));
    useOntologyStore.getState().addNode(makeNode('B'));
    useOntologyStore.getState().addEdge(makeSubclassEdge('e1', 'A', 'B'));
    useOntologyStore.getState().removeNode('B');
    expect(useOntologyStore.getState().edges).toHaveLength(0);
  });

  it('preserves edges not referencing the removed node', () => {
    useOntologyStore.getState().addNode(makeNode('A'));
    useOntologyStore.getState().addNode(makeNode('B'));
    useOntologyStore.getState().addNode(makeNode('C'));
    useOntologyStore.getState().addEdge(makeSubclassEdge('e1', 'A', 'B'));
    useOntologyStore.getState().addEdge(makeSubclassEdge('e2', 'B', 'C'));
    useOntologyStore.getState().removeNode('A');
    expect(useOntologyStore.getState().edges).toHaveLength(1);
    expect(useOntologyStore.getState().edges[0].id).toBe('e2');
  });

  it('fires onInvalidateMappings with property URIs of the removed node', () => {
    const cb = vi.fn();
    setInvalidateMappingsCallback(cb);
    const prop = makeProperty('http://example.org#speed');
    useOntologyStore.getState().addNode(makeNode('A', [prop]));
    useOntologyStore.getState().removeNode('A');
    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(['http://example.org#speed']);
  });

  it('does NOT fire onInvalidateMappings when node has no properties', () => {
    const cb = vi.fn();
    setInvalidateMappingsCallback(cb);
    useOntologyStore.getState().addNode(makeNode('A'));
    useOntologyStore.getState().removeNode('A');
    expect(cb).not.toHaveBeenCalled();
  });

  it('is a no-op for unknown nodeId', () => {
    useOntologyStore.getState().addNode(makeNode('A'));
    useOntologyStore.getState().removeNode('nonexistent');
    expect(useOntologyStore.getState().nodes).toHaveLength(1);
  });
});

// ─── addPropertyToNode ────────────────────────────────────────────────────────

describe('addPropertyToNode', () => {
  it('adds a property to the target node', () => {
    useOntologyStore.getState().addNode(makeNode('A'));
    useOntologyStore
      .getState()
      .addPropertyToNode('A', makeProperty('http://example.org#speed'));
    const node = useOntologyStore.getState().nodes.find((n) => n.id === 'A')!;
    expect(node.data.properties).toHaveLength(1);
    expect(node.data.properties[0].uri).toBe('http://example.org#speed');
  });

  it('does not affect other nodes', () => {
    useOntologyStore.getState().addNode(makeNode('A'));
    useOntologyStore.getState().addNode(makeNode('B'));
    useOntologyStore
      .getState()
      .addPropertyToNode('A', makeProperty('http://example.org#speed'));
    const nodeB = useOntologyStore.getState().nodes.find((n) => n.id === 'B')!;
    expect(nodeB.data.properties).toHaveLength(0);
  });
});

// ─── removePropertyFromNode ───────────────────────────────────────────────────

describe('removePropertyFromNode', () => {
  it('removes the property with the given URI', () => {
    const prop = makeProperty('http://example.org#speed');
    useOntologyStore.getState().addNode(makeNode('A', [prop]));
    useOntologyStore
      .getState()
      .removePropertyFromNode('A', 'http://example.org#speed');
    const node = useOntologyStore.getState().nodes.find((n) => n.id === 'A')!;
    expect(node.data.properties).toHaveLength(0);
  });

  it('preserves other properties on the same node', () => {
    const p1 = makeProperty('http://example.org#speed');
    const p2 = makeProperty('http://example.org#altitude');
    useOntologyStore.getState().addNode(makeNode('A', [p1, p2]));
    useOntologyStore
      .getState()
      .removePropertyFromNode('A', 'http://example.org#speed');
    const node = useOntologyStore.getState().nodes.find((n) => n.id === 'A')!;
    expect(node.data.properties).toHaveLength(1);
    expect(node.data.properties[0].uri).toBe('http://example.org#altitude');
  });

  it('fires onInvalidateMappings with the removed property URI', () => {
    const cb = vi.fn();
    setInvalidateMappingsCallback(cb);
    const prop = makeProperty('http://example.org#speed');
    useOntologyStore.getState().addNode(makeNode('A', [prop]));
    useOntologyStore
      .getState()
      .removePropertyFromNode('A', 'http://example.org#speed');
    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(['http://example.org#speed']);
  });
});

// ─── addEdge ──────────────────────────────────────────────────────────────────

describe('addEdge', () => {
  it('increases edge count by one', () => {
    useOntologyStore.getState().addNode(makeNode('A'));
    useOntologyStore.getState().addNode(makeNode('B'));
    useOntologyStore.getState().addEdge(makeSubclassEdge('e1', 'A', 'B'));
    expect(useOntologyStore.getState().edges).toHaveLength(1);
  });

  it('appends multiple edges in order', () => {
    useOntologyStore.getState().addNode(makeNode('A'));
    useOntologyStore.getState().addNode(makeNode('B'));
    useOntologyStore.getState().addNode(makeNode('C'));
    useOntologyStore.getState().addEdge(makeSubclassEdge('e1', 'A', 'B'));
    useOntologyStore.getState().addEdge(makeSubclassEdge('e2', 'B', 'C'));
    const ids = useOntologyStore.getState().edges.map((e) => e.id);
    expect(ids).toEqual(['e1', 'e2']);
  });
});

// ─── removeEdge ───────────────────────────────────────────────────────────────

describe('removeEdge', () => {
  it('removes the edge with the given id', () => {
    useOntologyStore.getState().addNode(makeNode('A'));
    useOntologyStore.getState().addNode(makeNode('B'));
    useOntologyStore.getState().addEdge(makeSubclassEdge('e1', 'A', 'B'));
    useOntologyStore.getState().removeEdge('e1');
    expect(useOntologyStore.getState().edges).toHaveLength(0);
  });

  it('preserves other edges', () => {
    useOntologyStore.getState().addNode(makeNode('A'));
    useOntologyStore.getState().addNode(makeNode('B'));
    useOntologyStore.getState().addNode(makeNode('C'));
    useOntologyStore.getState().addEdge(makeSubclassEdge('e1', 'A', 'B'));
    useOntologyStore.getState().addEdge(makeSubclassEdge('e2', 'B', 'C'));
    useOntologyStore.getState().removeEdge('e1');
    expect(useOntologyStore.getState().edges).toHaveLength(1);
    expect(useOntologyStore.getState().edges[0].id).toBe('e2');
  });

  it('is a no-op for unknown edgeId', () => {
    useOntologyStore.getState().addNode(makeNode('A'));
    useOntologyStore.getState().addNode(makeNode('B'));
    useOntologyStore.getState().addEdge(makeSubclassEdge('e1', 'A', 'B'));
    useOntologyStore.getState().removeEdge('nonexistent');
    expect(useOntologyStore.getState().edges).toHaveLength(1);
  });
});
