/**
 * Detects format (JSON or XML) from raw text content.
 * Trims whitespace and inspects the first character.
 */
export function detectFormatFromContent(text: string): 'json' | 'xml' | 'unknown' {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 'unknown';
  const first = trimmed[0];
  if (first === '{' || first === '[') return 'json';
  if (first === '<') return 'xml';
  return 'unknown';
}

/**
 * Detects format from a File object.
 * Checks MIME type first, falls back to file extension.
 */
export function detectFormatFromFile(file: File): 'json' | 'xml' | 'unknown' {
  const type = file.type.toLowerCase();
  if (type === 'application/json') return 'json';
  if (type === 'text/xml' || type === 'application/xml') return 'xml';

  const name = file.name.toLowerCase();
  const dot = name.lastIndexOf('.');
  if (dot !== -1) {
    const ext = name.slice(dot + 1);
    if (ext === 'json') return 'json';
    if (ext === 'xml') return 'xml';
  }

  return 'unknown';
}
