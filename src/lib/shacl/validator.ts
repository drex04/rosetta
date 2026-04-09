import * as N3 from 'n3';
import SHACLValidator from 'rdf-validate-shacl';
import defaultEnv from 'rdf-validate-shacl/src/defaultEnv.js';

export const ShaclFactory = defaultEnv;

export interface ViolationRecord {
  id: string;
  sourceId: string;
  targetClassUri: string;
  targetPropUri: string | null;
  message: string;
  severity: string;
  canvasNodeId: string | null;
}

export async function validateWithShacl(
  dataStore: N3.Store,
  shapesStore: N3.Store,
): Promise<ViolationRecord[]> {
  const SH_PROPERTY = 'http://www.w3.org/ns/shacl#property';

  try {
    const validator = new SHACLValidator(shapesStore, {
      factory: ShaclFactory,
    });
    const report = await validator.validate(dataStore);

    if (report.conforms) return [];

    return report.results.map((result) => {
      // sourceShape is the sh:property blank node — walk up to the NodeShape
      const sourceShapeTerm = result.sourceShape;
      let targetClassUri = '';
      if (sourceShapeTerm) {
        const parentShapes = shapesStore.getSubjects(
          SH_PROPERTY,
          sourceShapeTerm,
          null,
        );
        const parentShape = parentShapes[0];
        if (parentShape && parentShape.termType === 'NamedNode') {
          targetClassUri = parentShape.value.replace(/Shape$/, '');
        }
      }

      const pathVal = result.path?.value ?? null;
      const targetPropUri = pathVal && pathVal.length > 0 ? pathVal : null;

      const messages = result.message;
      const message =
        messages && messages.length > 0
          ? (messages[0]!.value ?? 'SHACL violation')
          : 'SHACL violation';

      const severity = result.severity?.value ?? '';

      return {
        id: crypto.randomUUID(),
        sourceId: '',
        targetClassUri,
        targetPropUri,
        message,
        severity,
        canvasNodeId: null,
      } satisfies ViolationRecord;
    });
  } catch (err) {
    throw new Error(
      `SHACL validation failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
