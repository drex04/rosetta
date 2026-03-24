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

export type OntologyNode = import('@xyflow/react').Node<ClassData, 'classNode'>

export interface SubclassEdgeData {
  predicate: 'rdfs:subClassOf'
}

export interface ObjectPropertyEdgeData {
  uri: string
  label: string
  predicate: 'owl:ObjectProperty'
}

export type OntologyEdge =
  | import('@xyflow/react').Edge<SubclassEdgeData, 'subclassEdge'>
  | import('@xyflow/react').Edge<ObjectPropertyEdgeData, 'objectPropertyEdge'>
