import { describe, it, expect } from 'vitest';
import {
  detectFormatFromContent,
  detectFormatFromFile,
} from '../lib/detectFormat';

describe('detectFormatFromContent', () => {
  it('detects JSON object', () => {
    expect(detectFormatFromContent('{ "key": "value" }')).toBe('json');
  });

  it('detects JSON array', () => {
    expect(detectFormatFromContent('[1, 2, 3]')).toBe('json');
  });

  it('detects JSON with leading whitespace', () => {
    expect(detectFormatFromContent('  \n{ "key": "value" }')).toBe('json');
  });

  it('detects XML', () => {
    expect(detectFormatFromContent('<root><child/></root>')).toBe('xml');
  });

  it('detects XML with leading whitespace', () => {
    expect(detectFormatFromContent('  \n<?xml version="1.0"?><root/>')).toBe(
      'xml',
    );
  });

  it('returns unknown for empty string', () => {
    expect(detectFormatFromContent('')).toBe('unknown');
  });

  it('returns unknown for whitespace-only string', () => {
    expect(detectFormatFromContent('   \n  ')).toBe('unknown');
  });

  it('returns unknown for ambiguous content', () => {
    expect(detectFormatFromContent('hello world')).toBe('unknown');
  });

  it('returns unknown for CSV-like content', () => {
    expect(detectFormatFromContent('a,b,c\n1,2,3')).toBe('unknown');
  });
});

describe('detectFormatFromFile', () => {
  function makeFile(name: string, type: string, content = ''): File {
    return new File([content], name, { type });
  }

  it('detects JSON from application/json MIME type', () => {
    const file = makeFile('data.json', 'application/json');
    expect(detectFormatFromFile(file)).toBe('json');
  });

  it('detects XML from text/xml MIME type', () => {
    const file = makeFile('data.xml', 'text/xml');
    expect(detectFormatFromFile(file)).toBe('xml');
  });

  it('detects XML from application/xml MIME type', () => {
    const file = makeFile('data.xml', 'application/xml');
    expect(detectFormatFromFile(file)).toBe('xml');
  });

  it('falls back to .json extension when MIME type is empty', () => {
    const file = makeFile('data.json', '');
    expect(detectFormatFromFile(file)).toBe('json');
  });

  it('falls back to .xml extension when MIME type is empty', () => {
    const file = makeFile('data.xml', '');
    expect(detectFormatFromFile(file)).toBe('xml');
  });

  it('returns unknown for unrecognized extension and no MIME type', () => {
    const file = makeFile('data.csv', '');
    expect(detectFormatFromFile(file)).toBe('unknown');
  });

  it('returns unknown for no extension and no MIME type', () => {
    const file = makeFile('data', '');
    expect(detectFormatFromFile(file)).toBe('unknown');
  });
});
