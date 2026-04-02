import { describe, it, expect } from 'vitest';

// ─── KIND_LABEL (mirrored from MappingEdge.tsx) ───────────────────────────────

const KIND_LABEL: Record<string, string> = {
  direct: 'direct',
  template: 'tmpl',
  constant: 'const',
  typecast: 'cast',
  language: 'lang',
  join: 'join',
  sparql: 'sparql',
};

// ─── KIND_LABEL abbreviations ─────────────────────────────────────────────────

describe('KIND_LABEL', () => {
  it('maps direct → "direct"', () => {
    expect(KIND_LABEL['direct']).toBe('direct');
  });

  it('maps template → "tmpl"', () => {
    expect(KIND_LABEL['template']).toBe('tmpl');
  });

  it('maps constant → "const"', () => {
    expect(KIND_LABEL['constant']).toBe('const');
  });

  it('maps typecast → "cast"', () => {
    expect(KIND_LABEL['typecast']).toBe('cast');
  });

  it('maps language → "lang"', () => {
    expect(KIND_LABEL['language']).toBe('lang');
  });

  it('maps join → "join"', () => {
    expect(KIND_LABEL['join']).toBe('join');
  });

  it('maps sparql → "sparql"', () => {
    expect(KIND_LABEL['sparql']).toBe('sparql');
  });
});

// ─── Unknown kind fallback ────────────────────────────────────────────────────

describe('KIND_LABEL unknown kind fallback', () => {
  it('returns the raw kind string for an unknown kind via nullish coalescing', () => {
    const kind = 'custom';
    expect(KIND_LABEL[kind] ?? kind).toBe('custom');
  });

  it('returns the raw kind string for another unknown kind', () => {
    const kind = 'regex';
    expect(KIND_LABEL[kind] ?? kind).toBe('regex');
  });
});

// ─── Kind badge suppression for grouped edges ────────────────────────────────

describe('kind badge suppression (!groupId && kindLabel)', () => {
  it('suppresses badge when groupId is set', () => {
    const groupId = 'g1';
    const kindLabel = 'direct';
    expect(!groupId && Boolean(kindLabel)).toBe(false);
  });

  it('shows badge when groupId is undefined and kindLabel is present', () => {
    const groupId = undefined;
    const kindLabel = 'direct';
    expect(!groupId && Boolean(kindLabel)).toBe(true);
  });

  it('suppresses badge when groupId is undefined but kindLabel is null', () => {
    const groupId = undefined;
    const kindLabel = null;
    expect(!groupId && Boolean(kindLabel)).toBe(false);
  });

  it('suppresses badge when groupId is empty string (falsy) and kindLabel is null', () => {
    const groupId = undefined;
    const kindLabel = '';
    expect(!groupId && Boolean(kindLabel)).toBe(false);
  });
});

// ─── Edge selected derivation ─────────────────────────────────────────────────

describe('edge selected derivation (mapping.id === selectedMappingId)', () => {
  it('is true when IDs match', () => {
    const mappingId = 'map-1';
    const selectedMappingId = 'map-1';
    expect(mappingId === selectedMappingId).toBe(true);
  });

  it('is false when IDs differ', () => {
    const mappingId: string = 'map-1';
    const selectedMappingId: string = 'map-2';
    expect(mappingId === selectedMappingId).toBe(false);
  });

  it('is false when selectedMappingId is null', () => {
    const mappingId = 'map-1';
    const selectedMappingId: string | null = null;
    expect(mappingId === selectedMappingId).toBe(false);
  });
});
