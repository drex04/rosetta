export type { ViolationRecord } from './validator';

import * as N3 from 'n3';
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
  userShapesTurtle?: string,
): Promise<ViolationRecord[]> {
  if (source.schemaNodes.length === 0) return [];

  let shapesStore: N3.Store;
  if (userShapesTurtle && userShapesTurtle.trim().length > 0) {
    const parsed = await new Promise<N3.Store>((resolve) => {
      try {
        const parser = new N3.Parser({ format: 'text/turtle' });
        const store = new N3.Store();
        parser.parse(userShapesTurtle, (err, quad) => {
          if (err) {
            resolve(generateShapes(ontologyNodes));
          } else if (quad) {
            store.addQuad(quad);
          } else {
            // quad is null → end of stream
            resolve(store.size > 0 ? store : generateShapes(ontologyNodes));
          }
        });
      } catch {
        resolve(generateShapes(ontologyNodes));
      }
    });
    shapesStore = parsed;
  } else {
    shapesStore = generateShapes(ontologyNodes);
  }
  const instanceStore = sourceToInstances(source);
  const dataStore = executeConstruct(instanceStore, mappings);
  const violations = await validateWithShacl(dataStore, shapesStore);

  for (const v of violations) {
    v.sourceId = source.id;

    const node = ontologyNodes.find((n) => n.data.uri === v.targetClassUri);
    v.canvasNodeId = node?.id ?? null;
  }

  return violations;
}
