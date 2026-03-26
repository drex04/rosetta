import type { Mapping } from '@/types/index'
import { localName } from '@/lib/rdf' // RD-01: import, don't re-implement

export function generateConstruct(
  mapping: Omit<Mapping, 'id' | 'sparqlConstruct' | 'kind'>,
): string {
  const srcPrefix = derivePrefix(mapping.sourceClassUri)
  const tgtPrefix = derivePrefix(mapping.targetClassUri)
  const srcClass = localName(mapping.sourceClassUri)
  const tgtClass = localName(mapping.targetClassUri)
  const srcPropRaw = localName(mapping.sourcePropUri)
  const tgtPropRaw = localName(mapping.targetPropUri)
  // localName falls back to the full URI when no delimiter yields a non-empty segment
  const srcProp = srcPropRaw === mapping.sourcePropUri ? 'val' : srcPropRaw || 'val'
  const tgtProp = tgtPropRaw === mapping.targetPropUri ? 'val' : tgtPropRaw || 'val'

  return [
    `PREFIX src: <${srcPrefix}>`,
    `PREFIX tgt: <${tgtPrefix}>`,
    ``,
    `CONSTRUCT {`,
    `  ?target a tgt:${tgtClass} .`,
    `  ?target tgt:${tgtProp} ?val .`,
    `}`,
    `WHERE {`,
    `  ?source a src:${srcClass} .`,
    `  ?source src:${srcProp} ?val .`,
    `}`,
  ].join('\n')
}

function derivePrefix(classUri: string): string {
  const hash = classUri.lastIndexOf('#')
  if (hash >= 0) return classUri.slice(0, hash + 1)
  const slash = classUri.lastIndexOf('/')
  if (slash >= 0) return classUri.slice(0, slash + 1)
  return classUri
}
