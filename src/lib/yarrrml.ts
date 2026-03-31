import { inferIterator } from '@/lib/rml'
import { localName } from '@/lib/rdf'
import type { Source } from '@/store/sourcesStore'
import type { Mapping } from '@/types/index'

// ─── YARRRML Generator ────────────────────────────────────────────────────────
// Pure functions only — no React, Zustand, store, or @xyflow/react imports.
// Produces YARRRML YAML as a plain string without js-yaml.

function escapeYamlString(value: string): string {
  return value.replace(/"/g, '\\"')
}

function buildSubjectTemplate(
  uriPrefix: string,
  sourceClassUri: string,
  mappings: Mapping[],
): string {
  // Collect all unique sourcePropUri local names from this class's mappings
  const propLocalNames = mappings.map((m) => localName(m.sourcePropUri))

  // Find first property whose local name contains 'id' or 'key' (case-insensitive)
  const idProp = propLocalNames.find((p) =>
    /id|key/i.test(p),
  )

  if (idProp) {
    return `${uriPrefix}{${idProp}}`
  }

  // Fall back to first property if any
  if (propLocalNames.length > 0) {
    return `${uriPrefix}{${propLocalNames[0]}}`
  }

  // Last resort: use class local name with {index}
  return `http://example.org/${localName(sourceClassUri)}/{index}`
}

/**
 * Generate a YARRRML YAML string from sources and their mappings.
 *
 * @param sources - All data sources
 * @param mappingsBySource - Record mapping source id → its Mapping[]
 * @returns YARRRML YAML as a string
 */
export function generateYarrrml(
  sources: Source[],
  mappingsBySource: Record<string, Mapping[]>,
): string {
  const lines: string[] = []

  // Header
  lines.push('prefixes:')
  lines.push('  rr: "http://www.w3.org/ns/r2rml#"')
  lines.push('  rml: "http://semweb.mmlab.be/ns/rml#"')
  lines.push('  xsd: "http://www.w3.org/2001/XMLSchema#"')
  lines.push('')
  lines.push('mappings:')

  const mapBlocks: string[] = []

  for (const source of sources) {
    if (source.rawData.trim() === '') continue

    const iterator = inferIterator(source.rawData)
    const safeName = source.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    const uriPrefix = `http://src_${safeName}_#`

    const sourceMappings = mappingsBySource[source.id] ?? []

    // Group mappings by sourceClassUri
    const byClass: Record<string, Mapping[]> = {}
    for (const m of sourceMappings) {
      if (!byClass[m.sourceClassUri]) byClass[m.sourceClassUri] = []
      byClass[m.sourceClassUri]!.push(m)
    }

    for (const [sourceClassUri, classMappings] of Object.entries(byClass)) {
      const mapKey = `${localName(sourceClassUri)}Map`
      const subjectTemplate = buildSubjectTemplate(uriPrefix, sourceClassUri, classMappings)

      const block: string[] = []
      block.push(`  ${mapKey}:`)
      block.push(`    sources:`)
      block.push(`      - ["${escapeYamlString(source.name)}.json~jsonpath", "${escapeYamlString(iterator)}"]`)
      block.push(`    s: "${escapeYamlString(subjectTemplate)}"`)
      block.push(`    po:`)
      block.push(`      - [a, "<${sourceClassUri}>"]`)

      for (const m of classMappings) {
        if (m.kind === 'sparql' || m.kind === 'join') {
          block.push(`      # - ["<${m.targetPropUri}>", "?"] # requires manual conversion`)
        } else if (m.kind === 'constant') {
          const val = escapeYamlString(m.constantValue ?? '')
          const dtype = m.constantType ?? 'http://www.w3.org/2001/XMLSchema#string'
          block.push(`      - ["<${m.targetPropUri}>", "${val}^^<${dtype}>"]`)
        } else if (m.kind === 'language') {
          const prop = localName(m.sourcePropUri)
          const lang = m.languageTag ?? 'en'
          block.push(`      - ["<${m.targetPropUri}>", "${escapeYamlString(prop)}~jsonpath", "lang=${lang}"]`)
        } else if (m.kind === 'typecast') {
          const prop = localName(m.sourcePropUri)
          const dtype = m.targetDatatype ?? 'http://www.w3.org/2001/XMLSchema#string'
          block.push(`      - ["<${m.targetPropUri}>", "${escapeYamlString(prop)}~jsonpath", "datatype=<${dtype}>"]`)
        } else {
          // direct | template
          const prop = localName(m.sourcePropUri)
          block.push(`      - ["<${m.targetPropUri}>", "${escapeYamlString(prop)}~jsonpath"]`)
        }
      }

      mapBlocks.push(block.join('\n'))
    }
  }

  if (mapBlocks.length > 0) {
    lines.push('')
    lines.push(mapBlocks.join('\n\n'))
  }

  return lines.join('\n')
}
