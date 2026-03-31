import { localName } from '@/lib/rdf'
import type { Source } from '@/store/sourcesStore'
import type { Mapping } from '@/types/index'

// ─── inferIterator ────────────────────────────────────────────────────────────

/**
 * Infer a JSONPath iterator expression from a JSON string.
 * Returns a safe fallback of `$[*]` if the JSON is invalid or empty.
 */
export function inferIterator(jsonString: string): string {
  if (jsonString.trim() === '') return '$[*]'

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    return '$[*]'
  }

  // Guard: null or non-object primitives
  if (parsed === null || typeof parsed !== 'object') return '$'

  // Array root
  if (Array.isArray(parsed)) return '$[*]'

  // Plain object — find first key whose value is an array
  const obj = parsed as Record<string, unknown>
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      return `$.${key}[*]`
    }
  }

  return '$'
}

// ─── deriveSubjectTemplate ────────────────────────────────────────────────────

/**
 * Derive an rr:template string for the subject of a TriplesMap.
 * Looks for an id/key property in the schemaNode matching classUri,
 * falls back to first property, then to a safe IRI fallback.
 */
function deriveSubjectTemplate(
  schemaNodes: Source['schemaNodes'],
  classUri: string,
  uriPrefix: string,
): string {
  const node = schemaNodes.find((n) => (n.data as { uri: string }).uri === classUri)
  if (!node) {
    return `http://example.org/${localName(classUri)}/{index}`
  }

  const properties = (node.data as { properties: Array<{ uri: string }> }).properties

  if (!properties || properties.length === 0) {
    return `http://example.org/${localName(classUri)}/{index}`
  }

  // Find property whose localName contains 'id' or 'key' (case-insensitive)
  const idProp = properties.find((p) => {
    const ln = localName(p.uri).toLowerCase()
    return ln.includes('id') || ln.includes('key')
  })

  const varName = idProp ? localName(idProp.uri) : localName(properties[0]!.uri)

  return `${uriPrefix}{${varName}}`
}

// ─── generateRml ──────────────────────────────────────────────────────────────

/**
 * Generate an RML Turtle string from sources and their mappings.
 * Pure function — no side effects, no React/store dependencies.
 */
export function generateRml(
  sources: Source[],
  mappingsBySource: Record<string, Mapping[]>,
): string {
  const lines: string[] = [
    '@prefix rr: <http://www.w3.org/ns/r2rml#> .',
    '@prefix rml: <http://semweb.mmlab.be/ns/rml#> .',
    '@prefix ql: <http://semweb.mmlab.be/ns/ql#> .',
    '@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .',
    '',
  ]

  for (const source of sources) {
    if (source.rawData.trim() === '') continue

    const iterator = inferIterator(source.rawData)
    const mlist = mappingsBySource[source.id] ?? []

    // Group mappings by sourceClassUri
    const byClass = new Map<string, Mapping[]>()
    for (const m of mlist) {
      const existing = byClass.get(m.sourceClassUri) ?? []
      existing.push(m)
      byClass.set(m.sourceClassUri, existing)
    }

    for (const [sourceClassUri, mappings] of byClass) {
      const mapName = `<#${localName(sourceClassUri)}Map>`
      const sanitizedName = source.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      const uriPrefix = `http://src_${sanitizedName}_#`
      const subjectTemplate = deriveSubjectTemplate(source.schemaNodes, sourceClassUri, uriPrefix)

      lines.push(`${mapName} a rr:TriplesMap ;`)
      lines.push(`  rml:logicalSource [`)
      lines.push(`    rml:source "${source.name}.json" ;`)
      lines.push(`    rml:referenceFormulation ql:JSONPath ;`)
      lines.push(`    rml:iterator "${iterator}" ;`)
      lines.push(`  ] ;`)
      lines.push(`  rr:subjectMap [`)
      lines.push(`    rr:template "${subjectTemplate}" ;`)
      lines.push(`    rr:class <${sourceClassUri}> ;`)
      lines.push(`  ] ;`)

      for (const mapping of mappings) {
        if (mapping.kind === 'sparql' || mapping.kind === 'join') {
          lines.push(`  # rr:predicateObjectMap [ # requires manual conversion`)
          lines.push(`  #   rr:predicate <${mapping.targetPropUri}> ;`)
          lines.push(`  #   rr:objectMap [ rml:reference "..." ] ;`)
          lines.push(`  # ] ;`)
        } else if (mapping.kind === 'constant') {
          const val = mapping.constantValue ?? ''
          const dtype = mapping.constantType ?? 'http://www.w3.org/2001/XMLSchema#string'
          lines.push(`  rr:predicateObjectMap [`)
          lines.push(`    rr:predicate <${mapping.targetPropUri}> ;`)
          lines.push(`    rr:objectMap [ rr:object "${val}"^^<${dtype}> ] ;`)
          lines.push(`  ] ;`)
        } else if (mapping.kind === 'language') {
          const ref = localName(mapping.sourcePropUri)
          const lang = mapping.languageTag ?? 'en'
          lines.push(`  rr:predicateObjectMap [`)
          lines.push(`    rr:predicate <${mapping.targetPropUri}> ;`)
          lines.push(`    rr:objectMap [ rml:reference "${ref}" ; rr:language "${lang}" ] ;`)
          lines.push(`  ] ;`)
        } else if (mapping.kind === 'typecast') {
          const ref = localName(mapping.sourcePropUri)
          const dtype = mapping.targetDatatype ?? 'http://www.w3.org/2001/XMLSchema#string'
          lines.push(`  rr:predicateObjectMap [`)
          lines.push(`    rr:predicate <${mapping.targetPropUri}> ;`)
          lines.push(`    rr:objectMap [ rml:reference "${ref}" ; rr:datatype <${dtype}> ] ;`)
          lines.push(`  ] ;`)
        } else {
          // direct, template, or anything else
          const ref = localName(mapping.sourcePropUri)
          lines.push(`  rr:predicateObjectMap [`)
          lines.push(`    rr:predicate <${mapping.targetPropUri}> ;`)
          lines.push(`    rr:objectMap [ rml:reference "${ref}" ] ;`)
          lines.push(`  ] ;`)
        }
      }

      lines.push(` .`)
      lines.push('')
    }
  }

  return lines.join('\n')
}
