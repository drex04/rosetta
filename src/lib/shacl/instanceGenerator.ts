import * as N3 from 'n3'
import type { SourceNode } from '../../types'

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
const XSD = 'http://www.w3.org/2001/XMLSchema#'

const { namedNode, blankNode, literal, quad, defaultGraph } = N3.DataFactory

function toPascalCase(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1)
}

function xsdRangeShort(value: unknown): string {
  if (typeof value === 'boolean') return 'xsd:boolean'
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return 'xsd:integer'
    return 'xsd:float'
  }
  return 'xsd:string'
}

function typedLiteral(value: unknown): N3.Literal {
  const range = xsdRangeShort(value)
  const localName = range.slice('xsd:'.length)
  const datatypeUri = XSD + localName
  return literal(String(value), namedNode(datatypeUri))
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function jsonToInstances(json: string, schemaNodes: SourceNode[]): N3.Store {
  const store = new N3.Store()
  const uriBase = schemaNodes[0]?.data.prefix ?? ''

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return store
  }

  function walkValue(value: unknown, className: string, depth: number): N3.BlankNode | undefined {
    if (depth > 10) return undefined

    if (Array.isArray(value)) {
      for (const item of value) {
        walkValue(item, className, depth)
      }
      return undefined
    }

    if (isPlainObject(value)) {
      const instance = blankNode()
      store.addQuad(quad(instance, namedNode(RDF_TYPE), namedNode(uriBase + className), defaultGraph()))

      for (const [key, val] of Object.entries(value)) {
        if (val === null || val === undefined) continue

        if (Array.isArray(val)) {
          walkValue(val, toPascalCase(key), depth + 1)
        } else if (isPlainObject(val)) {
          const childBN = walkValue(val, toPascalCase(key), depth + 1)
          if (childBN) {
            store.addQuad(quad(instance, namedNode(uriBase + key), childBN, defaultGraph()))
          }
        } else {
          // primitive
          store.addQuad(quad(instance, namedNode(uriBase + key), typedLiteral(val), defaultGraph()))
        }
      }

      return instance
    }

    return undefined
  }

  walkValue(parsed, 'Root', 0)

  return store
}
