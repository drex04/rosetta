import * as N3 from 'n3'
import { MarkerType } from '@xyflow/react'
import type { OntologyNode, OntologyEdge, ClassData, PropertyData } from '@/types/index'

// ─── Constants ────────────────────────────────────────────────────────────────

const RDF_TYPE   = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
const RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label'
const RDFS_COMMENT = 'http://www.w3.org/2000/01/rdf-schema#comment'
const RDFS_DOMAIN = 'http://www.w3.org/2000/01/rdf-schema#domain'
const RDFS_RANGE  = 'http://www.w3.org/2000/01/rdf-schema#range'
const RDFS_SUBCLASS_OF = 'http://www.w3.org/2000/01/rdf-schema#subClassOf'
const OWL_CLASS    = 'http://www.w3.org/2002/07/owl#Class'
const OWL_DATATYPE_PROPERTY = 'http://www.w3.org/2002/07/owl#DatatypeProperty'
const OWL_OBJECT_PROPERTY   = 'http://www.w3.org/2002/07/owl#ObjectProperty'

// ─── localName ────────────────────────────────────────────────────────────────

/**
 * Extracts the local name from a URI — the fragment after `#`,
 * or the last path segment after `/`. Falls back to the full URI
 * if neither delimiter is found after a meaningful character.
 */
export function localName(uri: string): string {
  const hashIdx = uri.lastIndexOf('#')
  if (hashIdx !== -1) {
    const after = uri.slice(hashIdx + 1)
    if (after.length > 0) return after
  }
  const slashIdx = uri.lastIndexOf('/')
  if (slashIdx !== -1) {
    const after = uri.slice(slashIdx + 1)
    if (after.length > 0) return after
  }
  return uri
}

// ─── Helper: prefix from URI ──────────────────────────────────────────────────

function prefixFromUri(uri: string): string {
  const hashIdx = uri.lastIndexOf('#')
  if (hashIdx !== -1) return uri.slice(0, hashIdx + 1)
  const slashIdx = uri.lastIndexOf('/')
  if (slashIdx !== -1) return uri.slice(0, slashIdx + 1)
  return uri
}

// ─── parseTurtle ─────────────────────────────────────────────────────────────

