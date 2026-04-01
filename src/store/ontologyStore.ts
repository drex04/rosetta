import { create } from 'zustand'
import type { OntologyNode, OntologyEdge, PropertyData, ClassData } from '@/types/index'
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
  /**
   * Optional callback registered externally (e.g. App.tsx) to handle
   * mapping invalidation when nodes/properties are removed.
   * Called with the list of property URIs that were removed.
   */
  onInvalidateMappings: ((propertyUris: string[]) => void) | null
  setNodes: (nodes: OntologyNode[]) => void
  setEdges: (edges: OntologyEdge[]) => void
  setTurtleSource: (turtle: string) => void
  setParseError: (error: string | null) => void
  /** Register an external callback for mapping invalidation. */
  setInvalidateMappingsCallback: (cb: (propertyUris: string[]) => void) => void
  /** Parse turtle text, update turtleSource, nodes, and edges atomically. */
  loadTurtle: (text: string) => Promise<void>
  /** Reset all ontology state to empty. */
  reset: () => void

  // ─── Granular canvas mutations ─────────────────────────────────────────────
  /** Append a node to the canvas. */
  addNode: (node: OntologyNode) => void
  /**
   * Remove a node by id. Also removes all edges referencing it and fires
   * onInvalidateMappings with the URIs of all properties on that node.
   */
  removeNode: (nodeId: string) => void
  /** Add a property to a node's data.properties array. */
  addPropertyToNode: (nodeId: string, property: PropertyData) => void
  /**
   * Remove a property from a node by URI. Fires onInvalidateMappings with
   * the removed property URI.
   */
  removePropertyFromNode: (nodeId: string, propertyUri: string) => void
  /** Append an edge to the canvas. */
  addEdge: (edge: OntologyEdge) => void
  /** Remove an edge by id. */
  removeEdge: (edgeId: string) => void
  /** Update a node's label or URI. Safe no-op when nodeId does not exist. */
  updateNode: (nodeId: string, patch: Partial<Pick<ClassData, 'label' | 'uri'>>) => void
  /** Update a single property on a node by current URI.
   *  If patch.uri differs from propertyUri, fires onInvalidateMappings([propertyUri]).
   *  Safe no-op when nodeId or propertyUri does not exist. */
  updateProperty: (nodeId: string, propertyUri: string, patch: Partial<PropertyData>) => void
  /** Remove the edge with oldId and insert newEdge atomically. No-op if oldId not found. */
  replaceEdge: (oldId: string, newEdge: OntologyEdge) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useOntologyStore = create<OntologyState>((set, get) => ({
  nodes: [],
  edges: [],
  turtleSource: '',
  parseError: null,
  onInvalidateMappings: null,
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setTurtleSource: (turtleSource) => set({ turtleSource }),
  setParseError: (parseError) => set({ parseError }),
  setInvalidateMappingsCallback: (cb) => set({ onInvalidateMappings: cb }),
  loadTurtle: async (text: string) => {
    const { nodes, edges } = await parseTurtle(text)
    set({ turtleSource: text, nodes, edges })
  },
  reset: () => set({ nodes: [], edges: [], turtleSource: '', parseError: null }),

  // ─── Granular canvas mutations ───────────────────────────────────────────────

  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),

  removeNode: (nodeId) => {
    const { nodes, edges, onInvalidateMappings } = get()
    const target = nodes.find((n) => n.id === nodeId)
    if (!target) return
    const propertyUris = target.data.properties.map((p) => p.uri)
    set({
      nodes: nodes.filter((n) => n.id !== nodeId),
      edges: edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    })
    if (propertyUris.length > 0) {
      onInvalidateMappings?.(propertyUris)
    }
  },

  addPropertyToNode: (nodeId, property) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, properties: [...n.data.properties, property] } }
          : n,
      ),
    })),

  removePropertyFromNode: (nodeId, propertyUri) => {
    const { onInvalidateMappings } = get()
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                properties: n.data.properties.filter((p) => p.uri !== propertyUri),
              },
            }
          : n,
      ),
    }))
    onInvalidateMappings?.([propertyUri])
  },

  addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge] })),

  removeEdge: (edgeId) => set((s) => ({ edges: s.edges.filter((e) => e.id !== edgeId) })),

  updateNode: (nodeId, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n,
      ),
    })),

  replaceEdge: (oldId, newEdge) =>
    set((s) => {
      if (!s.edges.some((e) => e.id === oldId)) return s
      return { edges: [...s.edges.filter((e) => e.id !== oldId), newEdge] }
    }),

  updateProperty: (nodeId, propertyUri, patch) => {
    const { onInvalidateMappings } = get()
    const node = get().nodes.find((n) => n.id === nodeId)
    if (!node) return
    const prop = node.data.properties.find((p) => p.uri === propertyUri)
    if (!prop) return
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                properties: n.data.properties.map((p) =>
                  p.uri === propertyUri ? { ...p, ...patch } : p,
                ),
              },
            }
          : n,
      ),
    }))
    if (patch.uri !== undefined && patch.uri !== propertyUri) {
      onInvalidateMappings?.([propertyUri])
    }
  },
}))
