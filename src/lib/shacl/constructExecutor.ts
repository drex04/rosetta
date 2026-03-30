import * as N3 from 'n3'
import type { Mapping } from '../../types'

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'

const { namedNode, blankNode, quad, defaultGraph } = N3.DataFactory

export { RDF_TYPE }

export function executeConstruct(instanceStore: N3.Store, mappings: Mapping[]): N3.Store {
  const result = new N3.Store()

  for (const mapping of mappings) {
    const subjects = instanceStore.getSubjects(
      namedNode(RDF_TYPE),
      namedNode(mapping.sourceClassUri),
      null,
    )

    for (const subject of subjects) {
      const objects = instanceStore.getObjects(subject, namedNode(mapping.sourcePropUri), null)

      for (const val of objects) {
        const target = blankNode(subject.value.replace(/[^a-zA-Z0-9]/g, '_') + '_target')

        result.addQuad(
          quad(target, namedNode(RDF_TYPE), namedNode(mapping.targetClassUri), defaultGraph()),
        )
        result.addQuad(
          quad(target, namedNode(mapping.targetPropUri), val, defaultGraph()),
        )
      }
    }
  }

  return result
}
