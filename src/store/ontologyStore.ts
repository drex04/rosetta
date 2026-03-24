import { create } from 'zustand'
import type { Node, Edge } from '@xyflow/react'

interface OntologyState {
  nodes: Node[]
  edges: Edge[]
  turtleSource: string
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
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
