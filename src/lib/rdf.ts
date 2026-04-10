import * as N3 from 'n3';
import { MarkerType } from '@xyflow/react';
import type {
  OntologyNode,
  OntologyEdge,
  SourceNodeData,
  ClassData,
  PropertyData,
} from '@/types/index';
import { applyTreeLayout } from '@/lib/layout';

// ─── Layout Constants ─────────────────────────────────────────────────────────

export const COLUMN_X_MASTER = 0;
export const COLUMN_X_SOURCE = -520;
export const COLUMN_SPACING = 180;

// ─── Constants ────────────────────────────────────────────────────────────────

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label';
const RDFS_COMMENT = 'http://www.w3.org/2000/01/rdf-schema#comment';
const RDFS_DOMAIN = 'http://www.w3.org/2000/01/rdf-schema#domain';
const RDFS_RANGE = 'http://www.w3.org/2000/01/rdf-schema#range';
const RDFS_SUBCLASS_OF = 'http://www.w3.org/2000/01/rdf-schema#subClassOf';
const OWL_CLASS = 'http://www.w3.org/2002/07/owl#Class';
const OWL_DATATYPE_PROPERTY = 'http://www.w3.org/2002/07/owl#DatatypeProperty';
const OWL_OBJECT_PROPERTY = 'http://www.w3.org/2002/07/owl#ObjectProperty';
const OWL_RESTRICTION = 'http://www.w3.org/2002/07/owl#Restriction';
const OWL_ON_PROPERTY = 'http://www.w3.org/2002/07/owl#onProperty';
const OWL_ON_CLASS = 'http://www.w3.org/2002/07/owl#onClass';
const OWL_ON_DATA_RANGE = 'http://www.w3.org/2002/07/owl#onDataRange';

// ─── localName ────────────────────────────────────────────────────────────────

/**
 * Extracts the local name from a URI — the fragment after `#`,
 * or the last path segment after `/`. Falls back to the full URI
 * if neither delimiter is found after a meaningful character.
 */
export function localName(uri: string): string {
  const hashIdx = uri.lastIndexOf('#');
  if (hashIdx !== -1) {
    const after = uri.slice(hashIdx + 1);
    if (after.length > 0) return after;
  }
  const slashIdx = uri.lastIndexOf('/');
  if (slashIdx !== -1) {
    const after = uri.slice(slashIdx + 1);
    if (after.length > 0) return after;
  }
  return uri;
}

// ─── Helper: prefix from URI ──────────────────────────────────────────────────

export function prefixFromUri(uri: string): string {
  const hashIdx = uri.lastIndexOf('#');
  if (hashIdx !== -1) return uri.slice(0, hashIdx + 1);
  const slashIdx = uri.lastIndexOf('/');
  if (slashIdx !== -1) return uri.slice(0, slashIdx + 1);
  return uri;
}

// ─── Canvas node ID ───────────────────────────────────────────────────────────

/**
 * Derives a stable, collision-free canvas node ID from a full URI.
 * Uses encodeURIComponent so two classes with the same local name but different
 * namespaces (e.g. ex1:Track and ex2:Track) never collide.
 */
export function ontologyNodeId(uri: string): string {
  return `node_${encodeURIComponent(uri)}`;
}

// ─── Node display helpers ─────────────────────────────────────────────────────

const STANDARD_NAMESPACES: ReadonlyArray<readonly [string, string]> = [
  ['http://www.w3.org/2001/XMLSchema#', 'xsd'],
  ['http://www.w3.org/2002/07/owl#', 'owl'],
  ['http://www.w3.org/2000/01/rdf-schema#', 'rdfs'],
  ['http://www.w3.org/1999/02/22-rdf-syntax-ns#', 'rdf'],
];

