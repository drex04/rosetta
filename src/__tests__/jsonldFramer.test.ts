import { describe, it, expect } from 'vitest'
import * as N3 from 'n3'
import { compactToJsonLd } from '@/lib/jsonldFramer'
import type { OntologyNode } from '@/types/index'

// Helper: build a minimal OntologyNode stub from a URI
function makeOntologyNode(uri: string, id = 'node-1'): OntologyNode {
  return {
    id,
    type: 'classNode',
    position: { x: 0, y: 0 },
    data: {
      uri,
      label: uri.split(/[#/]/).pop() ?? uri,
      prefix: '',
      properties: [],
    },
  } as OntologyNode
}

// ─── compactToJsonLd ──────────────────────────────────────────────────────────

describe('compactToJsonLd', () => {
  it('empty store early-return resolves to empty context and graph', async () => {
    const store = new N3.Store()
    const result = await compactToJsonLd(store, [])
    expect(result).toEqual({ '@context': {}, '@graph': [] })
  })

  it('context from ontology nodes: key derived from URI local name', async () => {
    const store = new N3.Store()
    const ex = 'http://example.org/ont#'
    store.addQuad(
      N3.DataFactory.namedNode(`${ex}track1`),
      N3.DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      N3.DataFactory.namedNode(`${ex}Track`),
    )
    const node = makeOntologyNode(`${ex}Track`)
    const result = await compactToJsonLd(store, [node]) as Record<string, unknown>
    const ctx = result['@context'] as Record<string, string>
    // localName('http://example.org/ont#Track') = 'Track', key = 'track'
    expect(ctx).toHaveProperty('track')
    expect(ctx['track']).toBe('http://example.org/ont#')
  })

  it('standard prov and xsd prefixes present when store is non-empty', async () => {
    const store = new N3.Store()
    store.addQuad(
      N3.DataFactory.namedNode('http://example.org/ont#track1'),
      N3.DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      N3.DataFactory.namedNode('http://example.org/ont#Track'),
    )
    const result = await compactToJsonLd(store, []) as Record<string, unknown>
    const ctx = result['@context'] as Record<string, string>
    expect(ctx['xsd']).toBe('http://www.w3.org/2001/XMLSchema#')
    expect(ctx['prov']).toBe('http://www.w3.org/ns/prov#')
  })

  it('first-wins on duplicate context key: only first node prefix kept', async () => {
    const store = new N3.Store()
    store.addQuad(
      N3.DataFactory.namedNode('http://example.org/ont#track1'),
      N3.DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      N3.DataFactory.namedNode('http://example.org/ont#Track'),
    )
    const node1 = makeOntologyNode('http://example.org/ont#Track', 'node-1')
    const node2 = makeOntologyNode('http://other.org/ont#Track', 'node-2')
    const result = await compactToJsonLd(store, [node1, node2]) as Record<string, unknown>
    const ctx = result['@context'] as Record<string, string>
    // Both have local name 'Track' -> key 'track'; first should win
    expect(ctx['track']).toBe('http://example.org/ont#')
  })

  it('typed literal round-trip: resolves without throwing and returns object', async () => {
    const store = new N3.Store()
    const ex = 'http://example.org/ont#'
    store.addQuad(
      N3.DataFactory.blankNode('b0'),
      N3.DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      N3.DataFactory.namedNode(`${ex}Track`),
    )
    const result = await compactToJsonLd(store, [makeOntologyNode(`${ex}Track`)])
    expect(result).not.toBeNull()
    expect(typeof result).toBe('object')
  })
})
