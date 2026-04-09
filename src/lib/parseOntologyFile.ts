import { Parser, Writer, Store } from 'n3';
import * as jsonld from 'jsonld';

export async function parseOntologyFile(file: File): Promise<string> {
  const text = await file.text();
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'ttl') {
    return await turtleToTurtle(text);
  }

  if (ext === 'jsonld') {
    let doc: unknown;
    try {
      doc = JSON.parse(text);
    } catch (e) {
      throw new Error(
        `Invalid JSON-LD: malformed JSON (${e instanceof Error ? e.message : String(e)})`,
      );
    }
    if (!isValidJsonLdDoc(doc)) {
      throw new Error(
        'Invalid JSON-LD: expected a JSON object or array at the top level',
      );
    }
    const toRDF = (
      jsonld as unknown as {
        toRDF: (doc: unknown, opts: object) => Promise<unknown>;
      }
    ).toRDF;
    const nquads = await toRDF(doc, { format: 'application/n-quads' });
    if (typeof nquads !== 'string') {
      throw new Error(
        'Invalid JSON-LD: jsonld.toRDF did not return an N-Quads string',
      );
    }
    return await nquadsToTurtle(nquads);
  }

  if (ext === 'rdf') {
    return await rdfXmlToTurtle(text);
  }

  throw new Error(`Unsupported format: .${ext}. Use .ttl, .rdf, or .jsonld.`);
}

/**
 * Runtime guard: a JSON-LD document must be a non-null object or an array.
 * Top-level primitives (string, number, boolean, null) are not valid JSON-LD.
 */
function isValidJsonLdDoc(v: unknown): v is object | unknown[] {
  return v !== null && typeof v === 'object';
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
