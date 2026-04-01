import * as N3 from 'n3'
import type { ClassData, ObjectPropertyEdgeData, SourceNodeData, OntologyEdge } from '@/types/index'

// ─── RDF Constants ────────────────────────────────────────────────────────────

const RDF_TYPE              = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
const RDFS_LABEL            = 'http://www.w3.org/2000/01/rdf-schema#label'
const RDFS_DOMAIN           = 'http://www.w3.org/2000/01/rdf-schema#domain'
const RDFS_RANGE            = 'http://www.w3.org/2000/01/rdf-schema#range'
const OWL_CLASS             = 'http://www.w3.org/2002/07/owl#Class'
const OWL_DATATYPE_PROPERTY = 'http://www.w3.org/2002/07/owl#DatatypeProperty'
const OWL_OBJECT_PROPERTY   = 'http://www.w3.org/2002/07/owl#ObjectProperty'
export const XSD            = 'http://www.w3.org/2001/XMLSchema#'

// ─── Shared serializer ────────────────────────────────────────────────────────

/**
 * Serialize a set of SourceNodeData + OntologyEdge to Turtle format.
 *
 * @param nodes       The class nodes to serialize.
 * @param edges       The edges (ObjectProperty links) to serialize.
 * @param uriBase     The full URI base used as the prefix IRI (e.g. `http://src_foo_#`).
 * @param prefixAlias The short prefix alias (e.g. `src_foo_`) to use in the Turtle header.
 * @param warnings    Mutable array; any serialization error message is appended here.
 * @returns           The Turtle string, or `''` on failure.
 */
export function serializeToTurtle(
  nodes: SourceNodeData[],
  edges: OntologyEdge[],
  uriBase: string,
  prefixAlias: string,
  warnings: string[],
): string {
  try {
    const prefixes: Record<string, string> = {
      rdf:  'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      owl:  'http://www.w3.org/2002/07/owl#',
      xsd:  XSD,
      [prefixAlias]: uriBase,
    }

    const writer = new N3.Writer({ format: 'Turtle', prefixes })
    const df = N3.DataFactory
    const nn = (uri: string) => df.namedNode(uri)
    const lit = (value: string) => df.literal(value)

    for (const node of nodes) {
      const classData = node.data as ClassData
      const s = nn(classData.uri)
      writer.addQuad(s, nn(RDF_TYPE), nn(OWL_CLASS))
      writer.addQuad(s, nn(RDFS_LABEL), lit(classData.label))

      for (const prop of classData.properties) {
        const xsdFull = prop.range.startsWith('xsd:')
          ? XSD + prop.range.slice(4)
          : prop.range
        const p = nn(prop.uri)
        writer.addQuad(p, nn(RDF_TYPE), nn(OWL_DATATYPE_PROPERTY))
        writer.addQuad(p, nn(RDFS_LABEL), lit(prop.label))
        writer.addQuad(p, nn(RDFS_DOMAIN), s)
        writer.addQuad(p, nn(RDFS_RANGE), nn(xsdFull))
      }
    }

    // ObjectProperty edges
    const nodeById = new Map(nodes.map((n) => [n.id, n]))
    for (const edge of edges) {
      if (edge.type !== 'objectPropertyEdge') continue
      const edgeData = edge.data as ObjectPropertyEdgeData | undefined
      if (!edgeData) continue

      const sourceNode = nodeById.get(edge.source)
      const targetNode = nodeById.get(edge.target)
      if (!sourceNode || !targetNode) continue

      const sourceData = sourceNode.data as ClassData
      const targetData = targetNode.data as ClassData

      const p = nn(edgeData.uri)
      writer.addQuad(p, nn(RDF_TYPE), nn(OWL_OBJECT_PROPERTY))
      writer.addQuad(p, nn(RDFS_LABEL), lit(edgeData.label))
      writer.addQuad(p, nn(RDFS_DOMAIN), nn(sourceData.uri))
      writer.addQuad(p, nn(RDFS_RANGE), nn(targetData.uri))
    }

    let result = ''
    let serializeError: Error | null = null

    writer.end((err, output) => {
      if (err) {
        serializeError = err
        return
      }
      result = output
    })

    if (serializeError !== null) {
      warnings.push('Failed to serialize schema to Turtle')
      return ''
    }

    return result
  } catch {
    warnings.push('Failed to serialize schema to Turtle')
    return ''
  }
}
