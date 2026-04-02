import { MarkerType } from '@xyflow/react';
import type {
  PropertyData,
  ObjectPropertyEdgeData,
  SourceNodeData,
  OntologyEdge,
} from '@/types/index';
import { COLUMN_X_SOURCE, COLUMN_SPACING } from '@/lib/rdf';
import { applyTreeLayout } from '@/lib/layout';
import type { SchemaResult } from '@/lib/jsonToSchema';
import { serializeToTurtle } from '@/lib/rdfSerialize';

export type { SchemaResult };

const MAX_DEPTH = 10;

// ─── URI helpers ──────────────────────────────────────────────────────────────

function deriveUriPrefix(sourceName: string): string {
  const sanitized = sourceName.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  return `http://example.org/${sanitized}#`;
}

function toPascalCase(name: string): string {
  if (name.length === 0) return name;
  return name[0]!.toUpperCase() + name.slice(1);
}

// ─── XSD type inference ───────────────────────────────────────────────────────

function inferXsdType(text: string): string {
  const trimmed = text.trim();
  if (trimmed === 'true' || trimmed === 'false') return 'xsd:boolean';
  if (/^-?\d+$/.test(trimmed)) return 'xsd:integer';
  if (/^-?\d+\.\d+$/.test(trimmed)) return 'xsd:float';
  return 'xsd:string';
}

// ─── Walker context ───────────────────────────────────────────────────────────

interface WalkContext {
  uriBase: string;
  nodes: SourceNodeData[];
  edges: OntologyEdge[];
  warnings: string[];
  classIndex: { value: number };
  /** Track tag names we've already created classes for (to handle repeated siblings) */
  visitedTags: Set<string>;
}

/**
 * Determine if an element has child elements (not just text nodes).
 */
function hasChildElements(el: Element): boolean {
  for (let i = 0; i < el.childNodes.length; i++) {
    if (el.childNodes[i]!.nodeType === 1 /* ELEMENT_NODE */) return true;
  }
  return false;
}

/**
 * Walk an XML Element and emit a Class node + properties.
 * Returns the node id of the created class (so parent can link via ObjectProperty).
 */
function walkElement(el: Element, ctx: WalkContext, depth: number): string {
  const className = toPascalCase(el.localName);
  const classUri = `${ctx.uriBase}${className}`;
  const properties: PropertyData[] = [];
  const objectProps: Array<{ propName: string; rangeNodeId: string }> = [];

  // XML attributes → DatatypeProperty with @attr label
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i]!;
    properties.push({
      uri: `${ctx.uriBase}attr_${attr.localName}`,
      label: `@${attr.localName}`,
      range: inferXsdType(attr.value),
      kind: 'datatype',
    });
  }

  if (depth < MAX_DEPTH) {
    // Track which child tag names we've already processed (repeated siblings)
    const seenChildTags = new Set<string>();

    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes[i]!;
      if (child.nodeType !== 1 /* ELEMENT_NODE */) continue;

      const childEl = child as Element;
      const childTag = childEl.localName;

      if (seenChildTags.has(childTag)) continue; // skip repeated siblings
      seenChildTags.add(childTag);

      if (hasChildElements(childEl)) {
        // Nested element with children → ObjectProperty to a child class
        const childNodeId = walkElement(childEl, ctx, depth + 1);
        objectProps.push({ propName: childTag, rangeNodeId: childNodeId });
      } else {
        // Leaf element → DatatypeProperty on this class
        const text = childEl.textContent ?? '';
        properties.push({
          uri: `${ctx.uriBase}${childTag}`,
          label: childTag,
          range: inferXsdType(text),
          kind: 'datatype',
        });
      }
    }
  }

  const nodeId = crypto.randomUUID();
  const classIndex = ctx.classIndex.value++;

  const node: SourceNodeData = {
    id: nodeId,
    type: 'sourceNode',
    position: { x: COLUMN_X_SOURCE, y: classIndex * COLUMN_SPACING },
    data: {
      uri: classUri,
      label: className,
      prefix: ctx.uriBase,
      properties,
    },
  };
  ctx.nodes.push(node);

  // Emit ObjectProperty edges
  for (const { propName, rangeNodeId } of objectProps) {
    const propUri = `${ctx.uriBase}${propName}`;
    const edgeId = crypto.randomUUID();

    const edgeData: ObjectPropertyEdgeData & Record<string, unknown> = {
      uri: propUri,
      label: propName,
      predicate: 'owl:ObjectProperty',
    };

    const edge: OntologyEdge = {
      id: edgeId,
      type: 'objectPropertyEdge',
      source: nodeId,
      target: rangeNodeId,
      sourceHandle: 'class-bottom',
      targetHandle: 'class-left',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: edgeData,
    };
    ctx.edges.push(edge);
  }

  return nodeId;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function xmlToSchema(
  xmlString: string,
  sourceName: string,
): SchemaResult {
  const empty: SchemaResult = {
    nodes: [],
    edges: [],
    turtle: '',
    warnings: [],
  };

  // Guard: empty string
  if (!xmlString.trim()) {
    return { ...empty, warnings: ['Invalid XML: empty input'] };
  }

  // Parse XML
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');

  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    const msg = parseError.textContent ?? 'unknown error';
    return { ...empty, warnings: [`Invalid XML: ${msg.trim()}`] };
  }

  const root = doc.documentElement;
  if (!root) {
    return { ...empty, warnings: ['Invalid XML: no root element'] };
  }

  const uriBase = deriveUriPrefix(sourceName);
  // Derive a short alias for Turtle prefix (strip http://example.org/ and #)
  const prefixAlias = sourceName.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();

  const ctx: WalkContext = {
    uriBase,
    nodes: [],
    edges: [],
    warnings: [],
    classIndex: { value: 0 },
    visitedTags: new Set(),
  };

  walkElement(root, ctx, 0);

  if (ctx.nodes.length === 0) {
    return { ...empty, warnings: ctx.warnings };
  }

  // Apply tree layout
  const treePositions = applyTreeLayout(ctx.nodes, ctx.edges, COLUMN_X_SOURCE);
  ctx.nodes = ctx.nodes.map((n) => ({
    ...n,
    position: treePositions.get(n.id) ?? n.position,
  }));

  const turtle = serializeToTurtle(
    ctx.nodes,
    ctx.edges,
    uriBase,
    prefixAlias,
    ctx.warnings,
  );

  return {
    nodes: ctx.nodes,
    edges: ctx.edges,
    turtle,
    warnings: ctx.warnings,
  };
}
