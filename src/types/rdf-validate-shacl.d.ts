declare module 'rdf-validate-shacl' {
  import type * as RDF from '@rdfjs/types';

  export interface ValidationResult {
    message: Array<{ value: string }>;
    path?: RDF.Quad_Object | null;
    focusNode?: RDF.Quad_Object | null;
    severity?: RDF.Quad_Object | null;
    sourceShape?: RDF.Quad_Object | null;
    sourceConstraintComponent?: RDF.Quad_Object | null;
  }

  export interface ValidationReport {
    conforms: boolean;
    results: ValidationResult[];
  }

  export default class SHACLValidator {
    constructor(shapes: RDF.DatasetCore, options?: { factory?: unknown });
    validate(
      data: RDF.DatasetCore,
    ): Promise<ValidationReport> | ValidationReport;
  }
}

declare module 'rdf-validate-shacl/src/defaultEnv.js' {
  const defaultEnv: unknown;
  export default defaultEnv;
}
