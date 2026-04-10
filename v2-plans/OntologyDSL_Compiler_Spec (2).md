# OntologyDSL Compiler — Design and Specification

**Purpose:** Internal compilation target for token-efficient LLM prompts. Not user-facing. Converts between Turtle (RDF standard, user-facing) and a compact structured text format (OntologyDSL, sent to the model).

---

## 1. OntologyDSL Format Specification

### 1.1 Grammar

```
document     := prefixes? class*
prefixes     := "@prefixes" NL (prefix_line NL)*
prefix_line  := PNAME "=" IRI
class        := class_header NL property* relationship*
class_header := indent PNAME_URI ("[" annotation ("," annotation)* "]")?
annotation   := "abstract" | "comment:" QUOTED_STRING
property     := indent indent prop_name ":" type_expr prop_annotation*
type_expr    := XSD_SHORT | PNAME_URI | "(" type_expr ")"
prop_annotation := "[" ("range:" PNAME_URI | "optional" | "list") "]"
relationship := indent indent rel_type PNAME_URI
rel_type     := "→ subClassOf:" | "→ objectProperty:" prop_name "→"
indent       := "  "
```

### 1.2 Example

Given this Turtle:

```turtle
@prefix c2sim: <http://example.org/c2sim#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .

c2sim:Entity a owl:Class ;
    rdfs:comment "Base class for all trackable entities" .

c2sim:Platform a owl:Class ;
    rdfs:subClassOf c2sim:Entity ;
    rdfs:comment "A physical platform (aircraft, ship, vehicle)" .

c2sim:platformId a owl:DatatypeProperty ;
    rdfs:domain c2sim:Platform ;
    rdfs:range xsd:string .

c2sim:platformType a owl:DatatypeProperty ;
    rdfs:domain c2sim:Platform ;
    rdfs:range xsd:string .

c2sim:affiliation a owl:DatatypeProperty ;
    rdfs:domain c2sim:Platform ;
    rdfs:range xsd:string .

c2sim:Track a owl:Class ;
    rdfs:subClassOf c2sim:Entity .

c2sim:trackNumber a owl:DatatypeProperty ;
    rdfs:domain c2sim:Track ;
    rdfs:range xsd:integer .

c2sim:quality a owl:DatatypeProperty ;
    rdfs:domain c2sim:Track ;
    rdfs:range xsd:float .

c2sim:observedBy a owl:ObjectProperty ;
    rdfs:domain c2sim:Track ;
    rdfs:range c2sim:Platform .

c2sim:Position a owl:Class .

c2sim:latitude a owl:DatatypeProperty ;
    rdfs:domain c2sim:Position ;
    rdfs:range xsd:float .

c2sim:longitude a owl:DatatypeProperty ;
    rdfs:domain c2sim:Position ;
    rdfs:range xsd:float .

c2sim:altitude a owl:DatatypeProperty ;
    rdfs:domain c2sim:Position ;
    rdfs:range xsd:float .

c2sim:hasPosition a owl:ObjectProperty ;
    rdfs:domain c2sim:Track ;
    rdfs:range c2sim:Position .
```

Compiles to:

```
@prefixes
c2sim = http://example.org/c2sim#

c2sim:Entity [comment: "Base class for all trackable entities"]

c2sim:Platform [comment: "A physical platform (aircraft, ship, vehicle)"]
  → subClassOf: c2sim:Entity
  platformId: string
  platformType: string
  affiliation: string

c2sim:Track
  → subClassOf: c2sim:Entity
  → objectProperty: observedBy → c2sim:Platform
  → objectProperty: hasPosition → c2sim:Position
  trackNumber: integer
  quality: float

c2sim:Position
  latitude: float
  longitude: float
  altitude: float
```

### 1.3 Design Decisions

**Prefixed names everywhere.** The model sees `c2sim:Platform`, not full URIs. The prefix map at the top allows reconstruction. Standard XSD prefixes (`string`, `integer`, `float`, `boolean`, `dateTime`, `decimal`, `double`, `anyURI`) are used without a prefix for brevity.

