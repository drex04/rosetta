import { describe, it, expect } from 'vitest'
import { generateConstruct } from '@/lib/sparql'

const baseMapping = {
  sourceId: 'src-1',
  sourceClassUri: 'http://example.org/source#Track',
  sourcePropUri: 'http://example.org/source#trackId',
  sourceHandle: 'prop_trackId',
  targetClassUri: 'http://example.org/nato#AirObject',
  targetPropUri: 'http://example.org/nato#identifier',
  targetHandle: 'target_prop_identifier',
}

describe('generateConstruct', () => {
  it('output contains CONSTRUCT keyword', () => {
    const result = generateConstruct(baseMapping)
    expect(result).toContain('CONSTRUCT')
  })

  it('output contains WHERE keyword', () => {
    const result = generateConstruct(baseMapping)
    expect(result).toContain('WHERE')
  })

  it('includes correct src: PREFIX for hash-based URI', () => {
    const result = generateConstruct(baseMapping)
    expect(result).toContain('PREFIX src: <http://example.org/source#>')
  })

  it('includes correct tgt: PREFIX for hash-based URI', () => {
    const result = generateConstruct(baseMapping)
    expect(result).toContain('PREFIX tgt: <http://example.org/nato#>')
  })

  it('uses localName of sourceClassUri as CONSTRUCT type', () => {
    const result = generateConstruct(baseMapping)
    expect(result).toContain('a tgt:AirObject')
  })

  it('uses localName of targetPropUri in CONSTRUCT body', () => {
    const result = generateConstruct(baseMapping)
    expect(result).toContain('tgt:identifier')
  })

  it('uses localName of sourceClassUri in WHERE clause', () => {
    const result = generateConstruct(baseMapping)
    expect(result).toContain('src:Track')
  })

  it('uses localName of sourcePropUri in WHERE clause', () => {
    const result = generateConstruct(baseMapping)
    expect(result).toContain('src:trackId')
  })

  it('handles slash-based URIs for prefix derivation', () => {
    const mapping = {
      ...baseMapping,
      sourceClassUri: 'http://example.org/slash/Track',
      sourcePropUri: 'http://example.org/slash/trackId',
    }
    const result = generateConstruct(mapping)
    expect(result).toContain('PREFIX src: <http://example.org/slash/>')
    expect(result).toContain('src:Track')
    expect(result).toContain('src:trackId')
  })

  it('falls back to "val" when sourcePropUri has no local name', () => {
    // URI ending with '/' means localName returns '' after the slash, so fallback triggers
    const mapping = {
      ...baseMapping,
      sourcePropUri: 'http://example.org/source/',
    }
    const result = generateConstruct(mapping)
    // WHERE clause prop should fall back to 'val'
    expect(result).toContain('src:val')
  })

  it('falls back to "val" when targetPropUri has no local name', () => {
    const mapping = {
      ...baseMapping,
      targetPropUri: 'http://example.org/nato/',
    }
    const result = generateConstruct(mapping)
    expect(result).toContain('tgt:val')
  })
})
