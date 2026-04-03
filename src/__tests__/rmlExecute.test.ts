import { describe, it, expect, vi } from 'vitest';
import { executeAllRml } from '../lib/rmlExecute';
import { rmlSourceKey } from '../lib/rml';
import type { Source } from '../store/sourcesStore';
import type { Mapping } from '../types/index';

// Mock @comake/rmlmapper-js to avoid actual RML execution in unit tests
vi.mock('@comake/rmlmapper-js', () => ({
  parseTurtle: vi
    .fn()
    .mockResolvedValue([{ '@type': 'http://example.org/#Thing' }]),
}));

// Mock fontoxpath (used as xpathLib option)
vi.mock('fontoxpath', () => ({}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    id: 's1',
    name: 'TestSource',
    order: 0,
    rawData: JSON.stringify([{ id: 1 }]),
    dataFormat: 'json',
    schemaNodes: [],
    schemaEdges: [],
    turtleSource: '',
    parseError: null,
    ...overrides,
  };
}

function makeMapping(overrides: Partial<Mapping> = {}): Mapping {
  return {
    id: 'm1',
    sourceId: 's1',
    kind: 'direct',
    sparqlConstruct: 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }',
    sourceClassUri: 'http://example.org/src#Track',
    targetClassUri: 'http://example.org/tgt#Target',
    sourcePropUri: 'http://example.org/src#id',
    targetPropUri: 'http://example.org/tgt#id',
    sourceHandle: '',
    targetHandle: '',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('executeAllRml', () => {
  it('returns empty FusionResult for empty sources array', async () => {
    const result = await executeAllRml([], {});
    expect(result.jsonLd).toEqual([]);
    expect(result.sources).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('emits a warning for sparql-kind mappings and does not throw', async () => {
    const source = makeSource();
    const mapping = makeMapping({ kind: 'sparql' });
    const result = await executeAllRml([source], { s1: [mapping] });
    const sparqlWarning = result.warnings.find((w) =>
      w.includes('sparql-kind'),
    );
    expect(sparqlWarning).toBeDefined();
    expect(sparqlWarning).toContain('TestSource');
    expect(sparqlWarning).toContain('1 sparql-kind');
  });

  it('does not emit sparql warning for direct-kind mappings', async () => {
    const source = makeSource();
    const mapping = makeMapping({ kind: 'direct' });
    const result = await executeAllRml([source], { s1: [mapping] });
    const sparqlWarning = result.warnings.find((w) =>
      w.includes('sparql-kind'),
    );
    expect(sparqlWarning).toBeUndefined();
  });

  it('excludes source from sourceSummaries when rawData is blank', async () => {
    const source = makeSource({ rawData: '   ' });
    const mapping = makeMapping();
    const result = await executeAllRml([source], { s1: [mapping] });
    // Source with blank rawData is excluded from inputFiles and sourceSummaries
    expect(result.sources).toEqual([]);
  });
});

describe('rmlSourceKey', () => {
  it('returns .json extension for json sources', () => {
    const source = makeSource({ name: 'MySource', dataFormat: 'json' });
    expect(rmlSourceKey(source)).toBe('MySource.json');
  });

  it('returns .xml extension for xml sources', () => {
    const source = makeSource({ name: 'MySource', dataFormat: 'xml' });
    expect(rmlSourceKey(source)).toBe('MySource.xml');
  });

  it('sanitizes special characters in source name', () => {
    const source = makeSource({ name: 'My Source/Data', dataFormat: 'json' });
    expect(rmlSourceKey(source)).toBe('My_Source_Data.json');
  });

  it('key for json and xml sources differ only in extension', () => {
    const jsonSource = makeSource({ name: 'Sensor', dataFormat: 'json' });
    const xmlSource = makeSource({ name: 'Sensor', dataFormat: 'xml' });
    expect(rmlSourceKey(jsonSource)).toBe('Sensor.json');
    expect(rmlSourceKey(xmlSource)).toBe('Sensor.xml');
    expect(rmlSourceKey(jsonSource)).not.toBe(rmlSourceKey(xmlSource));
  });
});
