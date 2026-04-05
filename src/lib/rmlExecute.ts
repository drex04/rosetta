import { parseTurtle } from '@comake/rmlmapper-js';
import type { Source } from '../store/sourcesStore';
import type { Mapping } from '../types/index';
import { generateRml, rmlSourceKey } from './rml';

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

  // Warn about formula-kind mappings that cannot yet execute via RML (stub until Task 3)
  for (const [sourceId, mappings] of Object.entries(mappingsBySource)) {
    const skipped = mappings.filter((m) => m.kind === 'formula').length;
    if (skipped > 0) {
      const name = sources.find((s) => s.id === sourceId)?.name ?? sourceId;
      warnings.push(
        `"${name}": ${skipped} formula mapping(s) skipped — formula execution not yet implemented.`,
      );
    }
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
