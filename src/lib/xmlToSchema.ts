import * as N3 from 'n3'
import { MarkerType } from '@xyflow/react'
import type { ClassData, PropertyData, ObjectPropertyEdgeData, SourceNode, OntologyEdge } from '@/types/index'
import { COLUMN_X_SOURCE, COLUMN_SPACING } from '@/lib/rdf'
import { applyTreeLayout } from '@/lib/layout'
import type { SchemaResult } from '@/lib/jsonToSchema'

export type { SchemaResult }

// ─── Constants ────────────────────────────────────────────────────────────────

const RDF_TYPE              = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
const RDFS_LABEL            = 'http://www.w3.org/2000/01/rdf-schema#label'
const RDFS_DOMAIN           = 'http://www.w3.org/2000/01/rdf-schema#domain'
const RDFS_RANGE            = 'http://www.w3.org/2000/01/rdf-schema#range'
const OWL_CLASS             = 'http://www.w3.org/2002/07/owl#Class'
const OWL_DATATYPE_PROPERTY = 'http://www.w3.org/2002/07/owl#DatatypeProperty'
const OWL_OBJECT_PROPERTY   = 'http://www.w3.org/2002/07/owl#ObjectProperty'
const XSD                   = 'http://www.w3.org/2001/XMLSchema#'

const MAX_DEPTH = 10

// ─── URI helpers ──────────────────────────────────────────────────────────────

function deriveUriPrefix(sourceName: string): string {
  const sanitized = sourceName.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
  return `http://example.org/${sanitized}#`
}

function toPascalCase(name: string): string {
  if (name.length === 0) return name
  return name[0]!.toUpperCase() + name.slice(1)
}

// ─── XSD type inference ───────────────────────────────────────────────────────

function inferXsdType(text: string): string {
  const trimmed = text.trim()
  if (trimmed === 'true' || trimmed === 'false') return 'xsd:boolean'
  if (/^-?\d+$/.test(trimmed)) return 'xsd:integer'
  if (/^-?\d+\.\d+$/.test(trimmed)) return 'xsd:float'
  return 'xsd:string'
}

// ─── Walker context ───────────────────────────────────────────────────────────

interface WalkContext {
  uriBase: string
  nodes: SourceNode[]
  edges: OntologyEdge[]
  warnings: string[]
  classIndex: { value: number }
  /** Track tag names we've already created classes for (to handle repeated siblings) */
  visitedTags: Set<string>
}

/**
 * Determine if an element has child elements (not just text nodes).
 */
function hasChildElements(el: Element): boolean {
  for (let i = 0; i < el.childNodes.length; i++) {
    if (el.childNodes[i]!.nodeType === 1 /* ELEMENT_NODE */) return true
  }
  return false
}

/**
 * Walk an XML Element and emit a Class node + properties.
 * Returns the node id of the created class (so parent can link via ObjectProperty).
 */
function walkElement(
  el: Element,
  ctx: WalkContext,
  depth: number,
): string {
  const className = toPascalCase(el.localName)
  const classUri = `${ctx.uriBase}${className}`
  const properties: PropertyData[] = []
  const objectProps: Array<{ propName: string; rangeNodeId: string }> = []

  // XML attributes → DatatypeProperty with @attr label
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i]!
    properties.push({
      uri: `${ctx.uriBase}attr_${attr.localName}`,
      label: `@${attr.localName}`,
      range: inferXsdType(attr.value),
      kind: 'datatype',
    })
  }

  if (depth < MAX_DEPTH) {
    // Track which child tag names we've already processed (repeated siblings)
    const seenChildTags = new Set<string>()

    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes[i]!
      if (child.nodeType !== 1 /* ELEMENT_NODE */) continue

      const childEl = child as Element
      const childTag = childEl.localName

      if (seenChildTags.has(childTag)) continue // skip repeated siblings
      seenChildTags.add(childTag)

      if (hasChildElements(childEl)) {
        // Nested element with children → ObjectProperty to a child class
        const childNodeId = walkElement(childEl, ctx, depth + 1)
        objectProps.push({ propName: childTag, rangeNodeId: childNodeId })
      } else {
        // Leaf element → DatatypeProperty on this class
        const text = childEl.textContent ?? ''
        properties.push({
          uri: `${ctx.uriBase}${childTag}`,
          label: childTag,
          range: inferXsdType(text),
          kind: 'datatype',
        })
      }
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

  // Emit ObjectProperty edges
  for (const { propName, rangeNodeId } of objectProps) {
    const propUri = `${ctx.uriBase}${propName}`
    const edgeId = crypto.randomUUID()

    const edgeData: ObjectPropertyEdgeData & Record<string, unknown> = {
      uri: propUri,
      label: propName,
      predicate: 'owl:ObjectProperty',
    }

    const edge: OntologyEdge = {
      id: edgeId,
      type: 'objectPropertyEdge',
      source: nodeId,
      target: rangeNodeId,
      sourceHandle: 'class-bottom',
      targetHandle: 'class-left',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: edgeData,
    }
    ctx.edges.push(edge)
  }

  return nodeId
}

// ─── Turtle serialization ─────────────────────────────────────────────────────

function serializeToTurtle(
  nodes: SourceNode[],
  edges: OntologyEdge[],
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

export function xmlToSchema(xmlString: string, sourceName: string): SchemaResult {
  const empty: SchemaResult = { nodes: [], edges: [], turtle: '', warnings: [] }

  // Guard: empty string
  if (!xmlString.trim()) {
    return { ...empty, warnings: ['Invalid XML: empty input'] }
  }

  // Parse XML
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'application/xml')

  // Check for parse errors
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    const msg = parseError.textContent ?? 'unknown error'
    return { ...empty, warnings: [`Invalid XML: ${msg.trim()}`] }
  }

  const root = doc.documentElement
  if (!root) {
    return { ...empty, warnings: ['Invalid XML: no root element'] }
  }

  const uriBase = deriveUriPrefix(sourceName)
  // Derive a short alias for Turtle prefix (strip http://example.org/ and #)
  const prefixAlias = sourceName.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()

  const ctx: WalkContext = {
    uriBase,
    nodes: [],
    edges: [],
    warnings: [],
    classIndex: { value: 0 },
    visitedTags: new Set(),
  }

  walkElement(root, ctx, 0)

  if (ctx.nodes.length === 0) {
    return { ...empty, warnings: ctx.warnings }
  }

  // Apply tree layout
  const treePositions = applyTreeLayout(ctx.nodes, ctx.edges, COLUMN_X_SOURCE)
  ctx.nodes = ctx.nodes.map((n) => ({
    ...n,
    position: treePositions.get(n.id) ?? n.position,
  }))

  const turtle = serializeToTurtle(ctx.nodes, ctx.edges, uriBase, prefixAlias, ctx.warnings)

  return {
    nodes: ctx.nodes,
    edges: ctx.edges,
    turtle,
    warnings: ctx.warnings,
  }
}
