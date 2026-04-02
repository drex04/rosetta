export type { ViolationRecord } from './validator';

import type { OntologyNode } from '../../types';
import type { Mapping } from '../../types';
import type { Source } from '../../store/sourcesStore';
import { generateShapes } from './shapesGenerator';
import { sourceToInstances } from './instanceGenerator';
import { executeConstruct } from './constructExecutor';
import { validateWithShacl, type ViolationRecord } from './validator';

export async function validateSource(
  source: Source,
  ontologyNodes: OntologyNode[],
  mappings: Mapping[],
): Promise<ViolationRecord[]> {
  if (source.schemaNodes.length === 0) return [];

  const shapesStore = generateShapes(ontologyNodes);
  const instanceStore = sourceToInstances(source);
  const dataStore = executeConstruct(instanceStore, mappings);
  const violations = await validateWithShacl(dataStore, shapesStore);

  for (const v of violations) {
    v.sourceId = source.id;

    const mapping = mappings.find(
      (m) =>
        m.targetPropUri === v.targetPropUri &&
        m.targetClassUri === v.targetClassUri,
    );

    const node = ontologyNodes.find(
      (n) => n.data.uri === mapping?.targetClassUri,
    );
    v.canvasNodeId = node?.id ?? null;
  }

  return violations;
}