export async function parseTurtle(
  text: string,
): Promise<{ nodes: OntologyNode[]; edges: OntologyEdge[] }> {
  if (text.trim() === '') {
    return { nodes: [], edges: [] }
  }

  const store = new N3.Store()

  await new Promise<void>((resolve, reject) => {
    const parser = new N3.Parser({ format: 'Turtle' })
    parser.parse(text, (error, quad, prefixes) => {
      if (error) {
        reject(error)
        return
      }
      if (quad) {
        store.addQuad(quad)
      } else {
        // quad is null when parsing is complete
        void prefixes
        resolve()
      }
    })
  })

  // Map from class URI → ClassData
  const classMap = new Map<string, ClassData>()

  const nn = (uri: string) => N3.DataFactory.namedNode(uri) as unknown as N3.Term

  // 1. Collect owl:Class subjects
  for (const quad of store.match(null, nn(RDF_TYPE), nn(OWL_CLASS), null)) {
    const subject = quad.subject
    if (subject.termType !== 'NamedNode') continue
    const uri = subject.value

    const labelQuad = store.match(subject as unknown as N3.Term, nn(RDFS_LABEL), null, null)[Symbol.iterator]().next().value
    const label = labelQuad?.object.termType === 'Literal'
      ? labelQuad.object.value
      : localName(uri)

    const commentQuad = store.match(subject as unknown as N3.Term, nn(RDFS_COMMENT), null, null)[Symbol.iterator]().next().value
    const comment = commentQuad?.object.termType === 'Literal'
      ? commentQuad.object.value
      : undefined

    classMap.set(uri, {
      uri,
      label,
      prefix: prefixFromUri(uri),
      comment,
      properties: [],
    })
  }

  // 2. Collect owl:DatatypeProperty → embed in domain class
  for (const quad of store.match(null, nn(RDF_TYPE), nn(OWL_DATATYPE_PROPERTY), null)) {
    const subject = quad.subject
    if (subject.termType !== 'NamedNode') continue
    const propUri = subject.value

    const domainQuad = store.match(subject as unknown as N3.Term, nn(RDFS_DOMAIN), null, null)[Symbol.iterator]().next().value
    if (!domainQuad || domainQuad.object.termType !== 'NamedNode') continue
    const domainUri = domainQuad.object.value

    const classData = classMap.get(domainUri)
    if (!classData) continue

    const rangeQuad = store.match(subject as unknown as N3.Term, nn(RDFS_RANGE), null, null)[Symbol.iterator]().next().value
    const range = rangeQuad?.object.termType === 'NamedNode'
      ? rangeQuad.object.value
      : 'xsd:string'

    const labelQuad = store.match(subject as unknown as N3.Term, nn(RDFS_LABEL), null, null)[Symbol.iterator]().next().value
    const label = labelQuad?.object.termType === 'Literal'
      ? labelQuad.object.value
      : localName(propUri)

    const prop: PropertyData = {
      uri: propUri,
      label,
      range,
      kind: 'datatype',
    }
    classData.properties.push(prop)
  }

  // Build nodes
  const nodes: OntologyNode[] = Array.from(classMap.entries()).map(([uri, data]) => ({
    id: `node_${localName(uri)}`,
    type: 'classNode' as const,
    position: { x: 0, y: 0 },
    data: data as ClassData & Record<string, unknown>,
  }))

  const edges: OntologyEdge[] = []

  // 3. Collect owl:ObjectProperty → create edges
  for (const quad of store.match(null, nn(RDF_TYPE), nn(OWL_OBJECT_PROPERTY), null)) {
    const subject = quad.subject
    if (subject.termType !== 'NamedNode') continue
    const propUri = subject.value

    const domainQuad = store.match(subject as unknown as N3.Term, nn(RDFS_DOMAIN), null, null)[Symbol.iterator]().next().value
    if (!domainQuad || domainQuad.object.termType !== 'NamedNode') continue
    const domainUri = domainQuad.object.value

    const rangeQuad = store.match(subject as unknown as N3.Term, nn(RDFS_RANGE), null, null)[Symbol.iterator]().next().value
    if (!rangeQuad || rangeQuad.object.termType !== 'NamedNode') continue
    const rangeUri = rangeQuad.object.value

    // Both domain and range must be known classes
    if (!classMap.has(domainUri) || !classMap.has(rangeUri)) continue

    const sourceId = `node_${localName(domainUri)}`
    const targetId = `node_${localName(rangeUri)}`

    const labelQuad = store.match(subject as unknown as N3.Term, nn(RDFS_LABEL), null, null)[Symbol.iterator]().next().value
    const label = labelQuad?.object.termType === 'Literal'
      ? labelQuad.object.value
      : localName(propUri)

    edges.push({
      id: `e_${sourceId}_objectPropertyEdge_${targetId}`,
      type: 'objectPropertyEdge' as const,
      source: sourceId,
      target: targetId,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: {
        uri: propUri,
        label,
        predicate: 'owl:ObjectProperty' as const,
      },
    })
  }

  // 4. Collect rdfs:subClassOf → create subclassEdges
  for (const quad of store.match(null, N3.DataFactory.namedNode(RDFS_SUBCLASS_OF), null, null)) {
    const subject = quad.subject
    const object  = quad.object
    if (subject.termType !== 'NamedNode' || object.termType !== 'NamedNode') continue

    const subUri   = subject.value
    const superUri = object.value

    if (!classMap.has(subUri) || !classMap.has(superUri)) continue

    const sourceId = `node_${localName(subUri)}`
    const targetId = `node_${localName(superUri)}`

    edges.push({
      id: `e_${sourceId}_subclassEdge_${targetId}`,
      type: 'subclassEdge' as const,
      source: sourceId,
      target: targetId,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: {
        predicate: 'rdfs:subClassOf' as const,
      },
    })
  }

  return { nodes, edges }
}

// ─── canvasToTurtle ───────────────────────────────────────────────────────────

