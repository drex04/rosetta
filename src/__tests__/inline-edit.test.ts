import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useOntologyStore } from '../store/ontologyStore';
import { useSourcesStore } from '../store/sourcesStore';
import type { OntologyNode, PropertyData } from '../types/index';
import type { Source } from '../store/sourcesStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeNode(id: string, properties: PropertyData[] = []): OntologyNode {
  return {
    id,
    position: { x: 0, y: 0 },
    type: 'classNode',
    data: {
      uri: `ex:${id}`,
      label: id,
      prefix: 'ex',
      properties,
    },
  } as OntologyNode;
}

function makeProperty(uri: string, label?: string): PropertyData {
  return {
    uri,
    label: label ?? uri.split(':').pop() ?? uri,
    range: 'xsd:string',
    kind: 'datatype',
  };
}

function makeSource(id: string, nodes: OntologyNode[] = []): Source {
  return {
    id,
    name: `Source-${id}`,
    order: 0,
    rawData: '{}',
    dataFormat: 'json',
    schemaNodes: nodes as Source['schemaNodes'],
    schemaEdges: [],
    turtleSource: '',
    parseError: null,
  };
}

// ─── Reset state before each test ────────────────────────────────────────────

beforeEach(() => {
  useOntologyStore.setState({
    nodes: [],
    edges: [],
    turtleSource: '',
    parseError: null,
    onInvalidateMappings: null,
  });
  useSourcesStore.setState({ sources: [], activeSourceId: null });
});

// ─── updateNode ───────────────────────────────────────────────────────────────

describe('updateNode', () => {
  it('updates label and URI correctly on the target node', () => {
    useOntologyStore.getState().addNode(makeNode('test-1'));
    useOntologyStore
      .getState()
      .updateNode('test-1', { label: 'NewLabel', uri: 'ex:NewClass' });

    const node = useOntologyStore
      .getState()
      .nodes.find((n) => n.id === 'test-1')!;
    expect(node.data.label).toBe('NewLabel');
    expect(node.data.uri).toBe('ex:NewClass');
  });

  it('is a safe no-op when nodeId does not exist', () => {
    useOntologyStore.getState().addNode(makeNode('test-1'));
    const before = useOntologyStore.getState().nodes.slice();

    useOntologyStore.getState().updateNode('nonexistent', { label: 'Ghost' });

    const after = useOntologyStore.getState().nodes;
    expect(after).toHaveLength(before.length);
    expect(after[0].data.label).toBe('test-1');
  });
});

// ─── updateProperty ───────────────────────────────────────────────────────────

describe('updateProperty', () => {
  it('updates property label only and does NOT fire onInvalidateMappings', () => {
    const cb = vi.fn();
    useOntologyStore.setState({ onInvalidateMappings: cb });
    useOntologyStore
      .getState()
      .addNode(makeNode('test-1', [makeProperty('ex:name', 'name')]));

    useOntologyStore
      .getState()
      .updateProperty('test-1', 'ex:name', { label: 'fullName' });

    const node = useOntologyStore
      .getState()
      .nodes.find((n) => n.id === 'test-1')!;
    expect(node.data.properties[0].label).toBe('fullName');
    expect(node.data.properties[0].uri).toBe('ex:name');
    expect(cb).not.toHaveBeenCalled();
  });

  it('fires onInvalidateMappings with the old URI when property URI changes', () => {
    const cb = vi.fn();
    useOntologyStore.setState({ onInvalidateMappings: cb });
    useOntologyStore
      .getState()
      .addNode(makeNode('test-1', [makeProperty('ex:name', 'name')]));

    useOntologyStore
      .getState()
      .updateProperty('test-1', 'ex:name', { uri: 'ex:fullName' });

    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(['ex:name']);
  });
});

// ─── updateSchemaNode ─────────────────────────────────────────────────────────

describe('updateSchemaNode', () => {
  it('updates the correct node in the correct source', () => {
    const node = makeNode('sn-1');
    useSourcesStore.getState().addSource(makeSource('src-1', [node]));

    useSourcesStore.getState().updateSchemaNode('src-1', 'sn-1', {
      label: 'Updated',
      uri: 'ex:Updated',
    });

    const src = useSourcesStore
      .getState()
      .sources.find((s) => s.id === 'src-1')!;
    const updated = src.schemaNodes.find((n) => n.id === 'sn-1')!;
    expect(updated.data.label).toBe('Updated');
    expect(updated.data.uri).toBe('ex:Updated');
  });

  it('is a safe no-op when nodeId does not exist in the source', () => {
    const node = makeNode('sn-1');
    useSourcesStore.getState().addSource(makeSource('src-1', [node]));

    useSourcesStore
      .getState()
      .updateSchemaNode('src-1', 'nonexistent', { label: 'Ghost' });

    const src = useSourcesStore
      .getState()
      .sources.find((s) => s.id === 'src-1')!;
    expect(src.schemaNodes).toHaveLength(1);
    expect(src.schemaNodes[0].data.label).toBe('sn-1');
  });
});

// ─── Validation logic ─────────────────────────────────────────────────────────
// These are tested as pure functions mirroring the logic inside ClassNode.tsx

describe('commitHeader validation logic', () => {
  function validateHeader(label: string, uri: string): string {
    if (!label.trim()) return 'Label is required';
    if (!uri.trim().includes(':')) return 'URI must contain a colon';
    return '';
  }

  it('empty label produces an error', () => {
    expect(validateHeader('', 'ex:Foo')).toBe('Label is required');
    expect(validateHeader('   ', 'ex:Foo')).toBe('Label is required');
  });

  it('URI without colon produces an error', () => {
    expect(validateHeader('Foo', 'FooClass')).toBe('URI must contain a colon');
    expect(validateHeader('Foo', '')).toBe('URI must contain a colon');
  });

  it('valid label and URI produce no error', () => {
    expect(validateHeader('Track', 'nato:Track')).toBe('');
    expect(validateHeader('Track', 'http://example.org/Track')).toBe('');
  });
});

describe('commitProp validation logic', () => {
  interface Prop {
    uri: string;
    label: string;
  }

  function validateProp(
    draftLabel: string,
    editingPropUri: string,
    siblings: Prop[],
  ): string {
    if (!draftLabel.trim()) return 'Label required';
    if (
      siblings.some(
        (p) => p.uri !== editingPropUri && p.label === draftLabel.trim(),
      )
    ) {
      return 'Duplicate property name';
    }
    return '';
  }

  it('empty label produces an error', () => {
    expect(validateProp('', 'ex:name', [])).toBe('Label required');
  });

  it('duplicate property name among siblings produces an error', () => {
    const siblings = [
      { uri: 'ex:name', label: 'name' },
      { uri: 'ex:speed', label: 'speed' },
    ];
    // editing 'ex:name', trying to rename to 'speed' which is taken by 'ex:speed'
    expect(validateProp('speed', 'ex:name', siblings)).toBe(
      'Duplicate property name',
    );
  });

  it('same label on the same property (editing itself) is allowed', () => {
    const siblings = [{ uri: 'ex:name', label: 'name' }];
    expect(validateProp('name', 'ex:name', siblings)).toBe('');
  });
});
