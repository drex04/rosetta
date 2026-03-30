import type { Mapping } from '@/types/index'
import { localName } from '@/lib/rdf' // RD-01: import, don't re-implement

export function generateConstruct(
  mapping: Omit<Mapping, 'id' | 'sparqlConstruct' | 'kind'> & { kind?: Mapping['kind'] },
): string {
  const m = mapping
  const srcPrefix = derivePrefix(m.sourceClassUri)
  const tgtPrefix = derivePrefix(m.targetClassUri)
  const srcClass = localName(m.sourceClassUri)
  const tgtClass = localName(m.targetClassUri)
  const srcPropRaw = localName(m.sourcePropUri)
  const tgtPropRaw = localName(m.targetPropUri)
  // localName falls back to the full URI when no delimiter yields a non-empty segment
  const srcProp = srcPropRaw === m.sourcePropUri ? 'val' : srcPropRaw || 'val'
  const tgtProp = tgtPropRaw === m.targetPropUri ? 'val' : tgtPropRaw || 'val'

  const kind = m.kind ?? 'direct'

  if (kind === 'direct') {
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

  if (kind === 'template') {
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
      `  ?source src:${srcProp} ?raw .`,
      `  # template: ${m.templatePattern ?? '{field}'}`,
      `  BIND(STR(?raw) AS ?val)`,
      `}`,
    ].join('\n')
  }

  if (kind === 'constant') {
    return [
      `PREFIX tgt: <${tgtPrefix}>`,
      ``,
      `CONSTRUCT {`,
      `  ?target a tgt:${tgtClass} .`,
      `  ?target tgt:${tgtProp} ?val .`,
      `}`,
      `WHERE {`,
      `  BIND("${m.constantValue ?? ''}"^^<${m.constantType ?? 'http://www.w3.org/2001/XMLSchema#string'}> AS ?val)`,
      `}`,
    ].join('\n')
  }

  if (kind === 'typecast') {
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
      `  ?source src:${srcProp} ?raw .`,
      `  BIND(STRDT(STR(?raw), <${m.targetDatatype ?? 'http://www.w3.org/2001/XMLSchema#string'}>) AS ?val)`,
      `}`,
    ].join('\n')
  }

  if (kind === 'language') {
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
      `  ?source src:${srcProp} ?raw .`,
      `  BIND(STRLANG(STR(?raw), "${m.languageTag ?? 'en'}") AS ?val)`,
      `}`,
    ].join('\n')
  }

  if (kind === 'join') {
    return [
      `# JOIN placeholder — parentSourceId: ${m.parentSourceId ?? '?'}  parentRef: ${m.parentRef ?? '?'}  childRef: ${m.childRef ?? '?'}`,
      `PREFIX src: <${srcPrefix}>`,
      `PREFIX tgt: <${tgtPrefix}>`,
      ``,
      `CONSTRUCT {`,
      `  ?target tgt:${tgtProp} ?val .`,
      `}`,
      `WHERE {`,
      `  FILTER(false) # Remove FILTER and implement join logic`,
      `}`,
    ].join('\n')
  }

  // kind === 'sparql': user-managed, return empty string (sparqlConstruct is omitted from param)
  return ''
}

function derivePrefix(classUri: string): string {
  const hash = classUri.lastIndexOf('#')
  if (hash >= 0) return classUri.slice(0, hash + 1)
  const slash = classUri.lastIndexOf('/')
  if (slash >= 0) return classUri.slice(0, slash + 1)
  return classUri
}
