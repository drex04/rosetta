import * as N3 from 'n3'
import { MarkerType } from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import type { ClassData, PropertyData, ObjectPropertyEdgeData } from '@/types/index'
import { COLUMN_X_SOURCE, COLUMN_SPACING } from '@/lib/rdf'

// ─── Constants ────────────────────────────────────────────────────────────────

const RDF_TYPE             = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
const RDFS_LABEL           = 'http://www.w3.org/2000/01/rdf-schema#label'
const RDFS_DOMAIN          = 'http://www.w3.org/2000/01/rdf-schema#domain'
const RDFS_RANGE           = 'http://www.w3.org/2000/01/rdf-schema#range'
const OWL_CLASS            = 'http://www.w3.org/2002/07/owl#Class'
const OWL_DATATYPE_PROPERTY = 'http://www.w3.org/2002/07/owl#DatatypeProperty'
const OWL_OBJECT_PROPERTY   = 'http://www.w3.org/2002/07/owl#ObjectProperty'
const XSD                  = 'http://www.w3.org/2001/XMLSchema#'

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SchemaResult {
  nodes: Node[]
  edges: Edge[]
  turtle: string
  warnings: string[]
}

// Internal node type alias for source nodes
type SourceNode = Node<ClassData & Record<string, unknown>, 'sourceNode'>

// ─── URI helpers ──────────────────────────────────────────────────────────────

/**
 * Derive a URI prefix from a source name.
 * Strip all non-alphanumeric chars (except underscore), lowercase,
 * then wrap as `src_<name>_`.
 * Example: 'Norway/Track#Alpha' → 'src_norwayTrackalpha_'
 */
function deriveUriPrefix(sourceName: string): string {
  // Remove all characters that are not alphanumeric or underscore
  const sanitized = sourceName.replace(/[^a-zA-Z0-9_]/g, '')
  // Lowercase everything
  const lower = sanitized.toLowerCase()
  return `src_${lower}_`
}

/**
 * Convert a camelCase or lower-camelCase key to PascalCase.
 * No singularization — key is used as-is except first char uppercased.
 * 'radarTracks' → 'RadarTracks', 'Radarspuren' → 'Radarspuren'
 */
function toPascalCase(key: string): string {
  if (key.length === 0) return key
  return key[0]!.toUpperCase() + key.slice(1)
}

// Abbreviated range for node data (used in PropertyData.range field)
function xsdRangeShort(value: unknown): string {
  if (typeof value === 'boolean') return 'xsd:boolean'
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return 'xsd:integer'
    return 'xsd:float'
  }
  return 'xsd:string'
}

// ─── Walker ───────────────────────────────────────────────────────────────────

interface WalkContext {
  uriBase: string          // e.g. 'http://src_norwayradar_#'
  visited: WeakSet<object>
  nodes: SourceNode[]
  edges: Edge[]
  warnings: string[]
  classIndex: { value: number }
}

/**
 * Walk a plain object value and emit a Class node plus properties.
 * Returns the class URI (so a parent can link to it via ObjectProperty).
 */
