import { describe, it, expect } from 'vitest';
import {
  parseTurtle,
  canvasToTurtle,
  localName,
  ontologyNodeId,
  shortenUri,
  shortenRange,
  prefixFromUri,
  convertToSourceNodes,
  COLUMN_X_MASTER,
} from '@/lib/rdf';
import type { SourceNodeData } from '@/types/index';
import { TREE_BASE_Y, TREE_INDENT_X } from '@/lib/layout';

// ─── localName ────────────────────────────────────────────────────────────────

describe('localName', () => {
  it('extracts local name after #', () => {
    expect(localName('http://example.com/onto#Aircraft')).toBe('Aircraft');
  });

  it('extracts local name after last /', () => {
    expect(localName('http://example.com/onto/Aircraft')).toBe('Aircraft');
  });

  it('falls back to full URI when no # or / segment exists', () => {
    expect(localName('urn:aircraft')).toBe('urn:aircraft');
  });

  it('handles fragment-only URIs', () => {
    expect(localName('#Aircraft')).toBe('Aircraft');
  });
});

// ─── parseTurtle edge cases ────────────────────────────────────────────────────

describe('parseTurtle edge cases', () => {
  it('returns empty nodes and edges for empty string', async () => {
    const result = await parseTurtle('');
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('returns empty nodes array for valid Turtle with no owl:Class', async () => {
    const turtle = `
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix ex: <http://example.com/> .
ex:something ex:prop "value" .
`;
    const result = await parseTurtle(turtle);
    expect(result.nodes).toHaveLength(0);
  });

  it('rejects / throws on invalid Turtle syntax', async () => {
    await expect(parseTurtle('this is not valid turtle !!!')).rejects.toThrow();
  });
});

// ─── parseTurtle with real ontology data ───────────────────────────────────────

const SAMPLE_TURTLE = `
@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
@prefix ex:   <http://example.com/onto#> .

ex:Aircraft a owl:Class ;
  rdfs:label "Aircraft" ;
  rdfs:comment "A flying vehicle" .

ex:Weapon a owl:Class ;
  rdfs:label "Weapon" .

ex:speed a owl:DatatypeProperty ;
  rdfs:label "speed" ;
  rdfs:domain ex:Aircraft ;
  rdfs:range xsd:float .

ex:altitude a owl:DatatypeProperty ;
  rdfs:label "altitude" ;
  rdfs:domain ex:Aircraft ;
  rdfs:range xsd:integer .

ex:carries a owl:ObjectProperty ;
  rdfs:label "carries" ;
  rdfs:domain ex:Aircraft ;
  rdfs:range ex:Weapon .

ex:FighterJet a owl:Class ;
  rdfs:label "FighterJet" ;
  rdfs:subClassOf ex:Aircraft .
`;

const BASE = 'http://example.com/onto#';
const ID_AIRCRAFT = ontologyNodeId(`${BASE}Aircraft`);
const ID_WEAPON = ontologyNodeId(`${BASE}Weapon`);
const ID_FIGHTER = ontologyNodeId(`${BASE}FighterJet`);

describe('parseTurtle with sample ontology', () => {
  it('parses classes into nodes', async () => {
    const { nodes } = await parseTurtle(SAMPLE_TURTLE);
    expect(nodes).toHaveLength(3);
    const ids = nodes.map((n) => n.id);
    expect(ids).toContain(ID_AIRCRAFT);
    expect(ids).toContain(ID_WEAPON);
    expect(ids).toContain(ID_FIGHTER);
  });

  it('assigns tree layout positions (root at base x, children indented)', async () => {
    const { nodes } = await parseTurtle(SAMPLE_TURTLE);
    // Aircraft is the root (parent of FighterJet and Weapon), should be at base x
    const aircraft = nodes.find((n) => n.id === ID_AIRCRAFT)!;
    const weapon = nodes.find((n) => n.id === ID_WEAPON)!;
    const fighter = nodes.find((n) => n.id === ID_FIGHTER)!;
    expect(aircraft.position.x).toBe(COLUMN_X_MASTER);
    expect(aircraft.position.y).toBe(TREE_BASE_Y);
    // Children are indented one level
    expect(weapon.position.x).toBe(COLUMN_X_MASTER + TREE_INDENT_X);
    expect(fighter.position.x).toBe(COLUMN_X_MASTER + TREE_INDENT_X);
    // All y positions are distinct (height-aware layout ensures no overlap)
    const ys = [aircraft, weapon, fighter].map((n) => n.position.y);
    expect(new Set(ys).size).toBe(3);
  });

  it('embeds datatype properties in the correct class node', async () => {
    const { nodes } = await parseTurtle(SAMPLE_TURTLE);
    const aircraft = nodes.find((n) => n.id === ID_AIRCRAFT);
    expect(aircraft).toBeDefined();
    expect(aircraft!.data.properties).toHaveLength(2);
    const propLabels = aircraft!.data.properties.map((p) => p.label);
    expect(propLabels).toContain('speed');
    expect(propLabels).toContain('altitude');
    for (const p of aircraft!.data.properties) {
      expect(p.kind).toBe('datatype');
    }
  });

  it('creates objectPropertyEdge for owl:ObjectProperty', async () => {
    const { edges } = await parseTurtle(SAMPLE_TURTLE);
    const objEdges = edges.filter((e) => e.type === 'objectPropertyEdge');
    expect(objEdges).toHaveLength(1);
    const edge = objEdges[0]!;
    expect(edge.source).toBe(ID_AIRCRAFT);
    expect(edge.target).toBe(ID_WEAPON);
  });

  it('creates subclassEdge for rdfs:subClassOf (parent→child direction)', async () => {
    const { edges } = await parseTurtle(SAMPLE_TURTLE);
    const subEdges = edges.filter((e) => e.type === 'subclassEdge');
    expect(subEdges).toHaveLength(1);
    const edge = subEdges[0]!;
    // Edge flows parent→child (directory-tree style)
    expect(edge.source).toBe(ID_AIRCRAFT); // parent
    expect(edge.target).toBe(ID_FIGHTER); // child
    expect(edge.sourceHandle).toBe('class-bottom');
    expect(edge.targetHandle).toBe('class-left');
  });

  it('sets node type to classNode', async () => {
    const { nodes } = await parseTurtle(SAMPLE_TURTLE);
    for (const node of nodes) {
      expect(node.type).toBe('classNode');
    }
  });

  it('stores rdfs:comment in node data', async () => {
    const { nodes } = await parseTurtle(SAMPLE_TURTLE);
    const aircraft = nodes.find((n) => n.id === ID_AIRCRAFT);
    expect(aircraft!.data.comment).toBe('A flying vehicle');
  });
});

// ─── canvasToTurtle ───────────────────────────────────────────────────────────

describe('canvasToTurtle', () => {
  it('produces non-empty Turtle string from sample nodes', async () => {
    const { nodes, edges } = await parseTurtle(SAMPLE_TURTLE);
    const turtle = await canvasToTurtle(nodes, edges);
    expect(typeof turtle).toBe('string');
    expect(turtle.length).toBeGreaterThan(0);
  });

  it('emits owl:Class declarations', async () => {
    const { nodes, edges } = await parseTurtle(SAMPLE_TURTLE);
    const turtle = await canvasToTurtle(nodes, edges);
    expect(turtle).toContain('owl:Class');
  });

  it('emits rdfs:subClassOf for subclass edges', async () => {
    const { nodes, edges } = await parseTurtle(SAMPLE_TURTLE);
    const turtle = await canvasToTurtle(nodes, edges);
    expect(turtle).toContain('subClassOf');
  });
});

// ─── round-trip ───────────────────────────────────────────────────────────────

describe('parseTurtle round-trip', () => {
  it('preserves same number of nodes and edges after round-trip', async () => {
    const first = await parseTurtle(SAMPLE_TURTLE);
    const turtle2 = await canvasToTurtle(first.nodes, first.edges);
    const second = await parseTurtle(turtle2);
    expect(second.nodes).toHaveLength(first.nodes.length);
    expect(second.edges).toHaveLength(first.edges.length);
  });

  it('round-trip preserves class labels', async () => {
    const first = await parseTurtle(SAMPLE_TURTLE);
    const turtle2 = await canvasToTurtle(first.nodes, first.edges);
    const second = await parseTurtle(turtle2);
    const firstLabels = first.nodes.map((n) => n.data.label).sort();
    const secondLabels = second.nodes.map((n) => n.data.label).sort();
    expect(secondLabels).toEqual(firstLabels);
  });
});

// ─── objectPropertyEdge id format ─────────────────────────────────────────────

describe('edge ID format', () => {
  it('uses e_{src}_{type}_{tgt} format for object property edges', async () => {
    const { edges } = await parseTurtle(SAMPLE_TURTLE);
    const objEdge = edges.find((e) => e.type === 'objectPropertyEdge');
    expect(objEdge).toBeDefined();
    expect(objEdge!.id).toBe(
      `e_${ID_AIRCRAFT}_objectPropertyEdge_${ID_WEAPON}`,
    );
  });

  it('uses e_{src}_{type}_{tgt} format for subclass edges', async () => {
    const { edges } = await parseTurtle(SAMPLE_TURTLE);
    const subEdge = edges.find((e) => e.type === 'subclassEdge');
    expect(subEdge).toBeDefined();
    expect(subEdge!.id).toBe(`e_${ID_FIGHTER}_subclassEdge_${ID_AIRCRAFT}`);
  });

  it('no collision when two classes share the same local name', async () => {
    const turtle = `
@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .
@prefix ex1:  <http://example.com/ns1#> .
@prefix ex2:  <http://example.com/ns2#> .
ex1:Track a owl:Class .
ex2:Track a owl:Class .
`;
    const { nodes } = await parseTurtle(turtle);
    expect(nodes).toHaveLength(2);
    const ids = nodes.map((n) => n.id);
    expect(ids[0]).not.toBe(ids[1]);
    expect(ids).toContain(ontologyNodeId('http://example.com/ns1#Track'));
    expect(ids).toContain(ontologyNodeId('http://example.com/ns2#Track'));
  });
});

// ─── prefixFromUri ─────────────────────────────────────────────────────────────

describe('prefixFromUri', () => {
  it('returns everything up to and including # for hash URIs', () => {
    expect(prefixFromUri('http://example.com/onto#Aircraft')).toBe(
      'http://example.com/onto#',
    );
  });

  it('returns everything up to and including / for slash URIs', () => {
    expect(prefixFromUri('http://example.com/onto/Aircraft')).toBe(
      'http://example.com/onto/',
    );
  });

  it('returns full URI when no # or / is found', () => {
    expect(prefixFromUri('urn:aircraft')).toBe('urn:aircraft');
  });

  it('stops at the last # even when / follows it', () => {
    expect(prefixFromUri('http://example.com/onto#Class')).toBe(
      'http://example.com/onto#',
    );
  });
});

// ─── shortenUri ────────────────────────────────────────────────────────────────

describe('shortenUri', () => {
  it('shortens a URI that starts with the given prefix', () => {
    expect(
      shortenUri(
        'http://example.com/onto#Aircraft',
        'http://example.com/onto#',
      ),
    ).toBe('onto:Aircraft');
  });

  it('returns the full URI when it does not start with prefix', () => {
    expect(
      shortenUri('http://example.com/onto#Aircraft', 'http://other.com/'),
    ).toBe('http://example.com/onto#Aircraft');
  });

  it('returns full URI when prefix is empty string', () => {
    expect(shortenUri('http://example.com/onto#Aircraft', '')).toBe(
      'http://example.com/onto#Aircraft',
    );
  });

  it('returns full URI when local part is empty (URI equals prefix)', () => {
    expect(
      shortenUri('http://example.com/onto#', 'http://example.com/onto#'),
    ).toBe('http://example.com/onto#');
  });
});

// ─── shortenRange ──────────────────────────────────────────────────────────────

describe('shortenRange', () => {
  it('shortens xsd URIs', () => {
    expect(shortenRange('http://www.w3.org/2001/XMLSchema#string')).toBe(
      'xsd:string',
    );
    expect(shortenRange('http://www.w3.org/2001/XMLSchema#integer')).toBe(
      'xsd:integer',
    );
  });

  it('shortens owl URIs', () => {
    expect(shortenRange('http://www.w3.org/2002/07/owl#Thing')).toBe(
      'owl:Thing',
    );
  });

  it('shortens rdfs URIs', () => {
    expect(shortenRange('http://www.w3.org/2000/01/rdf-schema#label')).toBe(
      'rdfs:label',
    );
  });

  it('shortens rdf URIs', () => {
    expect(
      shortenRange('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
    ).toBe('rdf:type');
  });

  it('falls back to localName for unknown namespaces', () => {
    expect(shortenRange('http://example.com/unknown#Thing')).toBe('Thing');
  });
});

// ─── convertToSourceNodes ──────────────────────────────────────────────────────

describe('convertToSourceNodes', () => {
  it('converts classNode type to sourceNode', async () => {
    const { nodes } = await parseTurtle(SAMPLE_TURTLE);
    const result = convertToSourceNodes(nodes, []);
    expect(result.every((n) => n.type === 'sourceNode')).toBe(true);
  });

  it('preserves all node data except type', async () => {
    const { nodes } = await parseTurtle(SAMPLE_TURTLE);
    const result = convertToSourceNodes(nodes, []);
    expect(result).toHaveLength(nodes.length);
    for (const n of result) {
      const original = nodes.find((o) => o.id === n.id);
      expect(n.data).toEqual(original!.data);
    }
  });

  it('uses position from existingSourceNodes matched by id', async () => {
    const { nodes } = await parseTurtle(SAMPLE_TURTLE);
    const first = nodes[0]!;
    const existing: SourceNodeData[] = [
      { ...first, type: 'sourceNode' as const, position: { x: 999, y: 888 } },
    ];
    const result = convertToSourceNodes(nodes, existing);
    const matched = result.find((n) => n.id === first.id)!;
    expect(matched.position).toEqual({ x: 999, y: 888 });
  });

  it('uses position from existingSourceNodes matched by uri', async () => {
    const { nodes } = await parseTurtle(SAMPLE_TURTLE);
    const first = nodes[0]!;
    const existing: SourceNodeData[] = [
      {
        ...first,
        id: 'different-id',
        type: 'sourceNode' as const,
        position: { x: 777, y: 666 },
      },
    ];
    const result = convertToSourceNodes(nodes, existing);
    const matched = result.find((n) => n.id === first.id)!;
    expect(matched.position).toEqual({ x: 777, y: 666 });
  });

  it('falls back to original position when no match found', async () => {
    const { nodes } = await parseTurtle(SAMPLE_TURTLE);
    const result = convertToSourceNodes(nodes, []);
    for (let i = 0; i < nodes.length; i++) {
      expect(result[i]!.position).toEqual(nodes[i]!.position);
    }
  });
});

// ─── OWL restriction pass ─────────────────────────────────────────────────────

describe('parseTurtle — OWL restriction (isDT path)', () => {
  const RESTRICTION_TURTLE = `
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix ex: <http://example.org/> .

ex:Person a owl:Class .
ex:age a owl:DatatypeProperty .

ex:Person rdfs:subClassOf [
  a owl:Restriction ;
  owl:onProperty ex:age ;
  owl:onDataRange xsd:integer
] .
`;

  it('picks up datatype property via owl:Restriction (isDT path)', async () => {
    const { nodes } = await parseTurtle(RESTRICTION_TURTLE);
    const personNode = nodes.find(
      (n) => n.data.uri === 'http://example.org/Person',
    );
    expect(personNode).toBeDefined();
    const ageProp = personNode!.data.properties.find(
      (p) => p.uri === 'http://example.org/age',
    );
    expect(ageProp).toBeDefined();
    expect(ageProp!.kind).toBe('datatype');
  });

  it('does not add duplicate properties if rdfs:domain also exists', async () => {
    const turtle = `
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix ex: <http://example.org/> .

ex:Person a owl:Class .
ex:age a owl:DatatypeProperty ;
  rdfs:domain ex:Person ;
  rdfs:range xsd:integer .

ex:Person rdfs:subClassOf [
  a owl:Restriction ;
  owl:onProperty ex:age ;
  owl:onDataRange xsd:integer
] .
`;
    const { nodes } = await parseTurtle(turtle);
    const personNode = nodes.find(
      (n) => n.data.uri === 'http://example.org/Person',
    );
    const ageProps = personNode!.data.properties.filter(
      (p) => p.uri === 'http://example.org/age',
    );
    expect(ageProps).toHaveLength(1);
  });
});

describe('parseTurtle — OWL restriction (isOP path)', () => {
  const OP_RESTRICTION_TURTLE = `
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix ex: <http://example.org/> .

ex:Person a owl:Class .
ex:Company a owl:Class .
ex:worksFor a owl:ObjectProperty .

ex:Person rdfs:subClassOf [
  a owl:Restriction ;
  owl:onProperty ex:worksFor ;
  owl:onClass ex:Company
] .
`;

  it('creates objectPropertyEdge via owl:Restriction (isOP path)', async () => {
    const { edges } = await parseTurtle(OP_RESTRICTION_TURTLE);
    const opEdge = edges.find((e) => e.type === 'objectPropertyEdge');
    expect(opEdge).toBeDefined();
    expect(opEdge!.data!.uri).toBe('http://example.org/worksFor');
  });

  it('does not duplicate edge if explicit objectProperty already exists', async () => {
    const turtle = `
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix ex: <http://example.org/> .

ex:Person a owl:Class .
ex:Company a owl:Class .
ex:worksFor a owl:ObjectProperty ;
  rdfs:domain ex:Person ;
  rdfs:range ex:Company .

ex:Person rdfs:subClassOf [
  a owl:Restriction ;
  owl:onProperty ex:worksFor ;
  owl:onClass ex:Company
] .
`;
    const { edges } = await parseTurtle(turtle);
    const opEdges = edges.filter((e) => e.type === 'objectPropertyEdge');
    expect(opEdges).toHaveLength(1);
  });
});

// ─── canvasToTurtle — objectPropertyEdge and comment ─────────────────────────

describe('canvasToTurtle — objectPropertyEdge', () => {
  it('emits owl:ObjectProperty for objectPropertyEdge', async () => {
    const nodeA = {
      id: 'node_A',
      type: 'classNode' as const,
      position: { x: 0, y: 0 },
      data: {
        uri: 'http://ex.org/A',
        label: 'A',
        prefix: 'http://ex.org/',
        properties: [],
      },
    };
    const nodeB = {
      id: 'node_B',
      type: 'classNode' as const,
      position: { x: 0, y: 0 },
      data: {
        uri: 'http://ex.org/B',
        label: 'B',
        prefix: 'http://ex.org/',
        properties: [],
      },
    };
    const edge = {
      id: 'e_node_A_objectPropertyEdge_node_B',
      type: 'objectPropertyEdge' as const,
      source: 'node_A',
      target: 'node_B',
      sourceHandle: 'class-right',
      targetHandle: 'class-left',
      markerEnd: { type: 'arrowclosed' as any },
      data: {
        uri: 'http://ex.org/linksTo',
        label: 'linksTo',
        predicate: 'owl:ObjectProperty' as const,
      },
    };
    const turtle = await canvasToTurtle(
      [nodeA as any, nodeB as any],
      [edge as any],
    );
    expect(turtle).toContain('owl:ObjectProperty');
    expect(turtle).toContain('linksTo');
  });

  it('emits rdfs:comment when node has a comment', async () => {
    const node = {
      id: 'node_C',
      type: 'classNode' as const,
      position: { x: 0, y: 0 },
      data: {
        uri: 'http://ex.org/C',
        label: 'C',
        prefix: 'http://ex.org/',
        comment: 'A test class',
        properties: [],
      },
    };
    const turtle = await canvasToTurtle([node as any], []);
    expect(turtle).toContain('A test class');
  });

  it('handles node with datatype property', async () => {
    const node = {
      id: 'node_D',
      type: 'classNode' as const,
      position: { x: 0, y: 0 },
      data: {
        uri: 'http://ex.org/D',
        label: 'D',
        prefix: 'http://ex.org/',
        properties: [
          {
            uri: 'http://ex.org/name',
            label: 'name',
            range: 'http://www.w3.org/2001/XMLSchema#string',
            kind: 'datatype' as const,
          },
        ],
      },
    };
    const turtle = await canvasToTurtle([node as any], []);
    expect(turtle).toContain('owl:DatatypeProperty');
    expect(turtle).toContain('name');
  });
});
