import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useValidationStore,
  subscribeValidationToMappings,
} from '../store/validationStore';
import { useMappingStore } from '../store/mappingStore';
import { useSourcesStore } from '../store/sourcesStore';

// Mock validateSource so tests don't run real SHACL logic
vi.mock('../lib/shacl/index', () => ({
  validateSource: vi.fn().mockResolvedValue([]),
}));

import { validateSource } from '../lib/shacl/index';
const mockValidateSource = vi.mocked(validateSource);

// Reset stores between tests
beforeEach(() => {
  useValidationStore.setState({
    results: {},
    loading: false,
    stale: false,
    error: null,
    lastRun: null,
    highlightedCanvasNodeId: null,
  });
  useMappingStore.setState({ mappings: {}, selectedMappingId: null });
  useSourcesStore.setState({ sources: [], activeSourceId: null });
  mockValidateSource.mockResolvedValue([]);
});

describe('useValidationStore — setStale', () => {
  it('sets stale to true', () => {
    useValidationStore.getState().setStale(true);
    expect(useValidationStore.getState().stale).toBe(true);
  });

  it('sets stale back to false', () => {
    useValidationStore.setState({ stale: true });
    useValidationStore.getState().setStale(false);
    expect(useValidationStore.getState().stale).toBe(false);
  });
});

describe('useValidationStore — reset', () => {
  it('clears results, stale, and highlightedCanvasNodeId', () => {
    useValidationStore.setState({
      results: { 'src-1': [] },
      stale: true,
      highlightedCanvasNodeId: 'node-42',
      error: 'some error',
      lastRun: 12345,
    });

    useValidationStore.getState().reset();

    const state = useValidationStore.getState();
    expect(state.results).toEqual({});
    expect(state.stale).toBe(false);
    expect(state.highlightedCanvasNodeId).toBeNull();
    expect(state.error).toBeNull();
    expect(state.lastRun).toBeNull();
    expect(state.loading).toBe(false);
  });
});

describe('useValidationStore — setHighlightedCanvasNodeId', () => {
  it('sets and clears highlightedCanvasNodeId', () => {
    useValidationStore.getState().setHighlightedCanvasNodeId('node-1');
    expect(useValidationStore.getState().highlightedCanvasNodeId).toBe(
      'node-1',
    );

    useValidationStore.getState().setHighlightedCanvasNodeId(null);
    expect(useValidationStore.getState().highlightedCanvasNodeId).toBeNull();
  });
});

describe('subscribeValidationToMappings', () => {
  it('sets stale=true when mappingStore changes', () => {
    const unsubscribe = subscribeValidationToMappings();
    expect(useValidationStore.getState().stale).toBe(false);

    useMappingStore.getState().addMapping({
      sourceId: 'src-1',
      sourceClassUri: 'http://ex.org/Foo',
      sourcePropUri: 'http://ex.org/bar',
      targetClassUri: 'http://nato.int/onto#Track',
      targetPropUri: 'http://nato.int/onto#id',
      sourceHandle: 'prop_bar',
      targetHandle: 'target_prop_id',
      kind: 'direct',
    });

    expect(useValidationStore.getState().stale).toBe(true);
    unsubscribe();
  });

  it('sets stale=true when a source is added', () => {
    const unsubscribe = subscribeValidationToMappings();
    expect(useValidationStore.getState().stale).toBe(false);

    useSourcesStore.getState().addSource({
      id: 'src-new',
      name: 'New Source',
      order: 0,
      rawData: '',
      dataFormat: 'json' as const,
      schemaNodes: [],
      schemaEdges: [],
      parseError: null,
    });

    expect(useValidationStore.getState().stale).toBe(true);
    unsubscribe();
  });

  it('does not set stale when only activeSourceId changes', () => {
    useSourcesStore.setState({
      sources: [
        {
          id: 'src-1',
          name: 'S1',
          order: 0,
          rawData: '',
          dataFormat: 'json' as const,
          schemaNodes: [],
          schemaEdges: [],
          parseError: null,
        },
      ],
      activeSourceId: null,
    });
    const unsubscribe = subscribeValidationToMappings();
    expect(useValidationStore.getState().stale).toBe(false);

    useSourcesStore.getState().setActiveSourceId('src-1');

    expect(useValidationStore.getState().stale).toBe(false);
    unsubscribe();
  });
});