function walkObject(
  obj: Record<string, unknown>,
  className: string,
  ctx: WalkContext,
  path: string,
): string {
  const classUri = `${ctx.uriBase}${className}`
  const properties: PropertyData[] = []
  const objectProps: Array<{ propName: string; rangeUri: string }> = []

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      // Treat null/undefined as xsd:string
      properties.push({ uri: `${ctx.uriBase}${key}`, label: key, range: 'xsd:string', kind: 'datatype' })
      continue
    }

    const childPath = `${path}.${key}`

    if (typeof value === 'object') {
      if (ctx.visited.has(value as object)) {
        ctx.warnings.push(`Circular reference detected at path: ${childPath}`)
        // Suppress the property — do not emit
        continue
      }

      if (Array.isArray(value)) {
        // Array: find first non-null element
        const first = (value as unknown[]).find((item) => item !== null && item !== undefined)
        if (first === undefined || first === null) {
          // Empty array or all-null → treat as xsd:string
          properties.push({ uri: `${ctx.uriBase}${key}`, label: key, range: 'xsd:string', kind: 'datatype' })
        } else if (typeof first === 'object') {
          if (ctx.visited.has(first as object)) {
            ctx.warnings.push(`Circular reference detected at path: ${childPath}[]`)
            continue
          }
          ctx.visited.add(first as object)
          const nestedClassName = toPascalCase(key)
          const nestedUri = walkObject(first as Record<string, unknown>, nestedClassName, ctx, `${childPath}[]`)
          ctx.visited.delete(first as object)
          objectProps.push({ propName: key, rangeUri: nestedUri })
        } else {
          // Array of primitives → DatatypeProperty xsd:string (or infer from first)
          properties.push({ uri: `${ctx.uriBase}${key}`, label: key, range: xsdRangeShort(first), kind: 'datatype' })
        }
      } else {
        // Plain object
        ctx.visited.add(value as object)
        const nestedClassName = toPascalCase(key)
        const nestedUri = walkObject(value as Record<string, unknown>, nestedClassName, ctx, childPath)
        ctx.visited.delete(value as object)
        objectProps.push({ propName: key, rangeUri: nestedUri })
      }
    } else {
      // Primitive
      properties.push({
        uri: `${ctx.uriBase}${key}`,
        label: key,
        range: xsdRangeShort(value),
        kind: 'datatype',
      })
    }
  }

  const nodeId = crypto.randomUUID()
  const classIndex = ctx.classIndex.value++

  const node: SourceNode = {
    id: nodeId,
    type: 'sourceNode',
    position: { x: COLUMN_X_SOURCE, y: classIndex * COLUMN_SPACING },
    data: {
      uri: classUri,
      label: className,
      prefix: ctx.uriBase,
      properties,
    },
  }
  ctx.nodes.push(node)

  // Now emit ObjectProperty edges
  for (const { propName, rangeUri } of objectProps) {
    // Find the range node by URI
    const rangeNode = ctx.nodes.find((n) => (n.data as ClassData).uri === rangeUri)
    if (!rangeNode) continue

    const propUri = `${ctx.uriBase}${propName}`
    const edgeId = crypto.randomUUID()

    const edgeData: ObjectPropertyEdgeData & Record<string, unknown> = {
      uri: propUri,
      label: propName,
      predicate: 'owl:ObjectProperty',
    }

    const edge: Edge<ObjectPropertyEdgeData & Record<string, unknown>, 'objectPropertyEdge'> = {
      id: edgeId,
      type: 'objectPropertyEdge',
      source: nodeId,
      target: rangeNode.id,
      sourceHandle: 'class-right',
      targetHandle: 'class-left',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: edgeData,
    }
    ctx.edges.push(edge)
  }

  return classUri
}

// ─── Turtle serialization ─────────────────────────────────────────────────────

