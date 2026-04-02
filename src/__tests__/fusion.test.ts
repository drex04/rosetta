import { describe, it, expect, vi } from 'vitest';
import * as N3 from 'n3';
import { executeAllConstructs } from '../lib/fusion';
import { compactToJsonLd } from '../lib/jsonldFramer';
import type { Mapping, SourceNodeData } from '../types/index';

// Mock Comunica — avoid loading the ~4MB bundle in tests
// Use a real class so `new QueryEngine()` works across all tests
const mockQuad = N3.DataFactory.quad(
  N3.DataFactory.namedNode('http://tgt.int/#track-1'),
  N3.DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
  N3.DataFactory.namedNode('http://tgt.int/#Target'),
  N3.DataFactory.defaultGraph(),
);

vi.mock('@comunica/query-sparql', () => {
  class QueryEngine {
    async queryQuads() {
      return {
        toArray: async () => [mockQuad],
      };
    }
  }
  return { QueryEngine };
});

// Mock jsonld for compactToJsonLd tests
vi.mock('jsonld', () => ({
  default: {
    fromRDF: vi.fn().mockResolvedValue([{ '@type': 'http://tgt.int/#Target' }]),
    compact: vi.fn().mockResolvedValue({
      '@context': { tgt: 'http://tgt.int/#' },
      '@graph': [{ '@type': 'tgt:Target' }],
    }),
  },
}));

// Note: do NOT use vi.clearAllMocks() here — it wipes mock implementations,
// breaking the QueryEngine constructor mock for subsequent tests.

const baseMapping: Mapping = {
  id: 'm1',
  sourceId: 's1',
  kind: 'direct',
  sparqlConstruct: 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }',
  sourceClassUri: 'http://src.int/#Track',
  targetClassUri: 'http://tgt.int/#Target',
  sourcePropUri: 'http://src.int/#speed',
  targetPropUri: 'http://tgt.int/#speed',
  sourceHandle: '',
  targetHandle: '',
};

const baseSchemaNode: SourceNodeData = {
  id: 'sn1',
  type: 'sourceNode',
  position: { x: 0, y: 0 },
  data: {
    uri: 'http://src.int/#Track',
    label: 'Track',
    prefix: 'http://src.int/#',
    properties: [
      {
        uri: 'http://src.int/#speed',
        label: 'speed',
        range: 'xsd:float',
        kind: 'datatype',
      },
    ],
  },
};

const baseSource = {
  id: 's1',
  name: 'TestSource',
  rawData: JSON.stringify([{ id: 1, speed: 5.5 }]),
  dataFormat: 'json' as const,
  schemaNodes: [baseSchemaNode],
  schemaEdges: [] as never[],
};

describe('executeAllConstructs', () => {
  it('Test 1: returns FusionResult with store.size > 0 for one source and one direct mapping', async () => {
    const result = await executeAllConstructs(
      [baseSource],
      { s1: [baseMapping] },
      [],
    );

    expect(result.totalQuads).toBeGreaterThan(0);
    expect(result.sources.length).toBe(1);
    expect(result.sources[0].sourceId).toBe('s1');
  });

  it('Test 2: returns empty result for empty sources array', async () => {
    const result = await executeAllConstructs([], {}, []);

    expect(result.totalQuads).toBe(0);
    expect(result.sources).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('Test 3: returns warnings array on successful runs (empty when no errors)', async () => {
    const result = await executeAllConstructs(
      [baseSource],
      { s1: [baseMapping] },
      [],
    );

    expect(result.warnings).toBeDefined();
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('Test 3a: XML source participates in fusion (dataFormat xml)', async () => {
    const xmlSource = {
      ...baseSource,
      id: 's1',
      rawData: '<tracks><track><speed>5.5</speed></track></tracks>',
      dataFormat: 'xml' as const,
    };
    const result = await executeAllConstructs(
      [xmlSource],
      { s1: [baseMapping] },
      [],
    );
    // Mock Comunica returns quads regardless of instance store content;
    // the key assertion is that the pipeline runs without error for an XML source.
    expect(result).toBeDefined();
    expect(result.sources.length).toBe(1);
    expect(
      result.warnings.filter((w) => w.includes('failed to parse')),
    ).toHaveLength(0);
  });

  it('Test 3b: handles source with invalid JSON without throwing', async () => {
    const badSource = {
      id: 's1',
      name: 'Bad',
      rawData: 'NOT_JSON',
      dataFormat: 'json' as const,
      schemaNodes: [] as never[],
      schemaEdges: [] as never[],
    };

    // jsonToInstances catches JSON.parse errors and returns an empty store,
    // so the pipeline still runs (mock returns quads regardless).
    // The key assertion: it resolves successfully without throwing.
    await expect(
      executeAllConstructs([badSource], { s1: [{ ...baseMapping }] }, []),
    ).resolves.toBeDefined();
  });

  it('Test 4: result store contains prov:wasAttributedTo triple for contributing source', async () => {
    const result = await executeAllConstructs(
      [baseSource],
      { s1: [baseMapping] },
      [],
    );

    const provQuads = result.store.getQuads(
      null,
      N3.DataFactory.namedNode('http://www.w3.org/ns/prov#wasAttributedTo'),
      null,
      null,
    );

    expect(provQuads.length).toBeGreaterThan(0);
  });
});

describe('compactToJsonLd', () => {
  it('Test 5: returns empty JSON-LD for empty store without calling jsonld', async () => {
    const store = new N3.Store();
    const result = await compactToJsonLd(store, []);

    expect(result).toEqual({ '@context': {}, '@graph': [] });
  });

  it('Test 6: returns compacted JSON-LD with @context and @graph for non-empty store', async () => {
    const store = new N3.Store();
    store.addQuad(
      N3.DataFactory.quad(
        N3.DataFactory.namedNode('http://tgt.int/#track-1'),
        N3.DataFactory.namedNode(
          'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        ),
        N3.DataFactory.namedNode('http://tgt.int/#Target'),
        N3.DataFactory.defaultGraph(),
      ),
    );

    const ontologyNode = {
      id: 'n1',
      type: 'classNode',
      position: { x: 0, y: 0 },
      data: {
        uri: 'http://tgt.int/#Target',
        label: 'Target',
        prefix: 'http://tgt.int/#',
        properties: [],
        comment: undefined,
      },
    } as never;

    const result = await compactToJsonLd(store, [ontologyNode]);

    expect(result).toHaveProperty('@context');
    expect(result).toHaveProperty('@graph');
  });
});