**Properties grouped under their domain class.** Instead of listing properties as standalone RDF statements, they're nested under the class they belong to. This is how the model needs to reason about them — "what properties does Platform have?" — and it eliminates the `rdfs:domain` triple entirely.

**Object properties shown as relationships.** `c2sim:observedBy` with range `c2sim:Platform` becomes `→ objectProperty: observedBy → c2sim:Platform` under the domain class. This is more readable for the model and eliminates separate `rdfs:domain`/`rdfs:range` triples.

**Hierarchy shown inline.** `rdfs:subClassOf` becomes `→ subClassOf: c2sim:Entity` under the subclass. No separate triple needed.

**XSD types shortened.** `xsd:string` → `string`, `xsd:integer` → `integer`, etc. A fixed map handles the standard XSD types.

**Comments preserved.** `rdfs:comment` values are included as annotations — they carry semantic information that helps the model reason about mappings.

**What's intentionally lost:** RDF syntax details (blank nodes, reification, named graphs), OWL axioms beyond subClassOf (equivalentClass, restrictions, cardinality), property characteristics (functional, symmetric, etc.), annotation properties beyond rdfs:comment. These don't affect mapping suggestion quality. If needed in the future, the format can be extended.

### 1.4 Token Efficiency

Rough comparison for the example above:

| Format      | Approximate tokens |
| ----------- | ------------------ |
| Turtle      | ~280               |
| OntologyDSL | ~110               |
| JSON-LD     | ~350               |
| RDF/XML     | ~450               |

The DSL achieves roughly 60% token reduction vs. Turtle for typical ontologies. The savings increase with larger ontologies because the per-property overhead is lower (no `rdfs:domain`, `rdfs:range`, `a owl:DatatypeProperty` boilerplate per property).

---

## 2. Compiler API

### 2.1 Module: `src/lib/ontologyDSL.ts`

```typescript
/**
 * Compile Turtle source to the compact OntologyDSL format.
 * Uses N3.js to parse (already a project dependency).
 *
 * @param turtle - Valid Turtle source string
 * @returns Compact OntologyDSL string for use in LLM prompts
 * @throws Error if Turtle parsing fails
 */
export function turtleToOntologyDSL(turtle: string): string;

/**
 * [DEFERRED TO v3] Decompile OntologyDSL back to valid Turtle.
 * Not needed until the model suggests new ontology concepts that
 * need to be merged into the user's ontology. Included here for
 * future reference only.
 */
// export function ontologyDSLToTurtle(dsl: string): string;

/**
 * [DEFERRED TO v3] Parse OntologyDSL into a structured intermediate
 * representation. Only needed if the decompiler is implemented.
 */
// export function parseOntologyDSL(dsl: string): OntologyDSLDocument;

// ── Types ──

interface OntologyDSLDocument {
  prefixes: Record<string, string>; // prefix → IRI
  classes: DSLClass[];
}

interface DSLClass {
  uri: string; // prefixed name, e.g. "c2sim:Platform"
  comment?: string;
  abstract?: boolean;
  subClassOf?: string; // prefixed name of parent class
  dataProperties: DSLDataProperty[];
  objectProperties: DSLObjectProperty[];
}

interface DSLDataProperty {
  name: string; // local name, e.g. "platformId"
  dataType: string; // XSD shorthand, e.g. "string", "float"
  optional?: boolean;
  list?: boolean;
}

interface DSLObjectProperty {
  name: string; // local name, e.g. "observedBy"
  range: string; // prefixed name of target class
}
```

### 2.2 Compilation Algorithm (turtleToOntologyDSL)

