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
  parseError: string | null
  setNodes: (nodes: OntologyNode[]) => void
  setEdges: (edges: OntologyEdge[]) => void
  setTurtleSource: (turtle: string) => void
  setParseError: (error: string | null) => void
  /** Parse turtle text, update turtleSource, nodes, and edges atomically. */
  loadTurtle: (text: string) => Promise<void>
  /** Reset all ontology state to empty. */
  reset: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useOntologyStore = create<OntologyState>((set) => ({
  nodes: [],
  edges: [],
  turtleSource: '',
  parseError: null,
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setTurtleSource: (turtleSource) => set({ turtleSource }),
  setParseError: (parseError) => set({ parseError }),
  loadTurtle: async (text: string) => {
    const { nodes, edges } = await parseTurtle(text)
    set({ turtleSource: text, nodes, edges })
  },
  reset: () => set({ nodes: [], edges: [], turtleSource: '', parseError: null }),
}))