export async function canvasToTurtle(
  nodes: OntologyNode[],
  edges: OntologyEdge[],
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    // Collect unique prefixes from node URIs
    const prefixMap = new Map<string, string>()
    prefixMap.set('rdf',  'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
    prefixMap.set('rdfs', 'http://www.w3.org/2000/01/rdf-schema#')
    prefixMap.set('owl',  'http://www.w3.org/2002/07/owl#')
    prefixMap.set('xsd',  'http://www.w3.org/2001/XMLSchema#')

    // Assign short prefixes to ontology namespaces
    const nsPrefixMap = new Map<string, string>() // namespace → prefix alias
    let nsPrefixCounter = 0

    function getOrAssignPrefix(uri: string): string {
      const ns = prefixFromUri(uri)
      // Check if it's already one of the standard ones
      for (const [alias, iri] of prefixMap) {
        if (iri === ns) return alias
      }
      const existing = nsPrefixMap.get(ns)
      if (existing !== undefined) return existing
      const alias = `ns${nsPrefixCounter++}`
      nsPrefixMap.set(ns, alias)
      prefixMap.set(alias, ns)
      return alias
    }

    // Pre-scan all URIs to build prefix map
    for (const node of nodes) {
      getOrAssignPrefix(node.data.uri)
      for (const prop of node.data.properties) {
        getOrAssignPrefix(prop.uri)
      }
    }
    for (const edge of edges) {
      if (edge.type === 'objectPropertyEdge') {
        getOrAssignPrefix(edge.data!.uri)
      }
    }

    // Build prefix object for N3.Writer (Record<string, string>)
    const prefixesObj: Record<string, string> = {}
    for (const [alias, iri] of prefixMap) {
      prefixesObj[alias] = iri
    }

    const writer = new N3.Writer({ format: 'Turtle', prefixes: prefixesObj })

    const df = N3.DataFactory
    const nn = (uri: string) => df.namedNode(uri)
    const lit = (value: string) => df.literal(value)

    // Emit classes
    for (const node of nodes) {
      const classUri = node.data.uri
      const s = nn(classUri)
      writer.addQuad(s, nn(RDF_TYPE), nn(OWL_CLASS))
      writer.addQuad(s, nn(RDFS_LABEL), lit(node.data.label))
      if (node.data.comment !== undefined) {
        writer.addQuad(s, nn(RDFS_COMMENT), lit(node.data.comment))
      }
      for (const prop of node.data.properties) {
        const p = nn(prop.uri)
        writer.addQuad(p, nn(RDF_TYPE), nn(OWL_DATATYPE_PROPERTY))
        writer.addQuad(p, nn(RDFS_LABEL), lit(prop.label))
        writer.addQuad(p, nn(RDFS_DOMAIN), s)
        writer.addQuad(p, nn(RDFS_RANGE), nn(prop.range))
      }
    }

    // Emit edges
    for (const edge of edges) {
      if (edge.type === 'subclassEdge') {
        // Resolve URIs from nodes
        const srcNode = nodes.find((n) => n.id === edge.source)
        const tgtNode = nodes.find((n) => n.id === edge.target)
        if (srcNode && tgtNode) {
          writer.addQuad(nn(srcNode.data.uri), nn(RDFS_SUBCLASS_OF), nn(tgtNode.data.uri))
        }
      } else if (edge.type === 'objectPropertyEdge') {
        const srcNode = nodes.find((n) => n.id === edge.source)
        const tgtNode = nodes.find((n) => n.id === edge.target)
        if (srcNode && tgtNode) {
          const p = nn(edge.data!.uri)
          writer.addQuad(p, nn(RDF_TYPE), nn(OWL_OBJECT_PROPERTY))
          writer.addQuad(p, nn(RDFS_LABEL), lit(edge.data!.label))
          writer.addQuad(p, nn(RDFS_DOMAIN), nn(srcNode.data.uri))
          writer.addQuad(p, nn(RDFS_RANGE), nn(tgtNode.data.uri))
        }
      }
    }

    writer.end((error, result) => {
      if (error) {
        reject(error)
        return
      }
      resolve(result)
    })
  })
}
