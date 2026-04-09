import * as N3 from 'n3';
import type { SourceNodeData } from '../../types';
import { toPascalCase, xsdRangeShort } from '@/lib/stringUtils';
import { localName } from '@/lib/rdf';

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const XSD = 'http://www.w3.org/2001/XMLSchema#';

const { namedNode, blankNode, literal, quad, defaultGraph } = N3.DataFactory;

function typedLiteral(value: unknown): N3.Literal {
  const range = xsdRangeShort(value);
  // range may be "xsd:string" (prefixed) — localName() handles this via ':' fallback.
  const datatypeUri = range.startsWith('xsd:')
    ? XSD + range.slice('xsd:'.length)
    : XSD + localName(range);
  return literal(String(value), namedNode(datatypeUri));
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function xmlToInstances(
  xml: string,
  schemaNodes: SourceNodeData[],
): N3.Store {
  const store = new N3.Store();
  const uriBase = schemaNodes[0]?.data.prefix ?? '';
  if (!uriBase || !xml.trim()) return store;

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) return store;
  const root = doc.documentElement;
  if (!root) return store;

  function hasChildElements(el: Element): boolean {
    for (let i = 0; i < el.childNodes.length; i++) {
      if (el.childNodes[i]!.nodeType === 1) return true;
    }
    return false;
  }

  function walkEl(el: Element, depth: number): N3.BlankNode | undefined {
    if (depth > 10) return undefined;
    const instance = blankNode();
    store.addQuad(
      quad(
        instance,
        namedNode(RDF_TYPE),
        namedNode(uriBase + toPascalCase(el.localName)),
        defaultGraph(),
      ),
    );

    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i]!;
      store.addQuad(
        quad(
          instance,
          namedNode(uriBase + 'attr_' + attr.localName),
          typedLiteral(attr.value),
          defaultGraph(),
        ),
      );
    }

    for (let i = 0; i < el.childNodes.length; i++) {
      const child = el.childNodes[i]!;
      if (child.nodeType !== 1) continue;
      const childEl = child as Element;
      if (hasChildElements(childEl)) {
        const childBN = walkEl(childEl, depth + 1);
        if (childBN) {
          store.addQuad(
            quad(
              instance,
              namedNode(uriBase + childEl.localName),
              childBN,
              defaultGraph(),
            ),
          );
        }
      } else {
        const text = childEl.textContent ?? '';
        store.addQuad(
          quad(
            instance,
            namedNode(uriBase + childEl.localName),
            typedLiteral(text),
            defaultGraph(),
          ),
        );
      }
    }
    return instance;
  }

  walkEl(root, 0);
  return store;
}

export function sourceToInstances(source: {
  rawData: string;
  dataFormat: 'json' | 'xml';
  schemaNodes: SourceNodeData[];
}): N3.Store {
  if (source.dataFormat === 'xml')
    return xmlToInstances(source.rawData, source.schemaNodes);
  return jsonToInstances(source.rawData, source.schemaNodes);
}

export function jsonToInstances(
  json: string,
  schemaNodes: SourceNodeData[],
): N3.Store {
  const store = new N3.Store();
  const uriBase = schemaNodes[0]?.data.prefix ?? '';
  if (!uriBase) return store;

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return store;
  }

  function walkValue(
    value: unknown,
    className: string,
    depth: number,
  ): N3.BlankNode | undefined {
    if (depth > 10) return undefined;

    if (Array.isArray(value)) {
      for (const item of value) {
        walkValue(item, className, depth);
      }
      return undefined;
    }

    if (isPlainObject(value)) {
      const instance = blankNode();
      store.addQuad(
        quad(
          instance,
          namedNode(RDF_TYPE),
          namedNode(uriBase + className),
          defaultGraph(),
        ),
      );

      for (const [key, val] of Object.entries(value)) {
        if (val === null || val === undefined) continue;

        if (Array.isArray(val)) {
          walkValue(val, toPascalCase(key), depth + 1);
        } else if (isPlainObject(val)) {
          const childBN = walkValue(val, toPascalCase(key), depth + 1);
          if (childBN) {
            store.addQuad(
              quad(instance, namedNode(uriBase + key), childBN, defaultGraph()),
            );
          }
        } else {
          // primitive
          store.addQuad(
            quad(
              instance,
              namedNode(uriBase + key),
              typedLiteral(val),
              defaultGraph(),
            ),
          );
        }
      }

      return instance;
    }

    return undefined;
  }

  walkValue(parsed, 'Root', 0);

  return store;
}
