import { describe, it, expect } from 'vitest';
import { inferIterator, generateRml } from '@/lib/rml';
import type { Source } from '@/store/sourcesStore';
import type { Mapping } from '@/types/index';

// ─── inferIterator tests ──────────────────────────────────────────────────────

describe('inferIterator', () => {
  it('returns $[*] for empty array root', () => {
    expect(inferIterator('[]')).toBe('$[*]');
  });

  it('returns $ for empty object root', () => {
    expect(inferIterator('{}')).toBe('$');
  });

  it('returns $.tracks[*] for object with array property', () => {
    expect(inferIterator('{"tracks":[]}')).toBe('$.tracks[*]');
  });

  it('returns $[*] for invalid JSON', () => {
    expect(inferIterator('invalid json')).toBe('$[*]');
  });

  it('returns $ for JSON null (null guard)', () => {
    expect(inferIterator('null')).toBe('$');
  });

  it('returns $ for JSON number (number guard)', () => {
    expect(inferIterator('42')).toBe('$');
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSource(
  overrides: Partial<Source> & { id: string; name: string; rawData: string },
): Source {
  return {
    order: 0,
    dataFormat: 'json',
    schemaNodes: [],
    schemaEdges: [],
    ...overrides,
  };
}

function makeMapping(
  overrides: Partial<Mapping> & { kind: Mapping['kind'] },
): Mapping {
  return {
    id: 'map1',
    sourceId: 'src1',
    sourceClassUri: 'http://example.org/Track',
    sourcePropUri: 'http://example.org/trackId',
    targetClassUri: 'http://nato.int/Track',
    targetPropUri: 'http://nato.int/identifier',
    sourceHandle: 'prop_trackId',
    targetHandle: 'target_prop_identifier',
    sparqlConstruct: '',
    ...overrides,
  };
}

// ─── generateRml tests ────────────────────────────────────────────────────────

describe('generateRml', () => {
  it('generates valid RML for one source + one direct mapping', () => {
    const source = makeSource({
      id: 'src1',
      name: 'radar',
      rawData: '{"tracks":[{"trackId":"T1"}]}',
      schemaNodes: [
        {
          id: 'node1',
          type: 'sourceNode',
          position: { x: 0, y: 0 },
          data: {
            uri: 'http://example.org/Track',
            label: 'Track',
            prefix: 'http://example.org/',
            properties: [
              {
                uri: 'http://example.org/trackId',
                label: 'trackId',
                range: 'xsd:string',
                kind: 'datatype',
              },
            ],
          },
        },
      ],
    });
    const mapping = makeMapping({ kind: 'direct' });
    const result = generateRml([source], { src1: [mapping] });

    expect(result).toContain('rml:logicalSource');
    expect(result).toContain('rr:predicateObjectMap');
    expect(result).toContain('rml:reference');
  });

  it('comments out sparql mapping with manual conversion note', () => {
    const source = makeSource({
      id: 'src1',
      name: 'radar',
      rawData: '{"tracks":[]}',
    });
    const mapping = makeMapping({ kind: 'sparql' });
    const result = generateRml([source], { src1: [mapping] });

    expect(result).toContain('# requires manual conversion');
  });

  it('emits rr:object for constant mapping', () => {
    const source = makeSource({
      id: 'src1',
      name: 'radar',
      rawData: '{"tracks":[]}',
    });
    const mapping = makeMapping({
      kind: 'constant',
      constantValue: 'NATO',
      constantType: 'http://www.w3.org/2001/XMLSchema#string',
    });
    const result = generateRml([source], { src1: [mapping] });

    expect(result).toContain('rr:object');
  });

  it('emits rr:language for language mapping', () => {
    const source = makeSource({
      id: 'src1',
      name: 'radar',
      rawData: '{"tracks":[]}',
    });
    const mapping = makeMapping({ kind: 'language', languageTag: 'en' });
    const result = generateRml([source], { src1: [mapping] });

    expect(result).toContain('rr:language');
  });

  it('emits rr:datatype for typecast mapping', () => {
    const source = makeSource({
      id: 'src1',
      name: 'radar',
      rawData: '{"tracks":[]}',
    });
    const mapping = makeMapping({
      kind: 'typecast',
      targetDatatype: 'http://www.w3.org/2001/XMLSchema#integer',
    });
    const result = generateRml([source], { src1: [mapping] });

    expect(result).toContain('rr:datatype');
  });

  it('skips source with empty JSON', () => {
    const emptySource = makeSource({ id: 'src1', name: 'empty', rawData: '' });
    const otherSource = makeSource({
      id: 'src2',
      name: 'radar',
      rawData: '{"tracks":[]}',
    });
    const mapping = makeMapping({ kind: 'direct', sourceId: 'src2' });
    const result = generateRml([emptySource, otherSource], { src2: [mapping] });

    expect(result).not.toContain('empty.json');
  });

  it('uses http://example.org/ fallback when schemaNode has no properties', () => {
    const source = makeSource({
      id: 'src1',
      name: 'radar',
      rawData: '{"tracks":[]}',
      schemaNodes: [
        {
          id: 'node1',
          type: 'sourceNode',
          position: { x: 0, y: 0 },
          data: {
            uri: 'http://example.org/Track',
            label: 'Track',
            prefix: 'http://example.org/',
            properties: [],
          },
        },
      ],
    });
    const mapping = makeMapping({ kind: 'direct' });
    const result = generateRml([source], { src1: [mapping] });

    expect(result).toContain('http://example.org/');
    expect(result).not.toContain('_:');
  });
});
