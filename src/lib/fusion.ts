import * as N3 from 'n3'
import type { Source } from '@/store/sourcesStore'
import type { Mapping, OntologyNode } from '@/types/index'
import { jsonToInstances } from './shacl/instanceGenerator'

// ─── Lazy Comunica engine ─────────────────────────────────────────────────────

let _engine: import('@comunica/query-sparql').QueryEngine | null = null

async function getEngine() {
  if (!_engine) {
    const { QueryEngine } = await import('@comunica/query-sparql')
    _engine = new QueryEngine()
  }
  return _engine
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface FusionSourceResult {
  sourceId: string
  sourceName: string
  quadCount: number
}

export interface FusionResult {
  store: N3.Store
  sources: FusionSourceResult[]
  totalQuads: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROV_ATTRIBUTED_TO = 'http://www.w3.org/ns/prov#wasAttributedTo'
const XSD_STRING = N3.DataFactory.namedNode('http://www.w3.org/2001/XMLSchema#string')

// ─── Main export ─────────────────────────────────────────────────────────────

export async function executeAllConstructs(
  sources: Source[],
  mappingsBySource: Record<string, Mapping[]>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ontologyNodes: OntologyNode[],
): Promise<FusionResult> {
  if (!sources.length) {
    return { store: new N3.Store(), sources: [], totalQuads: 0 }
  }

  const mergedStore = new N3.Store()
  const sourceSummaries: FusionSourceResult[] = []
  const engine = await getEngine()

  for (const source of sources) {
    // Skip empty sources
    if (source.json.trim() === '') continue

    const mappings = mappingsBySource[source.id]
    if (!mappings?.length) continue

    // Collect CONSTRUCT queries for this source
    const constructQueries = mappings
      .filter((m) => (m.kind === 'sparql' || m.kind === 'direct') && m.sparqlConstruct?.trim())
      .map((m) => m.sparqlConstruct)

    if (!constructQueries.length) continue

    // Build instance store from source JSON
    let instanceStore: N3.Store
    try {
      instanceStore = jsonToInstances(source.json, source.schemaNodes)
    } catch {
      continue
    }

    // Track distinct subjects for this source (for provenance)
    const subjectSet = new Set<string>()
    let sourceQuadCount = 0

    for (const sparqlQuery of constructQueries) {
      try {
        const quadStream = await engine.queryQuads(sparqlQuery, {
          sources: [instanceStore as never],
        })
        const quads = await quadStream.toArray()

        for (const q of quads) {
          mergedStore.addQuad(q)
          sourceQuadCount++
          // Track subject URIs (skip blank nodes for provenance)
          if (q.subject.termType === 'NamedNode') {
            subjectSet.add(q.subject.value)
          }
        }
      } catch {
        // Skip failed queries silently — bad CONSTRUCT won't block others
        continue
      }
    }

    // Provenance annotation: <subject> prov:wasAttributedTo "<sourceName>"^^xsd:string
    for (const subjectUri of subjectSet) {
      mergedStore.addQuad(
        N3.DataFactory.quad(
          N3.DataFactory.namedNode(subjectUri),
          N3.DataFactory.namedNode(PROV_ATTRIBUTED_TO),
          N3.DataFactory.literal(source.name, XSD_STRING),
          N3.DataFactory.defaultGraph(),
        ),
      )
    }

    sourceSummaries.push({
      sourceId: source.id,
      sourceName: source.name,
      quadCount: sourceQuadCount,
    })
  }

  return {
    store: mergedStore,
    sources: sourceSummaries,
    totalQuads: mergedStore.size,
  }
}
