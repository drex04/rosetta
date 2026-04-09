import { describe, it, expect, vi } from 'vitest';
import type { Source } from '@/store/sourcesStore';
import type { Mapping } from '@/types/index';

// ─── Mock inferIterator from @/lib/rml ────────────────────────────────────────
// rml.ts is built in parallel; we stub it here so tests remain self-contained.
vi.mock('@/lib/rml', () => ({
  inferIterator: () => '$[*]',
  inferXmlIterator: () => '/tracks/track',
}));

// Import after mock is registered
const { generateYarrrml } = await import('@/lib/yarrrml');

// ─── Test fixture helpers ─────────────────────────────────────────────────────

function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    id: 'src1',
    name: 'RadarData',
    order: 0,
    rawData: '[{"trackId": "T1"}]',
    dataFormat: 'json' as const,
    schemaNodes: [],
    schemaEdges: [],
    ...overrides,
  };
}

function makeMapping(overrides: Partial<Mapping> = {}): Mapping {
  return {
    id: 'm1',
    sourceId: 'src1',
    sourceClassUri: 'http://example.org/Track',
    sourcePropUri: 'http://example.org/trackId',
    targetClassUri: 'http://example.org/TargetTrack',
    targetPropUri: 'http://example.org/identifier',
    sourceHandle: 'prop_trackId',
    targetHandle: 'target_prop_identifier',
    kind: 'direct',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('generateYarrrml', () => {
  it('1. one source + one direct mapping → output contains mappings:, sources:, po:', () => {
    const source = makeSource();
    const mapping = makeMapping();
    const result = generateYarrrml([source], { src1: [mapping] });

    expect(result).toContain('mappings:');
    expect(result).toContain('sources:');
    expect(result).toContain('po:');
  });

  it('2. kind === formula → stub emits empty string (no manual conversion comment)', () => {
    const source = makeSource();
    const mapping = makeMapping({ kind: 'formula', formulaExpression: '' });
    const result = generateYarrrml([source], { src1: [mapping] });

    expect(result).not.toContain('# requires manual conversion');
    expect(result).toContain('mappings:');
  });

  it('3. kind === language with languageTag fr → output contains lang=fr', () => {
    const source = makeSource();
    const mapping = makeMapping({ kind: 'language', languageTag: 'fr' });
    const result = generateYarrrml([source], { src1: [mapping] });

    expect(result).toContain('lang=fr');
  });

  it('4. empty sources → output contains mappings: but no Map: entries', () => {
    const result = generateYarrrml([], {});

    expect(result).toContain('mappings:');
    expect(result).not.toContain('Map:');
  });

  it('5. kind === typecast with targetDatatype → output contains datatype=', () => {
    const source = makeSource();
    const mapping = makeMapping({
      kind: 'typecast',
      targetDatatype: 'http://www.w3.org/2001/XMLSchema#integer',
    });
    const result = generateYarrrml([source], { src1: [mapping] });

    expect(result).toContain('datatype=');
  });

  it('uses xpath references for xml sources', () => {
    const source = makeSource({
      rawData: '<tracks><track><trackId>T1</trackId></track></tracks>',
      dataFormat: 'xml',
    });
    const mapping = makeMapping({ kind: 'direct' });
    const result = generateYarrrml([source], { src1: [mapping] });

    expect(result).toContain('RadarData.xml~xpath');
    expect(result).toContain('trackId~xpath');
    expect(result).not.toContain('trackId~jsonpath');
  });

  it('6. kind === constant → po entry does NOT start with a leading space before <', () => {
    const source = makeSource();
    const mapping = makeMapping({
      kind: 'constant',
      constantValue: 'NATO',
      constantType: 'http://www.w3.org/2001/XMLSchema#string',
    });
    const result = generateYarrrml([source], { src1: [mapping] });

    // Must not contain [" <  (space before angle bracket in array)
    expect(result).not.toContain('[" <');
  });

  it('8. formula kind with CONCAT emits function: grel:string_concat and parameters: block', () => {
    const source = makeSource();
    const mapping = makeMapping({
      kind: 'formula',
      formulaExpression: 'CONCAT(source.first, source.second)',
    });
    const result = generateYarrrml([source], { src1: [mapping] });

    expect(result).toContain('function: grel:string_concat');
    expect(result).toContain('parameters:');
    expect(result).toContain('grel:valueParameter');
    expect(result).toContain('grel:valueParameter2');
  });

  it('7. yarrrml.ts does not import js-yaml', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(__dirname, '../lib/yarrrml.ts');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Only check import statements (first ~20 lines) for js-yaml
    const importLines = content
      .split('\n')
      .filter((line) => line.startsWith('import'))
      .join('\n');

    expect(importLines).not.toContain('js-yaml');
  });
});
