import * as N3 from 'n3';
import type { OntologyNode } from '../../types';
import { localName } from '../rdf';

const SH = 'http://www.w3.org/ns/shacl#';
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const XSD = 'http://www.w3.org/2001/XMLSchema#';

const { namedNode, blankNode, quad, defaultGraph } = N3.DataFactory;

export function generateShapes(ontologyNodes: OntologyNode[]): N3.Store {
  const store = new N3.Store();

  for (const node of ontologyNodes) {
    const classUri = node.data.uri;
    if (!classUri) continue;

    const shapeUri = classUri + 'Shape';
    const shapeNode = namedNode(shapeUri);
    const classNode = namedNode(classUri);

    // shapeUri rdf:type sh:NodeShape
    store.addQuad(
      quad(
        shapeNode,
        namedNode(RDF_TYPE),
        namedNode(SH + 'NodeShape'),
        defaultGraph(),
      ),
    );
    // shapeUri sh:targetClass classUri
    store.addQuad(
      quad(shapeNode, namedNode(SH + 'targetClass'), classNode, defaultGraph()),
    );

    for (const prop of node.data.properties) {
      const propNode = namedNode(prop.uri);
      const bn = blankNode();

      if (prop.kind === 'datatype') {
        // Expand xsd: prefix
        if (!prop.range.startsWith('xsd:')) continue;
        const localName = prop.range.slice('xsd:'.length);
        const datatypeUri = XSD + localName;

        store.addQuad(
          quad(bn, namedNode(SH + 'path'), propNode, defaultGraph()),
        );
        store.addQuad(
          quad(
            bn,
            namedNode(SH + 'datatype'),
            namedNode(datatypeUri),
            defaultGraph(),
          ),
        );
        store.addQuad(
          quad(shapeNode, namedNode(SH + 'property'), bn, defaultGraph()),
        );
      } else if (prop.kind === 'object') {
        const rangeNode = namedNode(prop.range);

        store.addQuad(
          quad(bn, namedNode(SH + 'path'), propNode, defaultGraph()),
        );
        store.addQuad(
          quad(bn, namedNode(SH + 'class'), rangeNode, defaultGraph()),
        );
        store.addQuad(
          quad(shapeNode, namedNode(SH + 'property'), bn, defaultGraph()),
        );
      }
    }
  }

  return store;
}

export async function generateShapesTurtle(
  nodes: OntologyNode[],
): Promise<string> {
  const blocks: string[] = [];

  for (const node of nodes) {
    const classUri = node.data.uri;
    if (!classUri) continue;

    const store = generateShapes([node]);

    const writer = new N3.Writer({ prefixes: { sh: SH, xsd: XSD } });
    store.forEach((q) => writer.addQuad(q));
    const turtleStr = await new Promise<string>((res, rej) =>
      writer.end((err, result) => (err ? rej(err) : res(result))),
    );

    blocks.push(
      `# Auto-generated — derived from ${localName(classUri)}\n${turtleStr}`,
    );
  }

  return blocks.join('\n\n');
}
