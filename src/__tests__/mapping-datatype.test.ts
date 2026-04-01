import { describe, it, expect } from 'vitest'
import { localName } from '@/lib/rdf'
import { getPropRange } from '@/lib/mappingHelpers'
import type { OntologyNode } from '@/types/index'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeNode(uri: string, properties: { uri: string; range: string }[]): OntologyNode {
  return {
    id: `node-${uri}`,
    type: 'classNode',
    position: { x: 0, y: 0 },
    data: {
      uri,
      label: localName(uri),
      prefix: 'ex:',
      properties: properties.map((p) => ({
        uri: p.uri,
        label: localName(p.uri),
        range: p.range,
        kind: 'datatype' as const,
      })),
    },
  } as OntologyNode
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getPropRange', () => {
  it('finds range from a matching property URI in a node array', () => {
    const nodes = [
      makeNode('http://example.org/Aircraft', [
        { uri: 'http://example.org/latitude', range: 'xsd:float' },
      ]),
    ]
    expect(getPropRange('http://example.org/latitude', nodes)).toBe('xsd:float')
  })

  it('falls back to localName(uri) when property not found', () => {
    const nodes = [
      makeNode('http://example.org/Aircraft', [
        { uri: 'http://example.org/latitude', range: 'xsd:float' },
      ]),
    ]
    const result = getPropRange('http://example.org/altitude', nodes)
    expect(result).toBe(localName('http://example.org/altitude'))
    expect(result).toBe('altitude')
  })

  it('handles an empty node array without throwing', () => {
    expect(() => getPropRange('http://example.org/speed', [])).not.toThrow()
    expect(getPropRange('http://example.org/speed', [])).toBe('speed')
  })

  it('returns range from the first matching node when multiple nodes exist', () => {
    const nodes = [
      makeNode('http://example.org/ClassA', [
        { uri: 'http://example.org/lat', range: 'xsd:decimal' },
      ]),
      makeNode('http://example.org/ClassB', [
        { uri: 'http://example.org/lat', range: 'xsd:float' },
      ]),
    ]
    // Should return the first match
    expect(getPropRange('http://example.org/lat', nodes)).toBe('xsd:decimal')
  })

  it('falls back to localName for URIs with fragment identifiers', () => {
    const result = getPropRange('http://www.w3.org/2001/XMLSchema#integer', [])
    expect(result).toBe('integer')
  })
})
