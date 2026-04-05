import { describe, it, expect } from 'vitest';
import {
  inferIterator,
  generateRml,
  rmlSourceKey,
  emitFnOPOM,
} from '@/lib/rml';
import { parseFormula } from '@/lib/formulaParser';
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
    ...overrides,
  };
}

// ─── rmlSourceKey tests ───────────────────────────────────────────────────────

describe('rmlSourceKey', () => {
  it('returns sanitized name + .json for json sources', () => {
    expect(
      rmlSourceKey({
        name: 'NATO/Air Defense',
        dataFormat: 'json',
      } as Parameters<typeof rmlSourceKey>[0]),
    ).toBe('NATO_Air_Defense.json');
  });

  it('returns sanitized name + .xml for xml sources', () => {
    expect(
      rmlSourceKey({ name: 'tracks', dataFormat: 'xml' } as Parameters<
        typeof rmlSourceKey
      >[0]),
    ).toBe('tracks.xml');
  });

  it('defaults to .json when dataFormat is undefined', () => {
    expect(
      rmlSourceKey({ name: 'radar', dataFormat: undefined } as Parameters<
        typeof rmlSourceKey
      >[0]),
    ).toBe('radar.json');
  });
});

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

  it('formula kind with UPPER emits fnml:functionValue block with fno:executes and grel:toUpperCase', () => {
    const source = makeSource({
      id: 'src1',
      name: 'radar',
      rawData: '{"tracks":[]}',
    });
    const mapping = makeMapping({
      kind: 'formula',
      formulaExpression: 'UPPER(source.trackId)',
    });
    const result = generateRml([source], { src1: [mapping] });

    expect(result).toContain('fnml:functionValue');
    expect(result).toContain('fno:executes');
    expect(result).toContain('grel:toUpperCase');
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

  it('uses rmlSourceKey value as rml:source for json source', () => {
    const source = makeSource({
      id: 'src1',
      name: 'NATO/Air Defense',
      rawData: '{"tracks":[]}',
      dataFormat: 'json',
    });
    const mapping = makeMapping({ kind: 'direct' });
    const result = generateRml([source], { src1: [mapping] });

    expect(result).toContain('rml:source "NATO_Air_Defense.json"');
    expect(result).toContain('ql:JSONPath');
  });

  it('emits ql:XPath and rml:iterator "/*" for xml source', () => {
    const source = makeSource({
      id: 'src1',
      name: 'tracks',
      rawData: '<tracks><track><id>1</id></track></tracks>',
      dataFormat: 'xml',
    });
    const mapping = makeMapping({ kind: 'direct' });
    const result = generateRml([source], { src1: [mapping] });

    expect(result).toContain('rml:source "tracks.xml"');
    expect(result).toContain('ql:XPath');
    expect(result).toContain('rml:iterator "/*"');
    expect(result).not.toContain('ql:JSONPath');
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

  it('formula kind with REPLACE emits grel:string_replace with three param predicates', () => {
    const source = makeSource({
      id: 'src1',
      name: 'radar',
      rawData: '{"tracks":[]}',
    });
    const mapping = makeMapping({
      kind: 'formula',
      formulaExpression: 'REPLACE(source.name, "old", "new")',
    });
    const result = generateRml([source], { src1: [mapping] });

    expect(result).toContain('grel:string_replace');
    expect(result).toContain('grel:valueParameter');
    expect(result).toContain('grel:param2Str');
    expect(result).toContain('grel:param3Str');
  });

  it('formula kind with CONCAT(a, b, c) emits nested blank node chain', () => {
    const source = makeSource({
      id: 'src1',
      name: 'radar',
      rawData: '{"tracks":[]}',
    });
    const mapping = makeMapping({
      kind: 'formula',
      formulaExpression: 'CONCAT(source.first, source.second, source.third)',
    });
    const result = generateRml([source], { src1: [mapping] });

    expect(result).toContain('grel:string_concat');
    // nested chain: two occurrences of fnml:functionValue (outer + inner)
    const count = (result.match(/fnml:functionValue/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('formula kind with invalid formulaExpression emits a # formula-error: comment', () => {
    const source = makeSource({
      id: 'src1',
      name: 'radar',
      rawData: '{"tracks":[]}',
    });
    const mapping = makeMapping({
      kind: 'formula',
      formulaExpression: 'FOO(x)',
    });
    const result = generateRml([source], { src1: [mapping] });

    expect(result).toContain('# formula-error:');
  });

  it('formula kind with literal containing double-quote emits properly escaped Turtle', () => {
    const source = makeSource({
      id: 'src1',
      name: 'radar',
      rawData: '{"tracks":[]}',
    });
    const mapping = makeMapping({
      kind: 'formula',
      formulaExpression: 'UPPER(source.name)',
      // We'll test turtleEscape directly via emitFnOPOM
    });
    // Test turtleEscape indirectly via emitFnOPOM with a literal containing a double-quote
    const ast = parseFormula('TRIM("say \\"hello\\"")');
    const counter = { n: 0 };
    const out = emitFnOPOM(ast, mapping, 'radar', counter);
    expect(out).toContain('\\"hello\\"');
    expect(out).not.toMatch(/[^\\]"hello"/);
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
