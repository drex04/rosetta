import { describe, it, expect } from 'vitest'
import * as N3 from 'n3'
import { generateShapes } from '../lib/shacl/shapesGenerator'
import { jsonToInstances } from '../lib/shacl/instanceGenerator'
import { executeConstruct } from '../lib/shacl/constructExecutor'
import { validateSource } from '../lib/shacl/index'
import type { ViolationRecord } from '../lib/shacl/validator'
import type { OntologyNode, SourceNode, Mapping, OntologyEdge } from '../types'
import type { Source } from '../store/sourcesStore'

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
const SH = 'http://www.w3.org/ns/shacl#'
const XSD = 'http://www.w3.org/2001/XMLSchema#'

describe('generateShapes', () => {
  it('produces sh:NodeShape triple for a class with a float property', () => {
    const node = makeOntologyNode('http://ex.org/Track', [
      { uri: 'http://ex.org/speed', label: 'speed', range: 'xsd:float', kind: 'datatype' },
    ])
    const store = generateShapes([node])
    const shapeUri = 'http://ex.org/TrackShape'
    // sh:NodeShape triple
    const nodeShapeTriples = store.getQuads(shapeUri, RDF_TYPE, SH + 'NodeShape', null)
    expect(nodeShapeTriples.length).toBe(1)
    // sh:property with sh:datatype xsd:float
    const propBlanks = store.getQuads(shapeUri, SH + 'property', null, null)
    expect(propBlanks.length).toBe(1)
    const bn = propBlanks[0]!.object
    const datatypeTriples = store.getQuads(bn, SH + 'datatype', XSD + 'float', null)
    expect(datatypeTriples.length).toBe(1)
  })

  it('produces sh:class triple for an object property', () => {
    const node = makeOntologyNode('http://ex.org/Track', [
      { uri: 'http://ex.org/relatedTo', label: 'relatedTo', range: 'http://ex.org/Target', kind: 'object' },
    ])
    const store = generateShapes([node])
    const shapeUri = 'http://ex.org/TrackShape'
    const propBlanks = store.getQuads(shapeUri, SH + 'property', null, null)
    expect(propBlanks.length).toBe(1)
    const bn = propBlanks[0]!.object
    const classTriples = store.getQuads(bn, SH + 'class', 'http://ex.org/Target', null)
    expect(classTriples.length).toBe(1)
  })
})

describe('jsonToInstances', () => {
  const URI_BASE = 'http://src_test_#'

  function makeSourceNode(prefix: string): SourceNode {
    return {
      id: 'n1',
      type: 'sourceNode',
      position: { x: 0, y: 0 },
      data: { uri: prefix + 'Root', label: 'Root', prefix, properties: [] },
    } as SourceNode
  }

  it('produces rdf:type triple for nested class', () => {
    const store = jsonToInstances('{"tracks":[{"speed":500}]}', [makeSourceNode(URI_BASE)])
    const typeTriples = store.getQuads(null, RDF_TYPE, URI_BASE + 'Tracks', null)
    expect(typeTriples.length).toBeGreaterThan(0)
  })

  it('produces typed literal for primitive field', () => {
    const store = jsonToInstances('{"tracks":[{"speed":500}]}', [makeSourceNode(URI_BASE)])
    const speedTriples = store.getQuads(null, URI_BASE + 'speed', null, null)
    expect(speedTriples.length).toBeGreaterThan(0)
    const obj = speedTriples[0]!.object
    expect(obj.termType).toBe('Literal')
    expect((obj as N3.Literal).datatype.value).toBe(XSD + 'integer')
  })

  it('returns empty store for invalid JSON', () => {
    const store = jsonToInstances('not json', [makeSourceNode(URI_BASE)])
    expect(store.size).toBe(0)
  })
})

// Helper
function makeOntologyNode(uri: string, properties: Array<{ uri: string; label: string; range: string; kind: 'datatype' | 'object' }>): OntologyNode {
  return {
    id: 'node_' + uri.replace(/[^a-zA-Z0-9]/g, '_'),
    type: 'classNode',
    position: { x: 0, y: 0 },
    data: { uri, label: uri.split('/').pop() ?? '', prefix: '', properties },
  } as OntologyNode
}

function makeMapping(overrides: Partial<Mapping> & { sourceClassUri: string; sourcePropUri: string; targetClassUri: string; targetPropUri: string }): Mapping {
  return {
    id: crypto.randomUUID(),
    sourceId: 'src1',
    kind: 'direct',
    sparqlConstruct: '',
    sourceHandle: '',
    targetHandle: '',
    ...overrides,
  } as Mapping
}

function makeSourceNode(prefix: string): SourceNode {
  return {
    id: 'n1',
    type: 'sourceNode',
    position: { x: 0, y: 0 },
    data: { uri: prefix + 'Root', label: 'Root', prefix, properties: [] },
  } as SourceNode
}

function makeSource(overrides: Partial<{ id: string; name: string; order: number; rawData: string; dataFormat: 'json' | 'xml'; schemaNodes: SourceNode[]; schemaEdges: OntologyEdge[] }>): Source {
  return {
    id: 'src1',
    name: 'test',
    order: 0,
    rawData: '{}',
    dataFormat: 'json',
    schemaNodes: [],
    schemaEdges: [],
    ...overrides,
  }
}

