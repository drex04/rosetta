import { Parser, Writer, Store } from 'n3';
import * as jsonld from 'jsonld';

export async function parseOntologyFile(file: File): Promise<string> {
  const text = await file.text();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'ttl') {
    return await turtleToTurtle(text);
  }

  if (ext === 'jsonld') {
    const doc: unknown = JSON.parse(text);
    const nquads = await (
      jsonld as unknown as {
        toRDF: (doc: unknown, opts: object) => Promise<string>;
      }
    ).toRDF(doc, { format: 'application/n-quads' });
    return await nquadsToTurtle(nquads);
  }

  if (ext === 'rdf') {
    return await rdfXmlToTurtle(text);
  }

  throw new Error(`Unsupported format: .${ext}. Use .ttl, .rdf, or .jsonld.`);
}

function turtleToTurtle(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const store = new Store();
    new Parser().parse(text, (err, quad) => {
      if (err) {
        reject(new Error(`Invalid Turtle: ${err.message}`));
        return;
      }
      if (quad) {
        store.add(quad);
        return;
      }
      const writer = new Writer({ prefixes: {} });
      store.forEach((q) => writer.addQuad(q));
      writer.end((e, result) => (e ? reject(e) : resolve(result)));
    });
  });
}

function nquadsToTurtle(nquads: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const store = new Store();
    new Parser({ format: 'N-Quads' }).parse(nquads, (err, quad) => {
      if (err) {
        reject(err);
        return;
      }
      if (quad) {
        store.add(quad);
        return;
      }
      const writer = new Writer({ prefixes: {} });
      store.forEach((q) => writer.addQuad(q));
      writer.end((e, result) => (e ? reject(e) : resolve(result)));
    });
  });
}

async function rdfXmlToTurtle(text: string): Promise<string> {
  const { RdfXmlParser } = await import('rdfxml-streaming-parser');
  const store = new Store();
  return new Promise((resolve, reject) => {
    const parser = new RdfXmlParser();
    parser.on('data', (quad) => store.add(quad));
    parser.on('error', (err: Error) =>
      reject(new Error(`Invalid RDF/XML: ${err.message}`)),
    );
    parser.on('end', () => {
      const writer = new Writer({ prefixes: {} });
      store.forEach((q) => writer.addQuad(q));
      writer.end((e, result) => (e ? reject(e) : resolve(result)));
    });
    parser.write(text);
    parser.end();
  });
}