function serializeToTurtle(
  nodes: SourceNode[],
  edges: Edge[],
  uriBase: string,
  prefixAlias: string,
  warnings: string[],
): string {
  try {
    const prefixes: Record<string, string> = {
      rdf:  'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      owl:  'http://www.w3.org/2002/07/owl#',
      xsd:  XSD,
      [prefixAlias]: uriBase,
    }

    const writer = new N3.Writer({ format: 'Turtle', prefixes })
    const df = N3.DataFactory
    const nn = (uri: string) => df.namedNode(uri)
    const lit = (value: string) => df.literal(value)

    for (const node of nodes) {
      const classData = node.data as ClassData
      const s = nn(classData.uri)
      writer.addQuad(s, nn(RDF_TYPE), nn(OWL_CLASS))
      writer.addQuad(s, nn(RDFS_LABEL), lit(classData.label))

      for (const prop of classData.properties) {
        const xsdFull = prop.range.startsWith('xsd:')
          ? XSD + prop.range.slice(4)
          : prop.range
        const p = nn(prop.uri)
        writer.addQuad(p, nn(RDF_TYPE), nn(OWL_DATATYPE_PROPERTY))
        writer.addQuad(p, nn(RDFS_LABEL), lit(prop.label))
        writer.addQuad(p, nn(RDFS_DOMAIN), s)
        writer.addQuad(p, nn(RDFS_RANGE), nn(xsdFull))
      }
    }

    // ObjectProperty edges
    const nodeById = new Map(nodes.map((n) => [n.id, n]))
    for (const edge of edges) {
      if (edge.type !== 'objectPropertyEdge') continue
      const edgeData = edge.data as ObjectPropertyEdgeData | undefined
      if (!edgeData) continue

      const sourceNode = nodeById.get(edge.source)
      const targetNode = nodeById.get(edge.target)
      if (!sourceNode || !targetNode) continue

      const sourceData = sourceNode.data as ClassData
      const targetData = targetNode.data as ClassData

      const p = nn(edgeData.uri)
      writer.addQuad(p, nn(RDF_TYPE), nn(OWL_OBJECT_PROPERTY))
      writer.addQuad(p, nn(RDFS_LABEL), lit(edgeData.label))
      writer.addQuad(p, nn(RDFS_DOMAIN), nn(sourceData.uri))
      writer.addQuad(p, nn(RDFS_RANGE), nn(targetData.uri))
    }

    let result = ''
    let serializeError: Error | null = null

    writer.end((err, output) => {
      if (err) {
        serializeError = err
        return
      }
      result = output
    })

    if (serializeError !== null) {
      warnings.push('Failed to serialize schema to Turtle')
      return ''
    }

    return result
  } catch {
    warnings.push('Failed to serialize schema to Turtle')
    return ''
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function jsonToSchema(json: string, sourceName: string): SchemaResult {
  const empty: SchemaResult = { nodes: [], edges: [], turtle: '', warnings: [] }

  // Step 1: Parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ...empty, warnings: ['Invalid JSON'] }
  }

  // Step 1b: Reject non-object/array roots
  if (parsed === null || typeof parsed !== 'object') {
    return { ...empty, warnings: ['Unexpected root type'] }
  }

  // Step 2: Derive URI prefix
  const prefixAlias = deriveUriPrefix(sourceName)
  // Use a URI base that ends with # for fragment-based IRIs
  const uriBase = `http://${prefixAlias}#`

  const ctx: WalkContext = {
    uriBase,
    visited: new WeakSet(),
    nodes: [],
    edges: [],
    warnings: [],
    classIndex: { value: 0 },
  }

  // Step 3: Walk the value
  if (Array.isArray(parsed)) {
    // Bare array root with no key — nothing to derive a class name from
    // Return empty (no key to derive class name)
    return empty
  }

  // Object root: walk its properties
  const rootObj = parsed as Record<string, unknown>
  const entries = Object.entries(rootObj)

  if (entries.length === 0) {
    return empty
  }

  for (const [key, value] of entries) {
    if (value === null || value === undefined) continue

    if (Array.isArray(value)) {
      // Array property: derive class name from key
      const className = toPascalCase(key)
      const first = (value as unknown[]).find((item) => item !== null && item !== undefined)

      if (first === undefined || first === null) {
        // Empty array — no class to create
        continue
      }

      if (typeof first === 'object' && !Array.isArray(first)) {
        ctx.visited.add(first as object)
        walkObject(first as Record<string, unknown>, className, ctx, `$.${key}[]`)
        ctx.visited.delete(first as object)
      } else {
        // Array of primitives at root level — create a simple class with that field
        // This is an edge case; treat as DatatypeProperty on a class named from key
        const classUri = `${ctx.uriBase}${className}`
        const classIndex = ctx.classIndex.value++
        const nodeId = crypto.randomUUID()
        ctx.nodes.push({
          id: nodeId,
          type: 'sourceNode',
          position: { x: COLUMN_X_SOURCE, y: classIndex * COLUMN_SPACING },
          data: {
            uri: classUri,
            label: className,
            prefix: ctx.uriBase,
            properties: [{ uri: `${ctx.uriBase}value`, label: 'value', range: xsdRangeShort(first), kind: 'datatype' }],
          },
        })
      }
    } else if (typeof value === 'object') {
      // Nested object at root
      const className = toPascalCase(key)
      ctx.visited.add(value as object)
      walkObject(value as Record<string, unknown>, className, ctx, `$.${key}`)
      ctx.visited.delete(value as object)
    } else {
      // Primitive at root — treat root object itself as the class
      // (handled below as a plain object walk)
    }
  }

  // Check if we had any primitive entries at root that suggest root itself is a class
  const hasPrimitiveRootProps = entries.some(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
  const hasNonPrimitiveProps = entries.some(([, v]) => v !== null && v !== undefined && typeof v === 'object')

  if (hasPrimitiveRootProps && !hasNonPrimitiveProps && ctx.nodes.length === 0) {
    // Root object is itself a class
    ctx.visited.add(rootObj)
    walkObject(rootObj, 'Root', ctx, '$')
    ctx.visited.delete(rootObj)
  }

  if (ctx.nodes.length === 0 && ctx.warnings.length === 0) {
    return empty
  }

  // Step 4: Serialize to Turtle
  const turtle = serializeToTurtle(ctx.nodes, ctx.edges, uriBase, prefixAlias, ctx.warnings)

  return {
    nodes: ctx.nodes,
    edges: ctx.edges,
    turtle,
    warnings: ctx.warnings,
  }
}