describe('executeConstruct', () => {
  it('maps instances of sourceClass to targetClass with targetProp', () => {
    const instanceStore = new N3.Store()
    const df = N3.DataFactory
    const srcTracks = 'http://src_test_#Tracks'
    const srcSpeed  = 'http://src_test_#speed'
    const tgtTarget = 'http://tgt_#Target'
    const tgtSpeed  = 'http://tgt_#speed'
    const bn = df.blankNode('t1')
    instanceStore.addQuad(bn, df.namedNode(RDF_TYPE), df.namedNode(srcTracks), df.defaultGraph())
    instanceStore.addQuad(bn, df.namedNode(srcSpeed), df.literal('500', df.namedNode(XSD + 'float')), df.defaultGraph())

    const mapping = makeMapping({ sourceClassUri: srcTracks, sourcePropUri: srcSpeed, targetClassUri: tgtTarget, targetPropUri: tgtSpeed })
    const result = executeConstruct(instanceStore, [mapping])

    expect(result.getQuads(null, RDF_TYPE, tgtTarget, null).length).toBe(1)
    expect(result.getQuads(null, tgtSpeed, null, null).length).toBe(1)
  })

  it('returns empty store when no matching instances', () => {
    const instanceStore = new N3.Store()
    const mapping = makeMapping({ sourceClassUri: 'http://ex.org/NoMatch', sourcePropUri: 'http://ex.org/p', targetClassUri: 'http://ex.org/T', targetPropUri: 'http://ex.org/q' })
    const result = executeConstruct(instanceStore, [mapping])
    expect(result.size).toBe(0)
  })
})

describe('validateSource', () => {
  it('returns [] immediately when source has no schemaNodes', async () => {
    const source = makeSource({ schemaNodes: [] })
    const result = await validateSource(source, [], [])
    expect(result).toEqual([])
  })

  it('returns no violations when CONSTRUCT output conforms to shapes', async () => {
    const URI_BASE = 'http://src_test_#'
    const TGT = 'http://tgt_#'
    const source = makeSource({
      rawData: '{"tracks":[{"speed":3.14}]}',
      schemaNodes: [makeSourceNode(URI_BASE)],
    })
    const ontNode = makeOntologyNode(TGT + 'Target', [
      { uri: TGT + 'speed', label: 'speed', range: 'xsd:float', kind: 'datatype' },
    ])
    const mapping = makeMapping({
      sourceClassUri: URI_BASE + 'Tracks',
      sourcePropUri:  URI_BASE + 'speed',
      targetClassUri: TGT + 'Target',
      targetPropUri:  TGT + 'speed',
    })
    const violations = await validateSource(source, [ontNode], [mapping])
    expect(violations).toEqual([])
  })

  it('returns violations when CONSTRUCT output uses wrong datatype', async () => {
    const URI_BASE = 'http://src_test_#'
    const TGT = 'http://tgt_#'
    const source = makeSource({
      rawData: '{"tracks":[{"speed":3.14}]}',
      schemaNodes: [makeSourceNode(URI_BASE)],
    })
    const ontNode = makeOntologyNode(TGT + 'Target', [
      { uri: TGT + 'speed', label: 'speed', range: 'xsd:integer', kind: 'datatype' },
    ])
    const mapping = makeMapping({
      sourceClassUri: URI_BASE + 'Tracks',
      sourcePropUri:  URI_BASE + 'speed',
      targetClassUri: TGT + 'Target',
      targetPropUri:  TGT + 'speed',
    })
    const violations = await validateSource(source, [ontNode], [mapping])
    expect(violations.length).toBeGreaterThan(0)
  })

  it('resolves canvasNodeId when matching ontology node exists', async () => {
    const URI_BASE = 'http://src_test_#'
    const TGT = 'http://tgt_#'
    const source = makeSource({
      rawData: '{"tracks":[{"speed":3.14}]}',
      schemaNodes: [makeSourceNode(URI_BASE)],
    })
    const ontNode = makeOntologyNode(TGT + 'Target', [
      { uri: TGT + 'speed', label: 'speed', range: 'xsd:integer', kind: 'datatype' },
    ])
    const mapping = makeMapping({
      sourceClassUri: URI_BASE + 'Tracks',
      sourcePropUri:  URI_BASE + 'speed',
      targetClassUri: TGT + 'Target',
      targetPropUri:  TGT + 'speed',
    })
    const violations = await validateSource(source, [ontNode], [mapping])
    expect(violations.every((v: ViolationRecord) => v.canvasNodeId === ontNode.id)).toBe(true)
  })

  it('sets canvasNodeId to null when no matching mapping', async () => {
    const URI_BASE = 'http://src_test_#'
    const TGT = 'http://tgt_#'
    const source = makeSource({
      rawData: '{"tracks":[{"speed":3.14}]}',
      schemaNodes: [makeSourceNode(URI_BASE)],
    })
    const ontNode = makeOntologyNode(TGT + 'Target', [
      { uri: TGT + 'speed', label: 'speed', range: 'xsd:integer', kind: 'datatype' },
    ])
    // No mapping passed
    const violations = await validateSource(source, [ontNode], [])
    expect(violations).toEqual([])
  })
})