```
1. Parse Turtle with N3.js → quad store
2. Extract prefix map from parser
3. Find all subjects with `a owl:Class` → class list
4. For each class:
   a. Find `rdfs:subClassOf` triples → parent
   b. Find `rdfs:comment` triples → comment
   c. Find all DatatypeProperty subjects where `rdfs:domain` = this class
      → data properties (name = localName, type = range shortened)
   d. Find all ObjectProperty subjects where `rdfs:domain` = this class
      → object properties (name = localName, range = range prefixed)
5. Sort classes: parents before children (topological sort on subClassOf)
6. Emit prefix block
7. For each class, emit class header + properties + relationships
```

### 2.3 Decompilation Algorithm (ontologyDSLToTurtle) — DEFERRED TO v3

Included for future reference. Not implemented in v2 — only needed if the model suggests new ontology concepts that need to be merged back into the user's Turtle source.

```
1. Parse DSL line by line
2. Extract prefix map from @prefixes block
3. For each class block:
   a. Emit `<uri> a owl:Class .`
   b. If comment: emit `<uri> rdfs:comment "..." .`
   c. If subClassOf: emit `<uri> rdfs:subClassOf <parent> .`
   d. For each data property:
      emit `<classPrefix:propName> a owl:DatatypeProperty ;`
      emit `    rdfs:domain <classUri> ;`
      emit `    rdfs:range <xsdType> .`
   e. For each object property:
      emit `<classPrefix:propName> a owl:ObjectProperty ;`
      emit `    rdfs:domain <classUri> ;`
      emit `    rdfs:range <rangeUri> .`
4. Prepend standard prefix declarations + extracted prefixes
5. Return assembled Turtle string
```

---

## 3. Integration with Prompt Engine

The `promptEngine.ts` module calls the compiler to build prompt context:

```typescript
// In promptEngine.ts

import { turtleToOntologyDSL } from './ontologyDSL';

function resolveVariable(variable: string, context: PromptContext): string {
  switch (variable) {
    case 'ontology_summary':
      // Compile Turtle → DSL on demand (cache result)
      return turtleToOntologyDSL(context.ontologyTurtle);
    case 'ontology_turtle':
      // Pass through raw Turtle for prompts that need it
      return context.ontologyTurtle;
    // ... other variables
  }
}
```

The DSL output should be cached in the `aiStore` and invalidated when the ontology Turtle source changes (subscribe to `ontologyStore.turtleSource` changes). This avoids re-parsing and re-compiling on every prompt construction.

---

## 4. Test Cases

### 4.1 Compilation Correctness

```
For each test ontology:
  dsl = turtleToOntologyDSL(turtle)
  parse turtle with N3.js → extract classes, properties, hierarchy
  parse dsl text → extract class names, property names, types, hierarchy
  assert: same classes present in both
  assert: same properties under each class
  assert: same hierarchy relationships
  assert: same XSD type mappings
  assert: comments preserved
```

Note: round-trip testing (DSL → Turtle → DSL) is deferred until the decompiler is implemented in v3.

### 4.2 Test Ontologies

| Test case                              | Coverage                                                             |
| -------------------------------------- | -------------------------------------------------------------------- |
| Empty ontology (no classes)            | Edge case — should produce empty DSL                                 |
| Single class, no properties            | Minimal valid output                                                 |
| C2SIM example (bundled in v1)          | Real-world NATO ontology with subclasses, data and object properties |
| Deep hierarchy (3+ levels)             | Topological sort correctness                                         |
| Multiple root classes                  | No single parent assumption                                          |
| Class with no domain properties        | Class appears but with no indented properties                        |
| Property with non-XSD range            | Falls back to prefixed URI for type                                  |
| Prefixed names with unusual characters | URI handling edge cases                                              |
| rdfs:comment with quotes and newlines  | String escaping                                                      |

### 4.3 Token Counting

```
For each test ontology:
  turtle_tokens = approximate_token_count(turtle)
  dsl_tokens = approximate_token_count(dsl)
  assert: dsl_tokens < turtle_tokens * 0.5
```

Use a simple whitespace/punctuation tokenizer for approximation — doesn't need to match a specific model's tokenizer, just verify the compression ratio.