describe('useValidationStore — runValidation double-click guard', () => {
  it('returns early without changing state if already loading', async () => {
    useValidationStore.setState({ loading: true, error: null });

    await useValidationStore.getState().runValidation();

    // loading should still be true (not reset by the guard path)
    expect(useValidationStore.getState().loading).toBe(true);
    expect(useValidationStore.getState().error).toBeNull();
    // validateSource should NOT have been called
    expect(mockValidateSource).not.toHaveBeenCalled();
  });
});

describe('useValidationStore — runValidation error handling', () => {
  it('continues validating remaining sources when one source throws', async () => {
    const makeSource = (id: string, name: string) => ({
      id,
      name,
      order: 0,
      rawData: '{}',
      dataFormat: 'json' as const,
      schemaNodes: [
        {
          id: 'n1',
          type: 'sourceNode',
          position: { x: 0, y: 0 },
          data: { uri: `http://ex.org/${name}`, label: name, properties: [] },
        },
      ],
      schemaEdges: [],
      parseError: null,
    });

    useSourcesStore.setState({
      sources: [
        makeSource('src-ok', 'OK'),
        makeSource('src-err', 'Broken'),
        makeSource('src-ok2', 'AlsoOK'),
      ],
      activeSourceId: 'src-ok',
    });

    // First source succeeds, second fails, third succeeds
    mockValidateSource
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('SHACL engine exploded'))
      .mockResolvedValueOnce([]);

    await useValidationStore.getState().runValidation();

    const state = useValidationStore.getState();
    expect(state.loading).toBe(false);
    // Error is reported but doesn't block other results
    expect(state.error).toContain('Broken');
    expect(state.error).toContain('SHACL engine exploded');
    // Both successful sources have results
    expect(state.results['src-ok']).toEqual([]);
    expect(state.results['src-ok2']).toEqual([]);
    // Failed source has no results entry
    expect(state.results['src-err']).toBeUndefined();
    // stale is cleared, lastRun is set
    expect(state.stale).toBe(false);
    expect(state.lastRun).toBeGreaterThan(0);
  });

  it('does not crash when validateSource throws a non-Error', async () => {
    useSourcesStore.setState({
      sources: [
        {
          id: 'src-err2',
          name: 'Bad Source',
          order: 0,
          rawData: '{}',
          dataFormat: 'json' as const,
          schemaNodes: [
            {
              id: 'n1',
              type: 'sourceNode',
              position: { x: 0, y: 0 },
              data: { uri: 'http://ex.org/Bar', label: 'Bar', properties: [] },
            },
          ],
          schemaEdges: [],
          parseError: null,
        },
      ],
      activeSourceId: 'src-err2',
    });

    mockValidateSource.mockRejectedValueOnce('string error');

    await useValidationStore.getState().runValidation();

    const state = useValidationStore.getState();
    expect(state.loading).toBe(false);
    expect(state.error).toContain('Validation failed');
  });
});

describe('useValidationStore — runValidation success', () => {
  it('populates results and clears loading/stale on success', async () => {
    useSourcesStore.setState({
      sources: [
        {
          id: 'src-ok',
          name: 'OK Source',
          order: 0,
          rawData: '{}',
          dataFormat: 'json' as const,
          schemaNodes: [
            {
              id: 'n1',
              type: 'sourceNode',
              position: { x: 0, y: 0 },
              data: { uri: 'http://ex.org/Ok', label: 'Ok', properties: [] },
            },
          ],
          schemaEdges: [],
          parseError: null,
        },
      ],
      activeSourceId: 'src-ok',
    });

    const violation = {
      id: 'v1',
      sourceId: 'src-ok',
      targetClassUri: 'http://nato.int/onto#Track',
      targetPropUri: null,
      message: 'missing required property',
      severity: 'Violation',
      canvasNodeId: null,
    };
    mockValidateSource.mockResolvedValueOnce([violation]);

    await useValidationStore.getState().runValidation();

    const state = useValidationStore.getState();
    expect(state.loading).toBe(false);
    expect(state.stale).toBe(false);
    expect(state.error).toBeNull();
    expect(state.lastRun).toBeGreaterThan(0);
    expect(state.results['src-ok']).toHaveLength(1);
    expect(state.results['src-ok']![0]!.message).toBe(
      'missing required property',
    );
  });
});
