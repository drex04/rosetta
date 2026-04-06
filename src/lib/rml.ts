import { localName } from '@/lib/rdf';
import { parseFormula } from '@/lib/formulaParser';
import type { Expr } from '@/lib/formulaParser';
import type { Source } from '@/store/sourcesStore';
import type { Mapping } from '@/types/index';

// ─── rmlSourceKey ─────────────────────────────────────────────────────────────

/**
 * Derive the logical source filename key for a given source.
 * XML sources get a .xml extension; all others get .json.
 */
export function rmlSourceKey(source: Source): string {
  const ext = source.dataFormat === 'xml' ? '.xml' : '.json';
  return source.name.replace(/[^a-zA-Z0-9._-]/g, '_') + ext;
}

// ─── inferIterator ────────────────────────────────────────────────────────────

/**
 * Infer a JSONPath iterator expression from a JSON string.
 * Returns a safe fallback of `$[*]` if the JSON is invalid or empty.
 */
export function inferIterator(jsonString: string): string {
  if (jsonString.trim() === '') return '$[*]';

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return '$[*]';
  }

  // Guard: null or non-object primitives
  if (parsed === null || typeof parsed !== 'object') return '$';

  // Array root
  if (Array.isArray(parsed)) return '$[*]';

  // Plain object — find first key whose value is an array
  const obj = parsed as Record<string, unknown>;
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      return `$.${key}[*]`;
    }
  }

  return '$';
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
  const node = schemaNodes.find(
    (n) => (n.data as { uri: string }).uri === classUri,
  );
  if (!node) {
    return `http://example.org/${localName(classUri)}/{index}`;
  }

  const properties = (node.data as { properties: Array<{ uri: string }> })
    .properties;

  if (!properties || properties.length === 0) {
    return `http://example.org/${localName(classUri)}/{index}`;
  }

  // Find property whose localName contains 'id' or 'key' (case-insensitive)
  const idProp = properties.find((p) => {
    const ln = localName(p.uri).toLowerCase();
    return ln.includes('id') || ln.includes('key');
  });

  const varName = idProp
    ? localName(idProp.uri)
    : localName(properties[0]!.uri);

  return `${uriPrefix}{${varName}}`;
}

// ─── emitFnOPOM ───────────────────────────────────────────────────────────────

function turtleEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Map formula function name → { grelFn, params } */
const FNO_MAP: Record<string, { grelFn: string; params: string[] }> = {
  UPPER: { grelFn: 'toUpperCase', params: ['valueParameter'] },
  LOWER: { grelFn: 'toLowerCase', params: ['valueParameter'] },
  TRIM: { grelFn: 'trim', params: ['valueParameter'] },
  REPLACE: {
    grelFn: 'string_replace',
    params: ['valueParameter', 'param2Str', 'param3Str'],
  },
  CONCAT: {
    grelFn: 'string_concat',
    params: ['valueParameter', 'valueParameter2'],
  },
};

/**
 * Emit a single argument as a predicateObjectMap parameter block.
 * Returns the Turtle lines as a string (indented).
 */
function emitArg(
  arg: Expr,
  paramPredicate: string,
  indent: string,
  mappingId: string,
  counter: { n: number },
): string {
  if (arg.type === 'field') {
    return (
      `${indent}rr:predicateObjectMap [\n` +
      `${indent}  rr:predicate grel:${paramPredicate} ;\n` +
      `${indent}  rr:objectMap [ rml:reference "${arg.path}" ]\n` +
      `${indent}] ;\n`
    );
  } else if (arg.type === 'literal') {
    return (
      `${indent}rr:predicateObjectMap [\n` +
      `${indent}  rr:predicate grel:${paramPredicate} ;\n` +
      `${indent}  rr:objectMap [ rr:constant "${turtleEscape(arg.value)}" ]\n` +
      `${indent}] ;\n`
    );
  } else if (arg.type === 'call') {
    // Nested function call — emit inline blank node
    const inner = emitFnOCallBlock(arg, mappingId, counter, indent + '  ');
    return (
      `${indent}rr:predicateObjectMap [\n` +
      `${indent}  rr:predicate grel:${paramPredicate} ;\n` +
      `${indent}  rr:objectMap [\n` +
      `${indent}    fnml:functionValue [\n` +
      `${inner}` +
      `${indent}    ]\n` +
      `${indent}  ]\n` +
      `${indent}] ;\n`
    );
  }
  return '';
}

/**
 * Emit the inner body of a functionValue block (logicalSource, subjectMap, executes POM, param POMs).
 * Returns lines as a string (indented by `indent`).
 */
function emitFnOCallBlock(
  callExpr: { fn: string; args: Expr[] },
  mappingId: string,
  counter: { n: number },
  indent: string,
): string {
  const spec = FNO_MAP[callExpr.fn];
  if (!spec) return '';

  const args = callExpr.args;
  let out = '';

  if (callExpr.fn === 'CONCAT' && args.length > 2) {
    // Build left-associative chain: CONCAT(a,b,c,d) → CONCAT(CONCAT(CONCAT(a,b),c),d)
    let chainExpr: Expr = {
      type: 'call',
      fn: 'CONCAT',
      args: [args[0]!, args[1]!],
    };
    for (let i = 2; i < args.length; i++) {
      chainExpr = { type: 'call', fn: 'CONCAT', args: [chainExpr, args[i]!] };
    }
    return emitFnOCallBlock(
      chainExpr as { fn: string; args: Expr[] },
      mappingId,
      counter,
      indent,
    );
  }

  out += `${indent}rr:subjectMap [ rr:termType rr:BlankNode ] ;\n`;
  out += `${indent}rr:predicateObjectMap [\n`;
  out += `${indent}  rr:predicate fno:executes ;\n`;
  out += `${indent}  rr:objectMap [ rr:constant grel:${spec.grelFn} ]\n`;
  out += `${indent}] ;\n`;

  for (let i = 0; i < args.length; i++) {
    const param = spec.params[i] ?? spec.params[spec.params.length - 1]!;
    out += emitArg(args[i]!, param, indent, mappingId, counter);
  }

  return out;
}

