import { create } from 'zustand'
import type { OntologyNode, OntologyEdge } from '@/types/index'

interface OntologyState {
  nodes: OntologyNode[]
  edges: OntologyEdge[]
  turtleSource: string
  setNodes: (nodes: OntologyNode[]) => void
  setEdges: (edges: OntologyEdge[]) => void
  setTurtleSource: (turtle: string) => void
}

export const useOntologyStore = create<OntologyState>((set) => ({
  nodes: [],
  edges: [],
  turtleSource: '',
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setTurtleSource: (turtleSource) => set({ turtleSource }),
}))
