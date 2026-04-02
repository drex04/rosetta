/** Capitalizes the first character of a string. */
export function toPascalCase(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

/** Returns a short XSD datatype string for a JavaScript primitive value. */
export function xsdRangeShort(value: unknown): string {
  if (typeof value === 'boolean') return 'xsd:boolean';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return 'xsd:integer';
    return 'xsd:float';
  }
  return 'xsd:string';
}
