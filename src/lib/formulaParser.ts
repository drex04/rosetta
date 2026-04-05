// formulaParser.ts — hand-rolled tokenizer + recursive descent parser
// No eval(), no Function(). Produces an AST only; never executes JS.

// ---------------------------------------------------------------------------
// AST types
// ---------------------------------------------------------------------------

export type Expr =
  | { type: 'call'; fn: string; args: Expr[] }
  | { type: 'field'; path: string } // source.fieldName
  | { type: 'literal'; value: string };

export type ParseResult = { ast: Expr; errors: string[] };

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type TokenKind =
  | 'IDENT'
  | 'DOT'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'STRING'
  | 'NUMBER'
  | 'EOF';

interface Token {
  kind: TokenKind;
  value: string;
  pos: number;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    // Skip whitespace
    if (/\s/.test(input[i]!)) {
      i++;
      continue;
    }

    const ch = input[i]!;

    if (ch === '(') {
      tokens.push({ kind: 'LPAREN', value: '(', pos: i });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ kind: 'RPAREN', value: ')', pos: i });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ kind: 'COMMA', value: ',', pos: i });
      i++;
      continue;
    }
    if (ch === '.') {
      tokens.push({ kind: 'DOT', value: '.', pos: i });
      i++;
      continue;
    }

    // String literals — single or double quoted
    if (ch === '"' || ch === "'") {
      const quote = ch;
      const start = i;
      i++;
      let str = '';
      while (i < input.length && input[i]! !== quote) {
        if (input[i]! === '\\') {
          i++;
          if (i >= input.length) break;
          str += input[i]!;
        } else {
          str += input[i]!;
        }
        i++;
      }
      if (i >= input.length) {
        throw new Error(
          `Unterminated string literal starting at position ${start}`,
        );
      }
      i++; // consume closing quote
      tokens.push({ kind: 'STRING', value: str, pos: start });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch)) {
      const start = i;
      let num = '';
      while (i < input.length && /[0-9.]/.test(input[i]!)) {
        num += input[i]!;
        i++;
      }
      tokens.push({ kind: 'NUMBER', value: num, pos: start });
      continue;
    }

    // Identifiers
    if (/[A-Za-z_]/.test(ch)) {
      const start = i;
      let ident = '';
      while (i < input.length && /[A-Za-z0-9_]/.test(input[i]!)) {
        ident += input[i]!;
        i++;
      }
      tokens.push({ kind: 'IDENT', value: ident, pos: start });
      continue;
    }

    throw new Error(`Unexpected character '${ch}' at position ${i}`);
  }

  tokens.push({ kind: 'EOF', value: '', pos: i });
  return tokens;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos]!;
  }

  private consume(): Token {
    const tok = this.tokens[this.pos]!;
    this.pos++;
    return tok;
  }

  private expect(kind: TokenKind): Token {
    const tok = this.peek();
    if (tok.kind !== kind) {
      throw new Error(
        `Expected ${kind} but got ${tok.kind} ('${tok.value}') at position ${tok.pos}`,
      );
    }
    return this.consume();
  }

  /** Top-level: parse one expression, then expect EOF. */
  parseTop(): Expr {
    if (this.peek().kind === 'EOF') {
      throw new Error('Empty input: expected an expression');
    }
    const expr = this.parseExpr();
    if (this.peek().kind !== 'EOF') {
      const tok = this.peek();
      throw new Error(`Unexpected token '${tok.value}' at position ${tok.pos}`);
    }
    return expr;
  }

  /** parseExpr → tries call, then fieldRef, then literal */
  parseExpr(): Expr {
    const tok = this.peek();

    // Call: IDENT LPAREN …
    if (tok.kind === 'IDENT') {
      // Look ahead: is next token after ident a LPAREN?
      const next = this.tokens[this.pos + 1];
      if (next && next.kind === 'LPAREN') {
        return this.parseCall();
      }
      // Could be field ref: source DOT IDENT
      return this.parseFieldRef();
    }

    // Literal
    if (tok.kind === 'STRING' || tok.kind === 'NUMBER') {
      return this.parseLiteral();
    }

    throw new Error(
      `Unexpected token '${tok.value}' (${tok.kind}) at position ${tok.pos}: expected expression`,
    );
  }

  /** parseCall → IDENT LPAREN [parseExpr (COMMA parseExpr)*] RPAREN */
  private parseCall(): Expr {
    const fnTok = this.expect('IDENT');
    const fn = fnTok.value;
    this.expect('LPAREN');

    const args: Expr[] = [];
    if (this.peek().kind !== 'RPAREN') {
      args.push(this.parseExpr());
      while (this.peek().kind === 'COMMA') {
        this.consume(); // eat COMMA
        args.push(this.parseExpr());
      }
    }

    this.expect('RPAREN');
    return { type: 'call', fn, args };
  }

  /** parseFieldRef → `source` DOT IDENT */
  private parseFieldRef(): Expr {
    const ident = this.expect('IDENT');
    if (ident.value !== 'source') {
      throw new Error(
        `Expected 'source' but got '${ident.value}' at position ${ident.pos}. Field refs must start with 'source.'`,
      );
    }
    this.expect('DOT');
    const field = this.expect('IDENT');
    return { type: 'field', path: field.value };
  }

  /** parseLiteral → STRING | NUMBER */
  private parseLiteral(): Expr {
    const tok = this.peek();
    if (tok.kind === 'STRING' || tok.kind === 'NUMBER') {
      this.consume();
      return { type: 'literal', value: tok.value };
    }
    throw new Error(
      `Expected string or number literal but got ${tok.kind} at position ${tok.pos}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Whitelist validator
// ---------------------------------------------------------------------------

const ALLOWED_FUNCTIONS: Record<string, { minArgs: number; maxArgs: number }> =
  {
    CONCAT: { minArgs: 2, maxArgs: 8 },
    UPPER: { minArgs: 1, maxArgs: 1 },
    LOWER: { minArgs: 1, maxArgs: 1 },
    TRIM: { minArgs: 1, maxArgs: 1 },
    REPLACE: { minArgs: 3, maxArgs: 3 },
  };

export function validateFormula(expr: Expr): string[] {
  const errors: string[] = [];
  walkValidate(expr, errors);
  return errors;
}

function walkValidate(expr: Expr, errors: string[]): void {
  if (expr.type === 'call') {
    const spec = ALLOWED_FUNCTIONS[expr.fn];
    if (!spec) {
      errors.push(
        `Unknown function: '${expr.fn}'. Allowed: ${Object.keys(ALLOWED_FUNCTIONS).join(', ')}`,
      );
    } else {
      const argc = expr.args.length;
      if (argc < spec.minArgs || argc > spec.maxArgs) {
        const range =
          spec.minArgs === spec.maxArgs
            ? `exactly ${spec.minArgs}`
            : `${spec.minArgs}–${spec.maxArgs}`;
        errors.push(
          `Arity error: ${expr.fn} requires ${range} argument(s), got ${argc}`,
        );
      }
    }
    // Recurse into args regardless so nested errors surface
    for (const arg of expr.args) {
      walkValidate(arg, errors);
    }
  }
  // field and literal nodes are always valid structurally
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

/** Parse formula string into an AST. Throws on parse error. */
export function parseFormula(input: string): Expr {
  const tokens = tokenize(input);
  const parser = new Parser(tokens);
  return parser.parseTop();
}

/** Validate an already-parsed AST. Returns array of error strings (empty = valid). */
// (already exported above)

/** Parse and validate in one step. Never throws. */
export function parseAndValidate(input: string): ParseResult {
  try {
    const ast = parseFormula(input);
    const errors = validateFormula(ast);
    return { ast, errors };
  } catch (err) {
    // Return a sentinel AST so callers always get a defined `.ast`
    const sentinel: Expr = { type: 'literal', value: '' };
    const message = err instanceof Error ? err.message : String(err);
    return { ast: sentinel, errors: [message] };
  }
}
