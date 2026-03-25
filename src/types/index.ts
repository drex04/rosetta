export interface PropertyData {
  uri: string
  label: string
  range: string       // e.g. "xsd:float" or full URI for ObjectProperty
  kind: 'datatype' | 'object'
}

export interface ClassData {
  uri: string
  label: string
  prefix: string
  comment?: string
  properties: PropertyData[]
}

export type OntologyNode = import('@xyflow/react').Node<ClassData & Record<string, unknown>, 'classNode'>

export interface SubclassEdgeData {
  predicate: 'rdfs:subClassOf'
}

export interface ObjectPropertyEdgeData {
  uri: string
  label: string
  predicate: 'owl:ObjectProperty'
}

export type OntologyEdge =
  | import('@xyflow/react').Edge<SubclassEdgeData & Record<string, unknown>, 'subclassEdge'>
  | import('@xyflow/react').Edge<ObjectPropertyEdgeData & Record<string, unknown>, 'objectPropertyEdge'>

// ─── ProjectFile ──────────────────────────────────────────────────────────────

export interface ProjectFile {
  version: 1
  ontology: {
    turtleSource: string
    nodePositions: Record<string, { x: number; y: number }>
  }
  sources: import('@/store/sourcesStore').Source[]
  activeSourceId?: string | null
  mappings: unknown[]  // populated in Phase 4
  timestamp: string
}
