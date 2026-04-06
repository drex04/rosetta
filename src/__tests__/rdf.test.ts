import { describe, it, expect } from 'vitest';
import {
  parseTurtle,
  canvasToTurtle,
  localName,
  ontologyNodeId,
  COLUMN_X_MASTER,
} from '@/lib/rdf';
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