/** Derives a short "prefix:LocalName" form from a full URI and its namespace prefix. */
export function shortenUri(uri: string, prefix: string): string {
  if (prefix.length > 0 && uri.startsWith(prefix)) {
    const local = uri.slice(prefix.length);
    if (local.length > 0) {
      const withoutTrailing = prefix.replace(/[#/]$/, '');
      const alias = localName(withoutTrailing);
      return `${alias}:${local}`;
    }
  }
  return uri;
}

/** Best-effort shorten for a range URI that may use standard namespaces. */
export function shortenRange(range: string): string {
  for (const [ns, alias] of STANDARD_NAMESPACES) {
    if (range.startsWith(ns)) {
      return `${alias}:${range.slice(ns.length)}`;
    }
  }
  return localName(range);
}

/** Expand a prefixed datatype (e.g. "xsd:string") to its full URI. */
export function expandDataType(dataType: string): string {
  const colon = dataType.indexOf(':');
  if (colon === -1) return dataType;
  const alias = dataType.slice(0, colon);
  const local = dataType.slice(colon + 1);
  for (const [ns, a] of STANDARD_NAMESPACES) {
    if (a === alias) return `${ns}${local}`;
  }
  return dataType;
}

// ─── Store query helpers ──────────────────────────────────────────────────────

function firstLiteral(
  store: N3.Store,
  subject: N3.Term,
  predicate: string,
  nn: (uri: string) => N3.Term,
): string | undefined {
  const matches = store.match(subject, nn(predicate), null, null);
  const q = matches[Symbol.iterator]().next().value;
  return q?.object.termType === 'Literal' ? q.object.value : undefined;
}

function firstNamedNode(
  store: N3.Store,
  subject: N3.Term,
  predicate: string,
  nn: (uri: string) => N3.Term,
): string | undefined {
  const matches = store.match(subject, nn(predicate), null, null);
  const q = matches[Symbol.iterator]().next().value;
  return q?.object.termType === 'NamedNode' ? q.object.value : undefined;
}

// ─── parseTurtle ─────────────────────────────────────────────────────────────

export async function parseTurtle(
  text: string,
): Promise<{ nodes: OntologyNode[]; edges: OntologyEdge[] }> {
  if (text.trim() === '') {
    return { nodes: [], edges: [] };
  }

  const store = new N3.Store();

  await new Promise<void>((resolve, reject) => {
    const parser = new N3.Parser({ format: 'Turtle' });
    parser.parse(text, (error, quad) => {
      if (error) {
        reject(error);
        return;
      }
      if (quad) {
        store.addQuad(quad);
      } else {
        resolve();
      }
    });
  });

  const classMap = new Map<string, ClassData>();

  const nn = (uri: string) =>
    N3.DataFactory.namedNode(uri) as unknown as N3.Term;

  for (const quad of store.match(null, nn(RDF_TYPE), nn(OWL_CLASS), null)) {
    const subject = quad.subject;
    if (subject.termType !== 'NamedNode') continue;
    const uri = subject.value;

    const label =
      firstLiteral(store, subject as unknown as N3.Term, RDFS_LABEL, nn) ??
      localName(uri);
    const comment = firstLiteral(
      store,
      subject as unknown as N3.Term,
      RDFS_COMMENT,
      nn,
    );

    classMap.set(uri, {
      uri,
      label,
      prefix: prefixFromUri(uri),
      comment,
      properties: [],
    });
  }

  for (const quad of store.match(
    null,
    nn(RDF_TYPE),
    nn(OWL_DATATYPE_PROPERTY),
    null,
  )) {
    const subject = quad.subject;
    if (subject.termType !== 'NamedNode') continue;
    const propUri = subject.value;

    const domainUri = firstNamedNode(
      store,
      subject as unknown as N3.Term,
      RDFS_DOMAIN,
      nn,
    );
    if (!domainUri) continue;

    const classData = classMap.get(domainUri);
    if (!classData) continue;

    const range =
      firstNamedNode(store, subject as unknown as N3.Term, RDFS_RANGE, nn) ??
      'xsd:string';
    const label =
      firstLiteral(store, subject as unknown as N3.Term, RDFS_LABEL, nn) ??
      localName(propUri);

    const prop: PropertyData = {
      uri: propUri,
      label,
      range,
      kind: 'datatype',
    };
    classData.properties.push(prop);
  }

  // ── OWL restriction pass ────────────────────────────────────────────────────
  // Handles ontologies that associate properties with classes via
  // `rdfs:subClassOf [ a owl:Restriction ; owl:onProperty <p> ]`
  // rather than explicit `rdfs:domain` triples.

  const addedDatatypeKeys = new Set<string>(); // `${classUri}|${propUri}`
  for (const [classUri, classData] of classMap) {
    for (const prop of classData.properties) {
      addedDatatypeKeys.add(`${classUri}|${prop.uri}`);
    }
  }

  // Collect object-property tuples for edge creation below
  const restrictionObjectProps: Array<{
    domainUri: string;
    propUri: string;
    rangeUri: string;
  }> = [];

  for (const [classUri, classData] of classMap) {
    const classTerm = N3.DataFactory.namedNode(classUri) as unknown as N3.Term;
    for (const q of store.match(classTerm, nn(RDFS_SUBCLASS_OF), null, null)) {
      if (q.object.termType !== 'BlankNode') continue;
      const bn = q.object as unknown as N3.Term;

      // Must be typed owl:Restriction
      if (!store.countQuads(bn, nn(RDF_TYPE), nn(OWL_RESTRICTION), null))
        continue;

      // Must declare owl:onProperty pointing at a named node
      const onPropMatch = store.match(bn, nn(OWL_ON_PROPERTY), null, null);
      const onPropQ = onPropMatch[Symbol.iterator]().next().value;
      if (!onPropQ || onPropQ.object.termType !== 'NamedNode') continue;
      const propUri = onPropQ.object.value;
      const propTerm = N3.DataFactory.namedNode(propUri) as unknown as N3.Term;

      const isDT =
        store.countQuads(
          propTerm,
          nn(RDF_TYPE),
          nn(OWL_DATATYPE_PROPERTY),
          null,
        ) > 0;
      const isOP =
        store.countQuads(
          propTerm,
          nn(RDF_TYPE),
          nn(OWL_OBJECT_PROPERTY),
          null,
        ) > 0;

      if (isDT) {
        const key = `${classUri}|${propUri}`;
        if (addedDatatypeKeys.has(key)) continue;
        addedDatatypeKeys.add(key);
        const range =
          firstNamedNode(store, bn, OWL_ON_DATA_RANGE, nn) ??
          firstNamedNode(store, propTerm, RDFS_RANGE, nn) ??
          'xsd:string';
        const label =
          firstLiteral(store, propTerm, RDFS_LABEL, nn) ?? localName(propUri);
        classData.properties.push({
          uri: propUri,
          label,
          range,
          kind: 'datatype',
        });
      }

      if (isOP) {
        const rangeUri =
          firstNamedNode(store, bn, OWL_ON_CLASS, nn) ??
          firstNamedNode(store, propTerm, RDFS_RANGE, nn);
        if (rangeUri) {
          restrictionObjectProps.push({
            domainUri: classUri,
            propUri,
            rangeUri,
          });
        }
      }
    }
  }

  const nodes: OntologyNode[] = Array.from(classMap.entries()).map(
    ([uri, data]) => ({
      id: ontologyNodeId(uri),
      type: 'classNode' as const,
      position: { x: COLUMN_X_MASTER, y: 0 }, // overwritten by tree layout below
      data: data as ClassData & Record<string, unknown>,
    }),
  );

  const edges: OntologyEdge[] = [];

  for (const quad of store.match(
    null,
    nn(RDF_TYPE),
    nn(OWL_OBJECT_PROPERTY),
    null,
  )) {
    const subject = quad.subject;
    if (subject.termType !== 'NamedNode') continue;
    const propUri = subject.value;

    const domainUri = firstNamedNode(
      store,
      subject as unknown as N3.Term,
      RDFS_DOMAIN,
      nn,
    );
    if (!domainUri) continue;

    const rangeUri = firstNamedNode(
      store,
      subject as unknown as N3.Term,
      RDFS_RANGE,
      nn,
    );
    if (!rangeUri) continue;

    // Both domain and range must be known classes
    if (!classMap.has(domainUri) || !classMap.has(rangeUri)) continue;

    const sourceId = ontologyNodeId(domainUri);
    const targetId = ontologyNodeId(rangeUri);

    const label =
      firstLiteral(store, subject as unknown as N3.Term, RDFS_LABEL, nn) ??
      localName(propUri);

    edges.push({
      id: `e_${sourceId}_objectPropertyEdge_${targetId}`,
      type: 'objectPropertyEdge' as const,
      source: sourceId,
      target: targetId,
      sourceHandle: 'class-right',
      targetHandle: 'class-left',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: {
        uri: propUri,
        label,
        predicate: 'owl:ObjectProperty' as const,
      },
    });
  }

  // Object property edges inferred from OWL restrictions
  const existingEdgeIds = new Set(edges.map((e) => e.id));
  for (const { domainUri, propUri, rangeUri } of restrictionObjectProps) {
    if (!classMap.has(domainUri) || !classMap.has(rangeUri)) continue;
    const sourceId = ontologyNodeId(domainUri);
    const targetId = ontologyNodeId(rangeUri);
    const edgeId = `e_${sourceId}_objectPropertyEdge_${targetId}`;
    if (existingEdgeIds.has(edgeId)) continue;
    existingEdgeIds.add(edgeId);
    const propTerm = N3.DataFactory.namedNode(propUri) as unknown as N3.Term;
    const label =
      firstLiteral(store, propTerm, RDFS_LABEL, nn) ?? localName(propUri);
    edges.push({
      id: edgeId,
      type: 'objectPropertyEdge' as const,
      source: sourceId,
      target: targetId,
      sourceHandle: 'class-right',
      targetHandle: 'class-left',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { uri: propUri, label, predicate: 'owl:ObjectProperty' as const },
    });
  }

  for (const quad of store.match(null, nn(RDFS_SUBCLASS_OF), null, null)) {
    const subject = quad.subject;
    const object = quad.object;
    if (subject.termType !== 'NamedNode' || object.termType !== 'NamedNode')
      continue;

    const subUri = subject.value;
    const superUri = object.value;

    if (!classMap.has(subUri) || !classMap.has(superUri)) continue;

    const sourceId = ontologyNodeId(subUri);
    const targetId = ontologyNodeId(superUri);

    // Edge flows parent→child (directory-tree style): parent bottom → child left.
    // Note: sourceId=child, targetId=parent in RDF terms, so we swap for the edge.
    edges.push({
      id: `e_${sourceId}_subclassEdge_${targetId}`,
      type: 'subclassEdge' as const,
      source: targetId, // parent
      target: sourceId, // child
      sourceHandle: 'class-bottom',
      targetHandle: 'class-left',
      markerEnd: { type: MarkerType.ArrowClosed },
      data: {
        predicate: 'rdfs:subClassOf' as const,
      },
    });
  }

  // Apply directory-tree layout
  const treePositions = applyTreeLayout(nodes, edges, COLUMN_X_MASTER);
  const positionedNodes = nodes.map((n) => ({
    ...n,
    position: treePositions.get(n.id) ?? n.position,
  }));

  return { nodes: positionedNodes, edges };
}

// ─── canvasToTurtle ───────────────────────────────────────────────────────────

export async function canvasToTurtle(
  nodes: OntologyNode[],
  edges: OntologyEdge[],
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const prefixMap = new Map<string, string>();
    prefixMap.set('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#');
    prefixMap.set('rdfs', 'http://www.w3.org/2000/01/rdf-schema#');
    prefixMap.set('owl', 'http://www.w3.org/2002/07/owl#');
    prefixMap.set('xsd', 'http://www.w3.org/2001/XMLSchema#');

    const nsPrefixMap = new Map<string, string>(); // namespace → prefix alias
    let nsPrefixCounter = 0;

    function getOrAssignPrefix(uri: string): string {
      const ns = prefixFromUri(uri);
      // Check if it's already one of the standard ones
      for (const [alias, iri] of prefixMap) {
        if (iri === ns) return alias;
      }
      const existing = nsPrefixMap.get(ns);
      if (existing !== undefined) return existing;
      const alias = `ns${nsPrefixCounter++}`;
      nsPrefixMap.set(ns, alias);
      prefixMap.set(alias, ns);
      return alias;
    }

    for (const node of nodes) {
      getOrAssignPrefix(node.data.uri);
      for (const prop of node.data.properties) {
        getOrAssignPrefix(prop.uri);
      }
    }
    for (const edge of edges) {
      if (edge.type === 'objectPropertyEdge') {
        getOrAssignPrefix(edge.data!.uri);
      }
    }

    const prefixesObj: Record<string, string> = {};
    for (const [alias, iri] of prefixMap) {
      prefixesObj[alias] = iri;
    }

    const writer = new N3.Writer({ format: 'Turtle', prefixes: prefixesObj });

    const df = N3.DataFactory;
    const nn = (uri: string) => df.namedNode(uri);
    const lit = (value: string) => df.literal(value);

    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    for (const node of nodes) {
      const classUri = node.data.uri;
      const s = nn(classUri);
      writer.addQuad(s, nn(RDF_TYPE), nn(OWL_CLASS));
      writer.addQuad(s, nn(RDFS_LABEL), lit(node.data.label));
      if (node.data.comment !== undefined) {
        writer.addQuad(s, nn(RDFS_COMMENT), lit(node.data.comment));
      }
      for (const prop of node.data.properties) {
        const p = nn(prop.uri);
        writer.addQuad(p, nn(RDF_TYPE), nn(OWL_DATATYPE_PROPERTY));
        writer.addQuad(p, nn(RDFS_LABEL), lit(prop.label));
        writer.addQuad(p, nn(RDFS_DOMAIN), s);
        writer.addQuad(p, nn(RDFS_RANGE), nn(prop.range));
      }
    }

    for (const edge of edges) {
      if (edge.type === 'subclassEdge') {
        const srcNode = nodeById.get(edge.source); // parent
        const tgtNode = nodeById.get(edge.target); // child
        if (srcNode && tgtNode) {
          // Edge is parent→child, but RDF reads child rdfs:subClassOf parent
          writer.addQuad(
            nn(tgtNode.data.uri),
            nn(RDFS_SUBCLASS_OF),
            nn(srcNode.data.uri),
          );
        }
      } else if (edge.type === 'objectPropertyEdge') {
        const srcNode = nodeById.get(edge.source);
        const tgtNode = nodeById.get(edge.target);
        if (srcNode && tgtNode) {
          const p = nn(edge.data!.uri);
          writer.addQuad(p, nn(RDF_TYPE), nn(OWL_OBJECT_PROPERTY));
          writer.addQuad(p, nn(RDFS_LABEL), lit(edge.data!.label));
          writer.addQuad(p, nn(RDFS_DOMAIN), nn(srcNode.data.uri));
          writer.addQuad(p, nn(RDFS_RANGE), nn(tgtNode.data.uri));
        }
      }
    }

    writer.end((error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(result);
    });
  });
}

// ─── convertToSourceNodes ─────────────────────────────────────────────────────
//
// Takes OntologyNode[] produced by parseTurtle (type='classNode') and converts
// them to SourceNodeData[] (type='sourceNode') for amber rendering.
// Overlays positions from existingSourceNodes by matching node ID or class URI,
// so dragged nodes keep their location.

export function convertToSourceNodes(
  ontologyNodes: OntologyNode[],
  existingSourceNodes: SourceNodeData[],
): SourceNodeData[] {
  const posById = new Map(existingSourceNodes.map((n) => [n.id, n.position]));
  const posByUri = new Map(
    existingSourceNodes.map((n) => [n.data.uri, n.position]),
  );

  return ontologyNodes.map((n, index): SourceNodeData => {
    const posByIndex = existingSourceNodes[index]?.position;

    const position =
      posById.get(n.id) ?? posByUri.get(n.data.uri) ?? posByIndex ?? n.position;

    return {
      ...n,
      type: 'sourceNode' as const,
      position,
    };
  });
}
