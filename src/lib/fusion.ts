import * as N3 from 'n3'
import type { Source } from '@/store/sourcesStore'
import type { Mapping, OntologyNode } from '@/types/index'
import { sourceToInstances } from './shacl/instanceGenerator'
import { generateConstruct } from './sparql'

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
  error?: string
}

export interface FusionResult {
  store: N3.Store
  sources: FusionSourceResult[]
  totalQuads: number
  warnings: string[]
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
    return { store: new N3.Store(), sources: [], totalQuads: 0, warnings: [] }
  }

  const mergedStore = new N3.Store()
  const sourceSummaries: FusionSourceResult[] = []
  const warnings: string[] = []
  const engine = await getEngine()

  for (const source of sources) {
    // Skip empty sources
    if (source.rawData.trim() === '') continue

    // Guard: skip sources with no schema nodes (can't build instance store)
    if (source.schemaNodes.length === 0) {
      console.warn(`Source "${source.name}": no schema nodes — skipping`)
      continue
    }

    const mappings = mappingsBySource[source.id]
    if (!mappings?.length) continue

    // Source's actual prefix from schemaNode (used by instanceGenerator as uriBase)
    const sourcePrefix = source.schemaNodes[0]!.data.prefix

    // Collect CONSTRUCT queries for this source.
    // For non-sparql kinds, regenerate the query with the source's actual prefix
    // so the PREFIX line matches the instance store's uriBase exactly.
    const constructQueries = mappings
      .filter((m) => m.sparqlConstruct?.trim())
      .map((m): string => {
        if (m.kind === 'sparql') return m.sparqlConstruct
        // Regenerate with the correct sourcePrefix to avoid namespace mismatch
        return generateConstruct(m, sourcePrefix)
      })

    if (!constructQueries.length) continue

    // Build instance store from source JSON
    let instanceStore: N3.Store
    try {
      instanceStore = sourceToInstances(source)
      console.debug(`Source "${source.name}": instance store has ${instanceStore.size} quads, prefix="${sourcePrefix}"`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      warnings.push(`Source "${source.name}": failed to parse instances — ${msg}`)
      sourceSummaries.push({ sourceId: source.id, sourceName: source.name, quadCount: 0, error: msg })
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
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        warnings.push(`Source "${source.name}": CONSTRUCT query failed — ${msg}`)
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
    warnings,
  }
}
