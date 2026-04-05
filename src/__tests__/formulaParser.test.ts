import { describe, it, expect } from 'vitest';
import {
  parseFormula,
  validateFormula,
  parseAndValidate,
  type Expr,
} from '../lib/formulaParser';

describe('parseFormula - happy path', () => {
  it('parses CONCAT(source.a, source.b)', () => {
    const expr = parseFormula('CONCAT(source.a, source.b)');
    expect(expr).toEqual({
      type: 'call',
      fn: 'CONCAT',
      args: [
        { type: 'field', path: 'a' },
        { type: 'field', path: 'b' },
      ],
    });
  });

  it('parses UPPER(source.name)', () => {
    const expr = parseFormula('UPPER(source.name)');
    expect(expr).toEqual({
      type: 'call',
      fn: 'UPPER',
      args: [{ type: 'field', path: 'name' }],
    });
  });

  it('parses REPLACE(source.id, "-", "_")', () => {
    const expr = parseFormula('REPLACE(source.id, "-", "_")');
    expect(expr).toEqual({
      type: 'call',
      fn: 'REPLACE',
      args: [
        { type: 'field', path: 'id' },
        { type: 'literal', value: '-' },
        { type: 'literal', value: '_' },
      ],
    });
  });

  it('parses LOWER(source.x)', () => {
    const expr = parseFormula('LOWER(source.x)');
    expect(expr).toEqual({
      type: 'call',
      fn: 'LOWER',
      args: [{ type: 'field', path: 'x' }],
    });
  });

  it('parses TRIM(source.val)', () => {
    const expr = parseFormula('TRIM(source.val)');
    expect(expr).toEqual({
      type: 'call',
      fn: 'TRIM',
      args: [{ type: 'field', path: 'val' }],
    });
  });
});

describe('parseFormula - nested calls', () => {
  it('parses CONCAT(UPPER(source.a), source.b)', () => {
    const expr = parseFormula('CONCAT(UPPER(source.a), source.b)');
    expect(expr).toEqual({
      type: 'call',
      fn: 'CONCAT',
      args: [
        {
          type: 'call',
          fn: 'UPPER',
          args: [{ type: 'field', path: 'a' }],
        },
        { type: 'field', path: 'b' },
      ],
    });
  });
});

describe('parseFormula - field refs', () => {
  it('parses bare source.myField as field ref', () => {
    const expr = parseFormula('source.myField');
    expect(expr).toEqual({ type: 'field', path: 'myField' });
  });
});

describe('parseFormula - literals', () => {
  it('parses double-quoted string literal', () => {
    const expr = parseFormula('"hello"');
    expect(expr).toEqual({ type: 'literal', value: 'hello' });
  });

  it('parses single-quoted string literal', () => {
    const expr = parseFormula("'world'");
    expect(expr).toEqual({ type: 'literal', value: 'world' });
  });

  it('parses numeric literal', () => {
    const expr = parseFormula('42');
    expect(expr).toEqual({ type: 'literal', value: '42' });
  });

  it('parses decimal numeric literal', () => {
    const expr = parseFormula('3.14');
    expect(expr).toEqual({ type: 'literal', value: '3.14' });
  });
});

describe('parseFormula - errors', () => {
  it('throws on empty string', () => {
    expect(() => parseFormula('')).toThrow();
  });

  it('throws on missing closing paren', () => {
    expect(() => parseFormula('CONCAT(source.a, source.b')).toThrow();
  });

  it('throws on unclosed string literal', () => {
    expect(() => parseFormula('"hello')).toThrow();
  });

  it('throws on unexpected token', () => {
    expect(() => parseFormula('(((')).toThrow();
  });
});

describe('validateFormula', () => {
  it('returns no errors for valid CONCAT', () => {
    const expr = parseFormula('CONCAT(source.a, source.b)');
    expect(validateFormula(expr)).toEqual([]);
  });

  it('returns error for unknown function FOO', () => {
    // Bypass parser whitelist by constructing AST manually
    const expr: Expr = {
      type: 'call',
      fn: 'FOO',
      args: [{ type: 'field', path: 'x' }],
    };
    const errors = validateFormula(expr);
    expect(
      errors.some((e) => e.toLowerCase().includes('unknown function')),
    ).toBe(true);
  });

  it('returns error for wrong arity UPPER with 2 args', () => {
    const expr: Expr = {
      type: 'call',
      fn: 'UPPER',
      args: [
        { type: 'field', path: 'a' },
        { type: 'field', path: 'b' },
      ],
    };
    const errors = validateFormula(expr);
    expect(errors.length).toBeGreaterThan(0);
    expect(
      errors.some(
        (e) =>
          e.toLowerCase().includes('arity') ||
          e.toLowerCase().includes('argument'),
      ),
    ).toBe(true);
  });

  it('returns error for REPLACE with too few args', () => {
    const expr: Expr = {
      type: 'call',
      fn: 'REPLACE',
      args: [{ type: 'field', path: 'id' }],
    };
    const errors = validateFormula(expr);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('validates nested calls recursively', () => {
    const expr: Expr = {
      type: 'call',
      fn: 'CONCAT',
      args: [
        { type: 'call', fn: 'UNKNOWN_FN', args: [] },
        { type: 'field', path: 'b' },
      ],
    };
    const errors = validateFormula(expr);
    expect(
      errors.some((e) => e.toLowerCase().includes('unknown function')),
    ).toBe(true);
  });

  it('returns no errors for field ref', () => {
    const expr: Expr = { type: 'field', path: 'myField' };
    expect(validateFormula(expr)).toEqual([]);
  });

  it('returns no errors for literal', () => {
    const expr: Expr = { type: 'literal', value: 'hello' };
    expect(validateFormula(expr)).toEqual([]);
  });
});

describe('parseAndValidate', () => {
  it('never throws, returns ast and errors', () => {
    const result = parseAndValidate('CONCAT(source.a, source.b)');
    expect(result.errors).toEqual([]);
    expect(result.ast).toBeDefined();
    expect(result.ast.type).toBe('call');
  });

  it('returns non-empty errors for empty string', () => {
    const result = parseAndValidate('');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns errors for unknown function FOO(source.x)', () => {
    const result = parseAndValidate('FOO(source.x)');
    expect(
      result.errors.some((e) => e.toLowerCase().includes('unknown function')),
    ).toBe(true);
  });

  it('returns errors for wrong arity UPPER(a, b) — treats bare ident as field after source.', () => {
    // UPPER with 2 args: even if parse succeeds, validate should catch arity
    const result = parseAndValidate('UPPER(source.a, source.b)');
    expect(
      result.errors.some(
        (e) =>
          e.toLowerCase().includes('arity') ||
          e.toLowerCase().includes('argument'),
      ),
    ).toBe(true);
  });

  it('returns errors for missing closing paren', () => {
    const result = parseAndValidate('CONCAT(source.a, source.b');
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
