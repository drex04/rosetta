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

export type SourceNode = import('@xyflow/react').Node<ClassData & Record<string, unknown>, 'sourceNode'>

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

// ─── Mapping ──────────────────────────────────────────────────────────────────

export interface Mapping {
  id: string
  sourceId: string
  sourceClassUri: string
  sourcePropUri: string
  targetClassUri: string
  targetPropUri: string
  sourceHandle: string   // e.g. 'prop_trackId' — stored directly from connection (RD-02)
  targetHandle: string   // e.g. 'target_prop_identifier' — stored directly from connection (RD-02)
  kind: 'direct' | 'sparql'
  sparqlConstruct: string
}

// ─── ProjectFile ──────────────────────────────────────────────────────────────

export interface ProjectFile {
  version: 1
  ontology: {
    turtleSource: string
    nodePositions: Record<string, { x: number; y: number }>
  }
  sources: import('@/store/sourcesStore').Source[]
  activeSourceId?: string | null
  mappings: Record<string, Mapping[]>
  timestamp: string
}
