export interface PropertyData {
  uri: string
  label: string
  range: string       // e.g. "xsd:float" or full URI for ObjectProperty
  kind: 'datatype' | 'object'
  dataType?: string   // XSD datatype shorthand for inline editing (e.g. "xsd:string")
}

export interface ClassEditPatch {
  label?: string
  uri?: string
  propertyUri?: string
  propPatch?: { label: string; dataType: string }
}

export interface ClassData {
  uri: string
  label: string
  prefix: string
  comment?: string
  properties: PropertyData[]
  editTrigger?: number
  onCommitEdit?: (nodeId: string, patch: ClassEditPatch) => void
  onContextMenu?: (nodeId: string, x: number, y: number) => void
}

export type OntologyNode = import('@xyflow/react').Node<ClassData & Record<string, unknown>, 'classNode'>

export type SourceNodeData = import('@xyflow/react').Node<ClassData & Record<string, unknown>, 'sourceNode'>

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

// ─── MappingGroup ─────────────────────────────────────────────────────────────

export type MappingGroup =
  | { id: string; strategy: 'concat'; separator: string; targetClassUri: string; targetPropUri: string; sparqlConstruct: string }
  | { id: string; strategy: 'coalesce'; separator: string; targetClassUri: string; targetPropUri: string; sparqlConstruct: string }
  | { id: string; strategy: 'template'; separator: string; templatePattern: string; targetClassUri: string; targetPropUri: string; sparqlConstruct: string }

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
  kind: 'direct' | 'template' | 'constant' | 'typecast' | 'language' | 'join' | 'sparql'
  sparqlConstruct: string
  // kind-specific optional fields
  templatePattern?: string      // template: e.g. "{first} {last}"
  constantValue?: string        // constant: literal value
  constantType?: string         // constant: XSD datatype URI, default xsd:string
  targetDatatype?: string       // typecast: XSD datatype URI
  languageTag?: string          // language: e.g. "en"
  parentSourceId?: string       // join: the other source id
  parentRef?: string            // join: property URI in parent source
  childRef?: string             // join: property URI in this source
  groupId?: string              // group membership
  groupOrder?: number           // position within group
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
  groups?: Record<string, MappingGroup[]>
  timestamp: string
}
