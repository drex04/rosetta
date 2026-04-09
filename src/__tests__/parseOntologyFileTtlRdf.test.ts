/**
 * Additional coverage for parseOntologyFile — Turtle and RDF/XML paths.
 * The JSON-LD paths are covered in parseOntologyFile.test.ts.
 */
import { describe, it, expect } from 'vitest';
import { parseOntologyFile } from '@/lib/parseOntologyFile';

function makeFile(name: string, content: string): File {
  return new File([content], name, { type: 'text/plain' });
}

const VALID_TURTLE = `
@prefix ex: <http://example.org/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

ex:Person a rdfs:Class ;
  rdfs:label "Person" .

ex:name a rdfs:Property ;
  rdfs:domain ex:Person .
`;

const VALID_RDFXML = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"
         xmlns:ex="http://example.org/">
  <rdf:Description rdf:about="http://example.org/Person">
    <rdf:type rdf:resource="http://www.w3.org/2000/01/rdf-schema#Class"/>
    <rdfs:label>Person</rdfs:label>
  </rdf:Description>
</rdf:RDF>`;

// ─── Turtle ───────────────────────────────────────────────────────────────────

describe('parseOntologyFile — Turtle (.ttl)', () => {
  it('parses valid Turtle and returns a Turtle string', async () => {
    const result = await parseOntologyFile(makeFile('onto.ttl', VALID_TURTLE));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('round-trips: output contains the original triples', async () => {
    const result = await parseOntologyFile(makeFile('onto.ttl', VALID_TURTLE));
    // N3 writer will include the URIs even if serialization differs
    expect(result).toContain('http://example.org/Person');
  });

  it('throws on invalid Turtle syntax', async () => {
    const bad = '@prefix ex: <http://example.org/> .\nex:Person BAD SYNTAX !!!';
    await expect(parseOntologyFile(makeFile('onto.ttl', bad))).rejects.toThrow(
      /Invalid Turtle/,
    );
  });

  it('handles empty Turtle file without throwing', async () => {
    const result = await parseOntologyFile(makeFile('onto.ttl', ''));
    // Empty file should produce an empty/minimal turtle string
    expect(typeof result).toBe('string');
  });
});

// ─── RDF/XML ──────────────────────────────────────────────────────────────────

describe('parseOntologyFile — RDF/XML (.rdf)', () => {
  it('parses valid RDF/XML and returns a Turtle string', async () => {
    const result = await parseOntologyFile(makeFile('onto.rdf', VALID_RDFXML));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('round-trips: output contains the class URI from the RDF/XML', async () => {
    const result = await parseOntologyFile(makeFile('onto.rdf', VALID_RDFXML));
    expect(result).toContain('http://example.org/Person');
  });

  it('throws on malformed RDF/XML', async () => {
    const bad =
      '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><unclosed>';
    await expect(parseOntologyFile(makeFile('onto.rdf', bad))).rejects.toThrow(
      /Invalid RDF\/XML/,
    );
  });
});

// ─── JSON-LD — array form ─────────────────────────────────────────────────────

describe('parseOntologyFile — JSON-LD array form', () => {
  it('parses a JSON-LD array document', async () => {
    const doc = JSON.stringify([
      {
        '@context': { ex: 'http://example.org/' },
        '@id': 'ex:Thing',
        '@type': 'http://www.w3.org/2000/01/rdf-schema#Class',
      },
    ]);
    const result = await parseOntologyFile(makeFile('ont.jsonld', doc));
    expect(typeof result).toBe('string');
    expect(result).toContain('http://example.org/Thing');
  });
});
