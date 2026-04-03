import { describe, it, expect } from 'vitest';
import { generateConstruct } from '@/lib/sparql';

const baseMapping = {
  sourceId: 'src-1',
  sourceClassUri: 'http://example.org/source#Track',
  sourcePropUri: 'http://example.org/source#trackId',
  sourceHandle: 'prop_trackId',
  targetClassUri: 'http://example.org/nato#AirObject',
  targetPropUri: 'http://example.org/nato#identifier',
  targetHandle: 'target_prop_identifier',
};

// Shared base for new-kind tests (includes kind: 'direct' as default)
const base: Omit<import('@/types').Mapping, 'id' | 'sparqlConstruct'> = {
  ...baseMapping,
  kind: 'direct',
};

describe('generateConstruct', () => {
  it('output contains CONSTRUCT keyword', () => {
    const result = generateConstruct(baseMapping);
    expect(result).toContain('CONSTRUCT');
  });

  it('output contains WHERE keyword', () => {
    const result = generateConstruct(baseMapping);
    expect(result).toContain('WHERE');
  });

  it('includes correct src: PREFIX for hash-based URI', () => {
    const result = generateConstruct(baseMapping);
    expect(result).toContain('PREFIX src: <http://example.org/source#>');
  });

  it('includes correct tgt: PREFIX for hash-based URI', () => {
    const result = generateConstruct(baseMapping);
    expect(result).toContain('PREFIX tgt: <http://example.org/nato#>');
  });

  it('uses localName of sourceClassUri as CONSTRUCT type', () => {
    const result = generateConstruct(baseMapping);
    expect(result).toContain('a tgt:AirObject');
  });

  it('uses localName of targetPropUri in CONSTRUCT body', () => {
    const result = generateConstruct(baseMapping);
    expect(result).toContain('tgt:identifier');
  });

  it('uses localName of sourceClassUri in WHERE clause', () => {
    const result = generateConstruct(baseMapping);
    expect(result).toContain('src:Track');
  });

  it('uses localName of sourcePropUri in WHERE clause', () => {
    const result = generateConstruct(baseMapping);
    expect(result).toContain('src:trackId');
  });

  it('handles slash-based URIs for prefix derivation', () => {
    const mapping = {
      ...baseMapping,
      sourceClassUri: 'http://example.org/slash/Track',
      sourcePropUri: 'http://example.org/slash/trackId',
    };
    const result = generateConstruct(mapping);
    expect(result).toContain('PREFIX src: <http://example.org/slash/>');
    expect(result).toContain('src:Track');
    expect(result).toContain('src:trackId');
  });

  it('falls back to "val" when sourcePropUri has no local name', () => {
    // URI ending with '/' means localName returns '' after the slash, so fallback triggers
    const mapping = {
      ...baseMapping,
      sourcePropUri: 'http://example.org/source/',
    };
    const result = generateConstruct(mapping);
    // WHERE clause prop should fall back to 'val'
    expect(result).toContain('src:val');
  });

  it('falls back to "val" when targetPropUri has no local name', () => {
    const mapping = {
      ...baseMapping,
      targetPropUri: 'http://example.org/nato/',
    };
    const result = generateConstruct(mapping);
    expect(result).toContain('tgt:val');
  });
});

describe('generateConstruct — new kinds', () => {
  it('constant kind: includes BIND with typed literal', () => {
    const m = {
      ...base,
      kind: 'constant' as const,
      constantValue: 'FRIEND',
      constantType: 'http://www.w3.org/2001/XMLSchema#string',
    };
    const result = generateConstruct(m);
    expect(result).toContain(
      'BIND("FRIEND"^^<http://www.w3.org/2001/XMLSchema#string> AS ?val)',
    );
  });

  it('typecast kind: includes STRDT and target datatype', () => {
    const m = {
      ...base,
      kind: 'typecast' as const,
      targetDatatype: 'http://www.w3.org/2001/XMLSchema#integer',
    };
    const result = generateConstruct(m);
    expect(result).toContain('STRDT(');
    expect(result).toContain('http://www.w3.org/2001/XMLSchema#integer');
  });

  it('language kind: includes STRLANG and language tag', () => {
    const m = {
      ...base,
      kind: 'language' as const,
      languageTag: 'fr',
    };
    const result = generateConstruct(m);
    expect(result).toContain('STRLANG(');
    expect(result).toContain('"fr"');
  });

  it('template kind: includes template comment and BIND with STR (legacy — no templatePattern)', () => {
    const m = {
      ...base,
      kind: 'template' as const,
    };
    const result = generateConstruct(m);
    expect(result).toContain('# template:');
  });

  it('template kind: expands {fieldname} placeholders from templatePattern', () => {
    const m: Omit<import('@/types').Mapping, 'id' | 'sparqlConstruct'> = {
      sourceId: 'src-1',
      sourceClassUri: 'http://example.org/source#Person',
      sourcePropUri: 'http://example.org/source#firstName',
      sourceHandle: 'prop_firstName',
      targetClassUri: 'http://example.org/nato#Operator',
      targetPropUri: 'http://example.org/nato#fullName',
      targetHandle: 'target_prop_fullName',
      kind: 'template' as const,
      templatePattern: 'Hello {firstName}!',
    };
    const result = generateConstruct(m);
    // Must expand the placeholder — not just output BIND(STR(?raw) AS ?val)
    expect(result).toContain('CONCAT(');
    expect(result).toContain('"Hello "');
    expect(result).toContain('STR(?firstName)');
    expect(result).toContain('"!"');
    expect(result).toContain('AS ?val');
  });

  it('template kind: pattern with only one placeholder produces no CONCAT wrapping', () => {
    const m: Omit<import('@/types').Mapping, 'id' | 'sparqlConstruct'> = {
      sourceId: 'src-1',
      sourceClassUri: 'http://example.org/source#Person',
      sourcePropUri: 'http://example.org/source#firstName',
      sourceHandle: 'prop_firstName',
      targetClassUri: 'http://example.org/nato#Operator',
      targetPropUri: 'http://example.org/nato#fullName',
      targetHandle: 'target_prop_fullName',
      kind: 'template' as const,
      templatePattern: '{firstName}',
    };
    const result = generateConstruct(m);
    // Single placeholder only — no CONCAT needed, just STR(?)
    expect(result).toContain('STR(?firstName)');
    expect(result).toContain('AS ?val');
    expect(result).not.toContain('CONCAT(');
  });

  it('direct kind regression: contains CONSTRUCT and WHERE, no FILTER(false)', () => {
    const m = { ...base, kind: 'direct' as const };
    const result = generateConstruct(m);
    expect(result).toContain('CONSTRUCT');
    expect(result).toContain('WHERE');
    expect(result).not.toContain('FILTER(false)');
  });
});

describe('generateConstruct — sourcePrefix override', () => {
  it('uses provided sourcePrefix instead of deriving from class URI', () => {
    // The class URI has prefix http://example.org/source# but we pass a different prefix
    const result = generateConstruct(
      { ...base, kind: 'direct' as const },
      'http://custom.prefix/ns#',
    );
    expect(result).toContain('PREFIX src: <http://custom.prefix/ns#>');
    // Must NOT contain the URI-derived prefix
    expect(result).not.toContain('PREFIX src: <http://example.org/source#>');
  });

  it('still derives prefix from URI when sourcePrefix is not provided', () => {
    const result = generateConstruct({ ...base, kind: 'direct' as const });
    expect(result).toContain('PREFIX src: <http://example.org/source#>');
  });
});
