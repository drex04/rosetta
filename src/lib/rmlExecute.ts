import { parseTurtle } from '@comake/rmlmapper-js';
import type { Source } from '../store/sourcesStore';
import type { Mapping } from '../types/index';
import { generateRml, rmlSourceKey } from './rml';
import { parseFormula, evaluate } from './formulaParser';

interface FusionSourceResult {
  sourceId: string;
  sourceName: string;
  error?: string;
}
export interface FusionResult {
  jsonLd: object[];
  sources: FusionSourceResult[];
  warnings: string[];
}

export async function executeAllRml(
  sources: Source[],
  mappingsBySource: Record<string, Mapping[]>,
): Promise<FusionResult> {
  const empty: FusionResult = { jsonLd: [], sources: [], warnings: [] };
  if (!sources.length) return empty;

  const warnings: string[] = [];

  // Validate formula-kind mappings by evaluating against a dummy record.
  // This surfaces parse/arity errors early without blocking RML execution
  // (formulas are executed by the RML mapper via FnO predicateObjectMaps).
  for (const [sourceId, mappings] of Object.entries(mappingsBySource)) {
    const formulaMappings = mappings.filter(
      (m): m is Mapping & { kind: 'formula' } => m.kind === 'formula',
    );
    if (!formulaMappings.length) continue;
    const sourceName = sources.find((s) => s.id === sourceId)?.name ?? sourceId;
    const count = formulaMappings.length;
    const errors: string[] = [];
    for (const m of formulaMappings) {
      try {
        const ast = parseFormula(m.formulaExpression ?? '');
        evaluate(ast, {});
      } catch (e) {
        errors.push((e as Error).message);
      }
    }
    if (errors.length === 0) continue;
    warnings.push(
      `"${sourceName}": ${count} formula mapping${count > 1 ? 's' : ''} — ${errors[0]}`,
    );
  }

  const rmlTurtle = generateRml(sources, mappingsBySource);
  if (!rmlTurtle.trim()) return { ...empty, warnings };

  const inputFiles: Record<string, string> = {};
  for (const source of sources) {
    if (source.rawData.trim())
      inputFiles[rmlSourceKey(source)] = source.rawData;
  }

  try {
    // @comake/rmlmapper-js has no TypeScript declarations; the default output
    // without toRDF:true is JSON-LD (object[]).
    const jsonLd = (await parseTurtle(rmlTurtle, inputFiles, {
      xpathLib: 'fontoxpath',
    })) as object[];
    const sourceSummaries: FusionSourceResult[] = sources
      .filter((s) => s.rawData.trim() && mappingsBySource[s.id]?.length)
      .map((s) => ({ sourceId: s.id, sourceName: s.name }));
    return { jsonLd, sources: sourceSummaries, warnings };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'RML execution failed';
    return { ...empty, warnings: [...warnings, msg] };
  }
}
