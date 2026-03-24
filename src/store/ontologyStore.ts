import { create } from 'zustand'
import type { OntologyNode, OntologyEdge } from '@/types/index'
import { parseTurtle } from '@/lib/rdf'

// ─── Seed ontology ────────────────────────────────────────────────────────────

export const SEED_TURTLE = `\
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix nato: <http://nato.int/onto#> .

nato:Track a owl:Class ;
  rdfs:label "Track" .

nato:AirTrack a owl:Class ;
  rdfs:label "Air Track" ;
  rdfs:subClassOf nato:Track .

nato:speed a owl:DatatypeProperty ;
  rdfs:domain nato:AirTrack ;
  rdfs:range xsd:float .
`

// ─── Store interface ──────────────────────────────────────────────────────────

interface OntologyState {
  nodes: OntologyNode[]
  edges: OntologyEdge[]
  turtleSource: string
  setNodes: (nodes: OntologyNode[]) => void
  setEdges: (edges: OntologyEdge[]) => void
  setTurtleSource: (turtle: string) => void
  /** Parse turtle text, update turtleSource, nodes, and edges atomically. */
  loadTurtle: (text: string) => Promise<void>
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useOntologyStore = create<OntologyState>((set) => ({
  nodes: [],
  edges: [],
  turtleSource: '',
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setTurtleSource: (turtleSource) => set({ turtleSource }),
  loadTurtle: async (text: string) => {
    const { nodes, edges } = await parseTurtle(text)
    // Apply a simple horizontal layout so nodes don't all overlap at (0,0)
    const laidOut = nodes.map((node, i) => ({
      ...node,
      position: { x: 80 + i * 260, y: 80 },
    }))
    set({ turtleSource: text, nodes: laidOut, edges })
  },
}))
