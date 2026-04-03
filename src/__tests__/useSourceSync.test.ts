import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSourcesStore } from '../store/sourcesStore';
import { useMappingStore } from '../store/mappingStore';
import type { SourceNodeData } from '../types/index';

vi.mock('../lib/jsonToSchema', () => ({
  jsonToSchema: vi.fn(),
}));

vi.mock('../lib/xmlToSchema', () => ({
  xmlToSchema: vi.fn(),
}));

import { jsonToSchema } from '../lib/jsonToSchema';

const mockJsonToSchema = vi.mocked(jsonToSchema);

const SOURCE_ID = 'src-001';

const MOCK_SOURCE_NODE: SourceNodeData = {
  id: 'node_Track',
  type: 'sourceNode',
  position: { x: 100, y: 200 },
  data: {
    uri: 'http://src.test/Track',
    label: 'Track',
    prefix: 'http://src.test/',
    properties: [],
  },
};

function seedStore() {
  useSourcesStore.setState({
    sources: [
      {
        id: SOURCE_ID,
        name: 'TestSource',
        order: 0,
        rawData: '{"records":[{"id":1}]}',
        dataFormat: 'json',
        schemaNodes: [MOCK_SOURCE_NODE],
        schemaEdges: [],
        parseError: null,
      },
    ],
    activeSourceId: SOURCE_ID,
  });
}

beforeEach(() => {
  seedStore();
  mockJsonToSchema.mockReset();
});

describe('useSourceSync', () => {
  it('reset re-generates from rawData and clears mappings', async () => {
    const { useSourceSync } = await import('../hooks/useSourceSync');

    const resultNodes = [MOCK_SOURCE_NODE];
    mockJsonToSchema.mockReturnValue({
      nodes: resultNodes,
      edges: [],
      warnings: [],
    });

    useMappingStore.setState({
      mappings: {
        [SOURCE_ID]: [
          {
            id: 'map-1',
            sourceId: SOURCE_ID,
            sourceClassUri: 'http://src.test/Track',
            sourcePropUri: 'http://src.test/id',
            targetClassUri: 'http://onto/Track',
            targetPropUri: 'http://onto/identifier',
            sourceHandle: 'prop_id',
            targetHandle: 'target_prop_identifier',
            kind: 'direct',
            sparqlConstruct: '',
          },
        ],
      },
    });

    const { result } = renderHook(() => useSourceSync());

    act(() => {
      result.current.resetSourceSchema();
    });

    expect(mockJsonToSchema).toHaveBeenCalledWith(
      '{"records":[{"id":1}]}',
      'TestSource',
    );

    const updated = useSourcesStore
      .getState()
      .sources.find((s) => s.id === SOURCE_ID);
    expect(updated?.schemaNodes).toEqual(resultNodes);
    expect(updated?.parseError).toBeNull();

    const mappings = useMappingStore.getState().mappings;
    expect(mappings[SOURCE_ID] ?? []).toHaveLength(0);
  });
});