/**
 * Emit an RML FnO predicateObjectMap for a formula mapping.
 */
export function emitFnOPOM(
  ast: Expr,
  mapping: Mapping,
  sourceName: string,
  counter: { n: number },
): string {
  if (ast.type !== 'call') return '';

  const callExpr = ast as { type: 'call'; fn: string; args: Expr[] };
  counter.n++;
  const sanitized = sourceName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const innerIndent = '        ';

  let inner = `        rml:logicalSource :${sanitized}_source ;\n`;
  inner += emitFnOCallBlock(callExpr, mapping.id, counter, innerIndent);

  return (
    `  rr:predicateObjectMap [\n` +
    `    rr:predicate <${mapping.targetPropUri}> ;\n` +
    `    rr:objectMap [\n` +
    `      fnml:functionValue [\n` +
    `${inner}` +
    `      ]\n` +
    `    ]\n` +
    `  ] ;\n`
  );
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
    '@prefix fno: <https://w3id.org/function/ontology#> .',
    '@prefix fnml: <http://semweb.mmlab.be/ns/fnml#> .',
    '@prefix grel: <http://users.ugent.be/~bjdmeest/function/grel.ttl#> .',
    '',
  ];

  for (const source of sources) {
    if (source.rawData.trim() === '') continue;

    const isXml = source.dataFormat === 'xml';
    const mlist = mappingsBySource[source.id] ?? [];

    // Group mappings by sourceClassUri
    const byClass = new Map<string, Mapping[]>();
    for (const m of mlist) {
      const existing = byClass.get(m.sourceClassUri) ?? [];
      existing.push(m);
      byClass.set(m.sourceClassUri, existing);
    }

    for (const [sourceClassUri, mappings] of byClass) {
      const mapName = `<#${localName(sourceClassUri)}Map>`;
      const sanitizedName = source.name
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase();
      const uriPrefix = `http://src_${sanitizedName}_#`;
      const subjectTemplate = deriveSubjectTemplate(
        source.schemaNodes,
        sourceClassUri,
        uriPrefix,
      );

      lines.push(`${mapName} a rr:TriplesMap ;`);
      lines.push(`  rml:logicalSource [`);
      lines.push(`    rml:source "${rmlSourceKey(source)}" ;`);
      if (isXml) {
        lines.push(`    rml:referenceFormulation ql:XPath ;`);
        lines.push(`    rml:iterator "/*" ;`);
      } else {
        const iterator = inferIterator(source.rawData);
        lines.push(`    rml:referenceFormulation ql:JSONPath ;`);
        lines.push(`    rml:iterator "${iterator}" ;`);
      }
      lines.push(`  ] ;`);
      lines.push(`  rr:subjectMap [`);
      lines.push(`    rr:template "${subjectTemplate}" ;`);
      lines.push(`    rr:class <${sourceClassUri}> ;`);
      lines.push(`  ] ;`);

      const counter = { n: 0 };
      const sourceName = source.name;

      for (const mapping of mappings) {
        if (mapping.kind === 'formula') {
          try {
            const ast = parseFormula(mapping.formulaExpression ?? '');
            lines.push(emitFnOPOM(ast, mapping, sourceName, counter));
          } catch (e) {
            lines.push(`  # formula-error: ${(e as Error).message}`);
          }
        } else if (mapping.kind === 'constant') {
          const val = mapping.constantValue ?? '';
          const dtype =
            mapping.constantType ?? 'http://www.w3.org/2001/XMLSchema#string';
          lines.push(`  rr:predicateObjectMap [`);
          lines.push(`    rr:predicate <${mapping.targetPropUri}> ;`);
          lines.push(`    rr:objectMap [ rr:object "${val}"^^<${dtype}> ] ;`);
          lines.push(`  ] ;`);
        } else if (mapping.kind === 'language') {
          const ref = localName(mapping.sourcePropUri);
          const lang = mapping.languageTag ?? 'en';
          lines.push(`  rr:predicateObjectMap [`);
          lines.push(`    rr:predicate <${mapping.targetPropUri}> ;`);
          lines.push(
            `    rr:objectMap [ rml:reference "${ref}" ; rr:language "${lang}" ] ;`,
          );
          lines.push(`  ] ;`);
        } else if (mapping.kind === 'typecast') {
          const ref = localName(mapping.sourcePropUri);
          const dtype =
            mapping.targetDatatype ?? 'http://www.w3.org/2001/XMLSchema#string';
          lines.push(`  rr:predicateObjectMap [`);
          lines.push(`    rr:predicate <${mapping.targetPropUri}> ;`);
          lines.push(
            `    rr:objectMap [ rml:reference "${ref}" ; rr:datatype <${dtype}> ] ;`,
          );
          lines.push(`  ] ;`);
        } else {
          // direct, template, or anything else
          const ref = localName(mapping.sourcePropUri);
          lines.push(`  rr:predicateObjectMap [`);
          lines.push(`    rr:predicate <${mapping.targetPropUri}> ;`);
          lines.push(`    rr:objectMap [ rml:reference "${ref}" ] ;`);
          lines.push(`  ] ;`);
        }
      }

      lines.push(` .`);
      lines.push('');
    }
  }

  return lines.join('\n');
}
