import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOntologyStore } from '../store/ontologyStore';
import { useSourcesStore } from '../store/sourcesStore';
import { useMappingStore } from '../store/mappingStore';
import { useValidationStore } from '../store/validationStore';

vi.mock('idb-keyval', () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
}));

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  useOntologyStore.setState({ nodes: [], edges: [], turtleSource: '' });
  useSourcesStore.setState({ sources: [], activeSourceId: null });
  useMappingStore.setState({
    mappings: {},
    selectedMappingId: null,
    groups: {},
    _undoStack: [],
  });
  useValidationStore.setState({
    userShapesTurtle: '',
    results: undefined,
    status: 'idle',
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('loadExampleProject', () => {
  it('populates ontology nodes from SEED_TURTLE', async () => {
    const { loadExampleProject } = await import('../lib/exampleProject');
    await loadExampleProject();

    const { nodes } = useOntologyStore.getState();
    expect(nodes.length).toBeGreaterThan(0);
  });

  it('creates three sources (Norway, Germany, United Kingdom)', async () => {
    const { loadExampleProject } = await import('../lib/exampleProject');
    await loadExampleProject();

    const { sources } = useSourcesStore.getState();
    expect(sources).toHaveLength(3);
    const names = sources.map((s) => s.name);
    expect(names).toContain('Norway');
    expect(names).toContain('Germany');
    expect(names).toContain('United Kingdom');
  });

  it('sets activeSourceId to the Norway source', async () => {
    const { loadExampleProject } = await import('../lib/exampleProject');
    await loadExampleProject();

    const { sources, activeSourceId } = useSourcesStore.getState();
    const norwayId = sources.find((s) => s.name === 'Norway')?.id;
    expect(activeSourceId).toBe(norwayId);
  });

  it('loads sample SHACL shapes into the validation store', async () => {
    const { loadExampleProject } = await import('../lib/exampleProject');
    await loadExampleProject();

    const { userShapesTurtle } = useValidationStore.getState();
    expect(userShapesTurtle.length).toBeGreaterThan(0);
    expect(userShapesTurtle).toContain('sh:');
  });

  it('sources have schema nodes populated', async () => {
    const { loadExampleProject } = await import('../lib/exampleProject');
    await loadExampleProject();

    const { sources } = useSourcesStore.getState();
    for (const src of sources) {
      expect(src.schemaNodes.length).toBeGreaterThan(0);
    }
  });

  it('sources have correct dataFormat fields', async () => {
    const { loadExampleProject } = await import('../lib/exampleProject');
    await loadExampleProject();

    const { sources } = useSourcesStore.getState();
    const norway = sources.find((s) => s.name === 'Norway');
    const uk = sources.find((s) => s.name === 'United Kingdom');

    expect(norway?.dataFormat).toBe('json');
    expect(uk?.dataFormat).toBe('xml');
  });

  it('resets stores before loading (idempotent on second call)', async () => {
    const { loadExampleProject } = await import('../lib/exampleProject');
    await loadExampleProject();
    const firstNodeCount = useOntologyStore.getState().nodes.length;
    const firstSourceCount = useSourcesStore.getState().sources.length;

    await loadExampleProject();
    expect(useOntologyStore.getState().nodes.length).toBe(firstNodeCount);
    expect(useSourcesStore.getState().sources.length).toBe(firstSourceCount);
  });
});
