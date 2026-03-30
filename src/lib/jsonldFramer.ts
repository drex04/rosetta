import * as N3 from 'n3'
import jsonld from 'jsonld'
import type { OntologyNode } from '@/types/index'
import { localName } from '@/lib/rdf'

function storeToNQuads(store: N3.Store): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new N3.Writer({ format: 'N-Quads' })
    store.forEach((quad) => writer.addQuad(quad))
    writer.end((err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

export async function compactToJsonLd(
  store: N3.Store,
  ontologyNodes: OntologyNode[]
): Promise<object> {
  if (store.size === 0) {
    return { '@context': {}, '@graph': [] }
  }

  try {
    const nquads = await storeToNQuads(store)
    const dataset = await jsonld.fromRDF(nquads, { format: 'application/n-quads' })

    // Build context from ontology nodes
    const context: Record<string, string> = {}
    for (const node of ontologyNodes) {
      const uri = node.data.uri
      if (!uri) continue
      const ln = localName(uri)
      if (!ln) continue
      const key = ln.toLowerCase()
      // Derive prefix by stripping local name from URI (keep up to last # or /)
      const hashIdx = uri.lastIndexOf('#')
      const slashIdx = uri.lastIndexOf('/')
      const splitIdx = Math.max(hashIdx, slashIdx)
      if (splitIdx === -1) continue
      const prefix = uri.slice(0, splitIdx + 1)
      // First wins on duplicate keys
      if (!(key in context)) {
        context[key] = prefix
      }
    }

    // Add standard prefixes (node-derived take priority)
    const standardPrefixes: Record<string, string> = {
      prov: 'http://www.w3.org/ns/prov#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
    }
    for (const [k, v] of Object.entries(standardPrefixes)) {
      if (!(k in context)) {
        context[k] = v
      }
    }

    const compacted = await jsonld.compact(dataset, context)
    return compacted
  } catch (err) {
    throw new Error(`JSON-LD compaction failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}
