import { describe, it, expect } from 'vitest';
import { parseOntologyFile } from '@/lib/parseOntologyFile';

function makeFile(name: string, content: string): File {
  return new File([content], name, { type: 'text/plain' });
}

describe('parseOntologyFile — JSON-LD guard', () => {
  it('parses a valid JSON-LD document', async () => {
    const doc = JSON.stringify({
      '@context': { ex: 'http://example.org/' },
      '@id': 'ex:alice',
      'ex:name': 'Alice',
    });
    const result = await parseOntologyFile(makeFile('ont.jsonld', doc));
    expect(typeof result).toBe('string');
    expect(result).toContain('Alice');
  });

  it('throws a descriptive error on malformed JSON', async () => {
    await expect(
      parseOntologyFile(makeFile('ont.jsonld', '{ not json')),
    ).rejects.toThrow(/Invalid JSON-LD: malformed JSON/);
  });

  it('throws when the top level is a primitive (wrong shape)', async () => {
    await expect(
      parseOntologyFile(makeFile('ont.jsonld', '"just a string"')),
    ).rejects.toThrow(/expected a JSON object or array at the top level/);
  });

  it('throws on empty file content', async () => {
    await expect(parseOntologyFile(makeFile('ont.jsonld', ''))).rejects.toThrow(
      /Invalid JSON-LD: malformed JSON/,
    );
  });

  it('throws on unsupported extension', async () => {
    await expect(parseOntologyFile(makeFile('ont.xyz', '{}'))).rejects.toThrow(
      /Unsupported format/,
    );
  });
});
