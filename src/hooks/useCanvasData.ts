import { useOntologyStore } from '../store/ontologyStore'
import { useSourcesStore } from '../store/sourcesStore'

export function useCanvasData() {
  const { nodes: masterNodes, edges: masterEdges } = useOntologyStore()
  const { sources, activeSourceId } = useSourcesStore()
  const active = sources.find((s) => s.id === activeSourceId)
  return {
    nodes: [...masterNodes, ...(active?.schemaNodes ?? [])],
    edges: [...masterEdges, ...(active?.schemaEdges ?? [])],
  }
}
