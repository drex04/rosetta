import { localName } from '@/lib/rdf'
import type { PropertyData } from '@/types/index'

/** Minimal shape shared by both OntologyNode and SourceNode */
interface NodeWithProperties {
  data: { properties: PropertyData[] }
}

/**
 * Returns the range (e.g. "xsd:float") of a property URI found in the given
 * node array, or falls back to localName(propUri) if not found.
 *
 * Works for both OntologyNode[] and SourceNode[] since both share ClassData.
 */
export function getPropRange(propUri: string, nodes: NodeWithProperties[]): string {
  for (const node of nodes) {
    const prop = node.data.properties.find((p) => p.uri === propUri)
    if (prop) return prop.range
  }
  return localName(propUri)
}
