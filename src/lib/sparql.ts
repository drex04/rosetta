import type { Mapping, MappingGroup } from '@/types/index';
import { localName } from '@/lib/rdf'; // RD-01: import, don't re-implement

export function generateConstruct(
  mapping: Omit<Mapping, 'id' | 'sparqlConstruct' | 'kind'> & {
    kind?: Mapping['kind'];
  },
  sourcePrefix?: string,
): string {
  const m = mapping;
  const srcPrefix = sourcePrefix ?? derivePrefix(m.sourceClassUri);
  const tgtPrefix = derivePrefix(m.targetClassUri);
  const srcClass = localName(m.sourceClassUri);
  const tgtClass = localName(m.targetClassUri);
  const srcPropRaw = localName(m.sourcePropUri);
  const tgtPropRaw = localName(m.targetPropUri);
  // localName falls back to the full URI when no delimiter yields a non-empty segment
  const srcProp = srcPropRaw === m.sourcePropUri ? 'val' : srcPropRaw || 'val';
  const tgtProp = tgtPropRaw === m.targetPropUri ? 'val' : tgtPropRaw || 'val';

  const kind = m.kind ?? 'direct';

  if (kind === 'direct') {
    return [
      `PREFIX src: <${srcPrefix}>`,
      `PREFIX tgt: <${tgtPrefix}>`,
      ``,
      `CONSTRUCT {`,
      `  ?source a tgt:${tgtClass} .`,
      `  ?source tgt:${tgtProp} ?val .`,
      `}`,
      `WHERE {`,
      `  ?source a src:${srcClass} .`,
      `  ?source src:${srcProp} ?val .`,
      `}`,
    ].join('\n');
  }

  if (kind === 'template') {
    const pattern = m.templatePattern ?? '';
    // Expand {fieldname} placeholders — each {name} maps to a SPARQL variable ?name
    // Collect unique field names in order of appearance for the WHERE triple patterns
    const fieldNames: string[] = [];
    const parts = pattern.split(/(\{[^}]+\})/);
    const concatArgs: string[] = [];
    for (const part of parts) {
      const match = part.match(/^\{([^}]+)\}$/);
      if (match) {
        const fieldName = match[1]!;
        if (!fieldNames.includes(fieldName)) fieldNames.push(fieldName);
        concatArgs.push(`STR(?${fieldName})`);
      } else if (part.length > 0) {
        concatArgs.push(`"${part}"`);
      }
    }

    // If no placeholders or empty pattern, fall back to ?raw
    if (concatArgs.length === 0 || fieldNames.length === 0) {
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
        `  # template: ${pattern || '{field}'}`,
        `  BIND(STR(?raw) AS ?val)`,
        `}`,
      ].join('\n');
    }

    const bindExpr =
      concatArgs.length === 1
        ? concatArgs[0]!
        : `CONCAT(${concatArgs.join(', ')})`;
    const triples = fieldNames.map((f) => `  ?source src:${f} ?${f} .`);

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
      ...triples,
      `  BIND(${bindExpr} AS ?val)`,
      `}`,
    ].join('\n');
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
    ].join('\n');
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
    ].join('\n');
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
    ].join('\n');
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
    ].join('\n');
  }

  // kind === 'sparql': user-managed, return empty string (sparqlConstruct is omitted from param)
  return '';
}

export function generateGroupConstruct(
  group: MappingGroup,
  members: Mapping[],
): string {
  if (members.length === 0) return '';

  // Sort by groupOrder ascending
  const sorted = [...members].sort(
    (a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0),
  );

  // Derive prefixes from first member (sorted is non-empty due to early return above)
  const first = sorted[0]!;
  const srcPrefix = derivePrefix(first.sourceClassUri);
  const tgtPrefix = derivePrefix(group.targetClassUri);
  const srcClass = localName(first.sourceClassUri);
  const tgtClass = localName(group.targetClassUri);
  const tgtPropRaw = localName(group.targetPropUri);
  const tgtProp =
    tgtPropRaw === group.targetPropUri ? 'val' : tgtPropRaw || 'val';

  // Build per-member prop local names and variable names
  const propLines = sorted.map((m, i) => {
    const raw = localName(m.sourcePropUri);
    const prop = raw === m.sourcePropUri ? `prop${i}` : raw || `prop${i}`;
    return { prop, varName: `v${i}` };
  });

  const prefixLines = [
    `PREFIX src: <${srcPrefix}>`,
    `PREFIX tgt: <${tgtPrefix}>`,
  ];

  const constructBlock = [
    `CONSTRUCT {`,
    `  ?target a tgt:${tgtClass} .`,
    `  ?target tgt:${tgtProp} ?joinedVal .`,
    `}`,
  ];

  if (group.strategy === 'concat') {
    const sep = group.separator ?? '';
    const triples = propLines.map(
      (p) => `  ?source src:${p.prop} ?${p.varName} .`,
    );
    const concatArgs = propLines.flatMap((p, i) =>
      i < propLines.length - 1
        ? [`STR(?${p.varName})`, `"${sep}"`]
        : [`STR(?${p.varName})`],
    );
    const bindLine = `  BIND(CONCAT(${concatArgs.join(', ')}) AS ?joinedVal)`;

    return [
      ...prefixLines,
      ``,
      ...constructBlock,
      `WHERE {`,
      `  ?source a src:${srcClass} .`,
      ...triples,
      bindLine,
      `}`,
    ].join('\n');
  }

  if (group.strategy === 'coalesce') {
    const optionals = propLines.map(
      (p) => `  OPTIONAL { ?source src:${p.prop} ?${p.varName} . }`,
    );
    const coalesceArgs = propLines.map((p) => `?${p.varName}`).join(', ');
    const bindLine = `  BIND(COALESCE(${coalesceArgs}) AS ?joinedVal)`;

    return [
      ...prefixLines,
      ``,
      ...constructBlock,
      `WHERE {`,
      `  ?source a src:${srcClass} .`,
      ...optionals,
      bindLine,
      `}`,
    ].join('\n');
  }

  // strategy === 'template'
  const pattern = group.templatePattern ?? '';
  // Split template on {N} placeholders and rebuild as CONCAT args
  const parts = pattern.split(/(\{\d+\})/);
  const concatArgs: string[] = [];
  for (const part of parts) {
    const match = part.match(/^\{(\d+)\}$/);
    if (match) {
      const idx = parseInt(match[1] ?? '0', 10);
      const pl = propLines[idx];
      if (pl !== undefined) {
        concatArgs.push(`STR(?${pl.varName})`);
      }
    } else if (part.length > 0) {
      concatArgs.push(`"${part}"`);
    }
  }
  const concatExpr =
    concatArgs.length === 1
      ? concatArgs[0]
      : `CONCAT(${concatArgs.join(', ')})`;
  const bindLine = `  BIND(${concatExpr} AS ?joinedVal)`;
  const triples = propLines.map(
    (p) => `  ?source src:${p.prop} ?${p.varName} .`,
  );

  return [
    ...prefixLines,
    ``,
    ...constructBlock,
    `WHERE {`,
    `  ?source a src:${srcClass} .`,
    ...triples,
    bindLine,
    `}`,
  ].join('\n');
}

function derivePrefix(classUri: string): string {
  const hash = classUri.lastIndexOf('#');
  if (hash >= 0) return classUri.slice(0, hash + 1);
  const slash = classUri.lastIndexOf('/');
  if (slash >= 0) return classUri.slice(0, slash + 1);
  return classUri;
}
