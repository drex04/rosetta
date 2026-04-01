import { describe, it, expect } from 'vitest'
import { convertToSourceNodes } from '../lib/rdf'
import type { OntologyNode, SourceNodeData } from '../types/index'

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeOntologyNode(
  id: string,
  uri: string,
  position = { x: 0, y: 0 },
): OntologyNode {
  return {
    id,
    type: 'classNode',
    position,
    data: {
      uri,
      label: uri.split('#').pop() ?? uri,
      prefix: 'ex',
      properties: [],
    },
  }
}

function makeSourceNodeData(
  id: string,
  uri: string,
  position: { x: number; y: number },
): SourceNodeData {
  return {
    id,
    type: 'sourceNode',
    position,
    data: {
      uri,
      label: uri.split('#').pop() ?? uri,
      prefix: 'ex',
      properties: [],
    },
  }
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('convertToSourceNodes — position preservation', () => {
  it('preserves position by ID when ID matches', () => {
    const existing: SourceNodeData[] = [
      makeSourceNodeData('node-A', 'http://ex#Track', { x: 100, y: 200 }),
    ]
    const incoming: OntologyNode[] = [
      makeOntologyNode('node-A', 'http://ex#Track', { x: 0, y: 0 }),
    ]
    const result = convertToSourceNodes(incoming, existing)
    expect(result[0].position).toEqual({ x: 100, y: 200 })
  })

  it('preserves position by URI when URI matches but ID differs', () => {
    const existing: SourceNodeData[] = [
      makeSourceNodeData('old-id', 'http://ex#Track', { x: 50, y: 75 }),
    ]
    const incoming: OntologyNode[] = [
      makeOntologyNode('new-id', 'http://ex#Track', { x: 0, y: 0 }),
    ]
    const result = convertToSourceNodes(incoming, existing)
    expect(result[0].position).toEqual({ x: 50, y: 75 })
  })

  it('preserves position by index when class is renamed (URI changes)', () => {
    // Simulates: user renames `Track` → `TrackInfo` in Turtle editor.
    // The old node had URI http://ex#Track; new parse yields http://ex#TrackInfo.
    // Neither ID nor URI match — fall back to index.
    const existing: SourceNodeData[] = [
      makeSourceNodeData('node-A', 'http://ex#Track', { x: 123, y: 456 }),
    ]
    const incoming: OntologyNode[] = [
      makeOntologyNode('node-B', 'http://ex#TrackInfo', { x: 0, y: 0 }),
    ]
    const result = convertToSourceNodes(incoming, existing)
    expect(result[0].position).toEqual({ x: 123, y: 456 })
  })

  it('multi-node rename: each node keeps its own position by index', () => {
    const existing: SourceNodeData[] = [
      makeSourceNodeData('a', 'http://ex#Alpha', { x: 10, y: 20 }),
      makeSourceNodeData('b', 'http://ex#Beta', { x: 30, y: 40 }),
    ]
    const incoming: OntologyNode[] = [
      makeOntologyNode('c', 'http://ex#AlphaRenamed', { x: 0, y: 0 }),
      makeOntologyNode('d', 'http://ex#BetaRenamed', { x: 0, y: 0 }),
    ]
    const result = convertToSourceNodes(incoming, existing)
    expect(result[0].position).toEqual({ x: 10, y: 20 })
    expect(result[1].position).toEqual({ x: 30, y: 40 })
  })

  it('new node added gets default layout position, existing nodes stay put', () => {
    const existing: SourceNodeData[] = [
      makeSourceNodeData('node-A', 'http://ex#Track', { x: 100, y: 200 }),
    ]
    // Two nodes coming in: first matches by ID, second is brand-new
    const incoming: OntologyNode[] = [
      makeOntologyNode('node-A', 'http://ex#Track', { x: 0, y: 0 }),
      makeOntologyNode('node-NEW', 'http://ex#NewClass', { x: 250, y: 350 }),
    ]
    const result = convertToSourceNodes(incoming, existing)
    // Existing node keeps its position
    expect(result[0].position).toEqual({ x: 100, y: 200 })
    // New node gets whatever parseTurtle assigned (the default layout position)
    expect(result[1].position).toEqual({ x: 250, y: 350 })
  })

  it('existing nodes unaffected when new node is added', () => {
    const existing: SourceNodeData[] = [
      makeSourceNodeData('a', 'http://ex#Alpha', { x: 10, y: 20 }),
      makeSourceNodeData('b', 'http://ex#Beta', { x: 30, y: 40 }),
    ]
    // Three nodes: first two match by ID, third is new
    const incoming: OntologyNode[] = [
      makeOntologyNode('a', 'http://ex#Alpha', { x: 0, y: 0 }),
      makeOntologyNode('b', 'http://ex#Beta', { x: 0, y: 0 }),
      makeOntologyNode('c', 'http://ex#Gamma', { x: 99, y: 88 }),
    ]
    const result = convertToSourceNodes(incoming, existing)
    expect(result[0].position).toEqual({ x: 10, y: 20 })
    expect(result[1].position).toEqual({ x: 30, y: 40 })
    expect(result[2].position).toEqual({ x: 99, y: 88 })
  })
})
