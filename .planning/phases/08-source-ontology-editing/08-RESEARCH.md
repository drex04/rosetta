# Phase 8: XML Support & File Upload - Research

**Researched:** 2026-03-31
**Domain:** XML parsing, file upload, filetype detection, RDFS schema generation
**Confidence:** HIGH

## Summary

This phase adds XML source support and file upload to the existing JSON-based source pipeline. The existing `jsonToSchema.ts` provides a clear pattern: parse input, walk the structure, emit `SourceNode[]` + `OntologyEdge[]` + Turtle string via `SchemaResult`. The XML converter must produce identical output types.

For XML parsing, the browser's built-in `DOMParser` is the correct choice -- it adds zero bundle size, handles namespaces natively, and is performant enough for the schema-inference use case (we only need the structure, not streaming). File upload uses a simple hidden `<input type="file">` triggered by a shadcn Button -- no need for react-dropzone or drag-and-drop given this is a developer/analyst tool with single-file uploads. Filetype detection combines MIME type from the File API with first-non-whitespace-character heuristic for pasted text.

**Primary recommendation:** Use browser-native `DOMParser` for XML, match the `SchemaResult` interface exactly, and keep file upload minimal (styled input, no drag-and-drop library).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REQ-58 | File upload for source data -- file picker button alongside paste textarea | File upload pattern with hidden input + shadcn Button; accept filter for .json/.xml |
| REQ-59 | XML source support -- parse XML input alongside JSON | DOMParser-based XML parsing; xmlToSchema converter mirroring jsonToSchema |
| REQ-60 | Auto-detect filetype from pasted or uploaded content | Dual heuristic: MIME type from File API + first-char sniffing for paste |
| REQ-61 | Auto-generate RDFS schema from XML | XML walker producing SchemaResult (nodes, edges, turtle) identical to jsonToSchema output |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| DOMParser (built-in) | Web API | Parse XML strings to DOM tree | Zero bundle cost, native namespace support, universal browser support |
| @codemirror/lang-xml | 6.1.0 | XML syntax highlighting in editor | Matches existing @codemirror/lang-json pattern; auto-close tags |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N3.js | (existing) | Turtle serialization of generated RDFS | Already in deps; reuse for XML schema serialization |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| DOMParser | fast-xml-parser (~40kB min+gz) | Adds bundle size; returns plain objects (easier to walk) but we only need structure inference, not full parsing pipeline |
| DOMParser | txml (~4kB) | Smaller than fast-xml-parser but still unnecessary when DOMParser is free |
| Hidden input | react-dropzone | Overkill for single-file upload in a developer tool; adds dependency |

**Installation:**
```bash
npm install @codemirror/lang-xml
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    jsonToSchema.ts        # Existing JSON->RDFS converter
    xmlToSchema.ts         # NEW: XML->RDFS converter (mirrors jsonToSchema)
    detectFormat.ts        # NEW: Filetype detection utility
  components/
    panels/
      SourcePanel.tsx      # MODIFIED: Add file upload button + format-aware parsing
```

### Pattern 1: SchemaResult Interface Contract
**What:** Both `jsonToSchema` and `xmlToSchema` return the same `SchemaResult` type.
**When to use:** Always -- this is the integration contract.
**Example:**
```typescript
// src/lib/xmlToSchema.ts
import type { SchemaResult } from './jsonToSchema'

export function xmlToSchema(xmlString: string, sourceName: string): SchemaResult {
  const empty: SchemaResult = { nodes: [], edges: [], turtle: '', warnings: [] }

  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'application/xml')

  // Check for parse errors
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    return { ...empty, warnings: ['Invalid XML'] }
  }

  // Walk DOM tree, emit SourceNode[] + OntologyEdge[]
  // ... (walker logic)

  return { nodes, edges, turtle, warnings }
}
```

### Pattern 2: XML Element to RDFS Mapping Rules
**What:** Deterministic mapping from XML structure to OWL/RDFS concepts.
**Rules:**
- Element with child elements -> `owl:Class` (PascalCase from tag name)
- Leaf element with text content -> `owl:DatatypeProperty` on parent class
- XML attribute -> `owl:DatatypeProperty` (prefixed with `@` in label for clarity)
- Nested element (parent has children of same structure) -> `owl:ObjectProperty` edge
- Repeated sibling elements with same tag -> treat as array (use first occurrence for schema)
- XML namespaces -> strip namespace prefix for label, preserve full qualified name in URI
- Text content type inference: reuse `xsdRangeShort`-style logic (try parseFloat, parseInt, boolean)

**Example XML:**
```xml
<tracks>
  <track id="A-0042">
    <position>
      <lat>59.9</lat>
      <lon>10.7</lon>
    </position>
    <speed unit="kts">450</speed>
  </track>
</tracks>
```
**Produces:**
- Class `Track` with DatatypeProperties: `@id` (xsd:string), `speed` (xsd:integer), `@unit` (xsd:string on Speed class or Track)
- Class `Position` with DatatypeProperties: `lat` (xsd:float), `lon` (xsd:float)
- ObjectProperty edge: Track -> Position

### Pattern 3: Format Detection
**What:** Detect JSON vs XML from raw text or File object.
**Example:**
```typescript
// src/lib/detectFormat.ts
export type SourceFormat = 'json' | 'xml' | 'unknown'

export function detectFormat(content: string): SourceFormat {
  const trimmed = content.trimStart()
  if (trimmed.length === 0) return 'unknown'

  const firstChar = trimmed[0]
  if (firstChar === '{' || firstChar === '[') return 'json'
  if (firstChar === '<') return 'xml'

  return 'unknown'
}

export function detectFormatFromFile(file: File): SourceFormat {
  // MIME type is most reliable for uploads
  if (file.type === 'application/json' || file.name.endsWith('.json')) return 'json'
  if (file.type === 'text/xml' || file.type === 'application/xml' || file.name.endsWith('.xml')) return 'xml'
  return 'unknown'
}
```

### Pattern 4: File Upload with Hidden Input
**What:** Styled file upload using hidden input + shadcn Button trigger.
**Example:**
```typescript
const fileInputRef = useRef<HTMLInputElement>(null)

const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return

  const format = detectFormatFromFile(file)
  const reader = new FileReader()
  reader.onload = () => {
    const text = reader.result as string
    // Fall back to content detection if MIME was ambiguous
    const finalFormat = format !== 'unknown' ? format : detectFormat(text)
    // Update editor content + trigger schema generation
    handleContentChange(text, finalFormat)
  }
  reader.readAsText(file)
  // Reset input so same file can be re-uploaded
  e.target.value = ''
}

// In JSX:
<input
  ref={fileInputRef}
  type="file"
  accept=".json,.xml"
  className="hidden"
  onChange={handleFileUpload}
/>
<Button
  variant="outline"
  size="sm"
  onClick={() => fileInputRef.current?.click()}
>
  <UploadSimple className="h-4 w-4 mr-1" />
  Upload
</Button>
```

### Pattern 5: Source Model Extension
**What:** The `Source` interface needs a `format` field to track input type.
**Current:** `Source.json` field holds the raw text (misleadingly named for XML).
**Recommendation:** Add `format: 'json' | 'xml'` field. Keep the `json` field name for backward compatibility with IDB persistence (renaming would break existing saved projects). Alternatively, rename to `rawContent` if a migration is acceptable.

**Preferred approach -- rename with migration guard:**
```typescript
export interface Source {
  id: string
  name: string
  order: number
  rawContent: string       // was: json
  format: 'json' | 'xml'  // NEW
  schemaNodes: SourceNode[]
  schemaEdges: OntologyEdge[]
}
```

The IDB hydrate type guard already validates shape -- add `format` with default `'json'` for backward compat:
```typescript
// In hydrate type guard:
format: typeof s.format === 'string' ? s.format : 'json'
```

### Anti-Patterns to Avoid
- **Parsing XML with regex:** Never try to extract structure from XML with regex. Use DOMParser.
- **Sharing schema converters:** Don't try to unify JSON and XML walkers into one generic walker. The DOM tree and plain-object tree have different APIs. Keep them separate with shared output types.
- **Ignoring XML declaration:** `<?xml version="1.0"?>` is not an element. DOMParser handles this automatically but regex-based detection could trip on it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XML parsing | Custom regex/string parser | `DOMParser` (built-in) | Handles namespaces, entities, CDATA, encoding declarations |
| XSD type inference from text | Complex regex type detector | Simple `parseFloat`/`parseInt`/boolean check | Good enough for schema inference; matches jsonToSchema approach |
| File upload dropzone | Custom drag-and-drop | Hidden `<input type="file">` + Button | Single-file use case doesn't justify library overhead |
| XML syntax highlighting | Custom tokenizer | `@codemirror/lang-xml` | Official CodeMirror package, auto-close tags |

**Key insight:** DOMParser is the only XML parser needed. It is free (zero bytes), standards-compliant, handles edge cases (CDATA, entities, namespaces), and returns a traversable DOM tree. Adding fast-xml-parser would be pure overhead.

## Common Pitfalls

### Pitfall 1: DOMParser Silent Failure
**What goes wrong:** `DOMParser.parseFromString()` never throws. On malformed XML it returns a document containing a `<parsererror>` element.
**Why it happens:** Web API design -- errors are in-band, not exceptions.
**How to avoid:** Always check `doc.querySelector('parsererror')` after parsing.
**Warning signs:** Schema generation silently produces empty results on bad XML.

### Pitfall 2: XML Namespace Prefix Confusion
**What goes wrong:** `element.tagName` returns `ns:localName` but `element.localName` returns just `localName`. Using `tagName` as the class label produces ugly URIs like `ns:Track`.
**Why it happens:** XML namespaces split the tag name.
**How to avoid:** Always use `element.localName` for labels and class names.
**Warning signs:** Generated class names contain colons.

### Pitfall 3: Mixed Content Elements
**What goes wrong:** An element like `<desc>A <b>bold</b> word</desc>` has both text nodes and child elements. Treating it as either a class or a property fails.
**Why it happens:** XML allows mixed content; JSON does not.
**How to avoid:** If an element has both `childNodes` with text and element children, treat it as a Class and add a special `_text` DatatypeProperty for the text content. Or emit a warning and skip mixed content.
**Warning signs:** Missing data in generated schema for elements with inline markup.

### Pitfall 4: Repeated Elements as Arrays
**What goes wrong:** XML uses repeated sibling elements for arrays: `<track>...</track><track>...</track>`. If you process each one separately, you get duplicate classes.
**Why it happens:** No explicit array marker in XML (unlike JSON's `[]`).
**How to avoid:** Group child elements by tag name. If a tag appears more than once among siblings, treat as array -- use only the first occurrence for schema inference.
**Warning signs:** Duplicate class nodes with identical labels.

### Pitfall 5: IDB Migration on Source Shape Change
**What goes wrong:** Adding `format` field or renaming `json` to `rawContent` breaks existing persisted sources in IndexedDB.
**Why it happens:** IDB type guards reject shapes that don't match.
**How to avoid:** Type guard must provide defaults: `format: s.format ?? 'json'`, `rawContent: s.rawContent ?? s.json ?? ''`.
**Warning signs:** Sources disappear after upgrade; `setSaveStatus('error')` fires on hydration.

### Pitfall 6: CodeMirror Language Extension Mismatch
**What goes wrong:** The editor shows JSON highlighting for XML content or vice versa.
**Why it happens:** Language extension is set at mount time and not updated when format changes.
**How to avoid:** Remount the editor (via React `key` prop tied to format) or use CodeMirror's `Compartment` for dynamic language switching.
**Warning signs:** No syntax highlighting or wrong colors after pasting XML into a JSON-configured editor.

## Code Examples

### XML Walker (Core Logic)
```typescript
// Source: DOMParser Web API + project jsonToSchema pattern
function walkElement(
  el: Element,
  ctx: WalkContext,
  path: string,
): string | null {
  const childElements = Array.from(el.children)
  const className = toPascalCase(el.localName)

  if (childElements.length === 0) {
    // Leaf element -- this is a property, not a class
    return null
  }

  // Group children by localName to detect arrays
  const grouped = new Map<string, Element[]>()
  for (const child of childElements) {
    const key = child.localName
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(child)
  }

  const properties: PropertyData[] = []
  const objectProps: Array<{ propName: string; rangeUri: string }> = []

  // Attributes -> DatatypeProperty
  for (const attr of Array.from(el.attributes)) {
    properties.push({
      uri: `${ctx.uriBase}${attr.localName}`,
      label: `@${attr.localName}`,
      range: inferXsdType(attr.value),
      kind: 'datatype',
    })
  }

  for (const [tagName, elements] of grouped) {
    const representative = elements[0]!
    const hasChildren = representative.children.length > 0

    if (hasChildren) {
      // Nested element with children -> recurse, create ObjectProperty
      const nestedUri = walkElement(representative, ctx, `${path}/${tagName}`)
      if (nestedUri) {
        objectProps.push({ propName: tagName, rangeUri: nestedUri })
      }
    } else {
      // Leaf element -> DatatypeProperty
      const textContent = representative.textContent ?? ''
      properties.push({
        uri: `${ctx.uriBase}${tagName}`,
        label: tagName,
        range: inferXsdType(textContent),
        kind: 'datatype',
      })
    }
  }

  // Create class node (same pattern as jsonToSchema walkObject)
  const classUri = `${ctx.uriBase}${className}`
  const nodeId = crypto.randomUUID()
  // ... emit node + edges (identical to jsonToSchema pattern)

  return classUri
}
```

### XSD Type Inference from String Values
```typescript
function inferXsdType(value: string): string {
  const trimmed = value.trim()
  if (trimmed === '') return 'xsd:string'
  if (trimmed === 'true' || trimmed === 'false') return 'xsd:boolean'
  if (/^-?\d+$/.test(trimmed)) return 'xsd:integer'
  if (/^-?\d+\.\d+$/.test(trimmed)) return 'xsd:float'
  // ISO date pattern (basic check)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return 'xsd:dateTime'
  return 'xsd:string'
}
```

### Dynamic CodeMirror Language Switching
```typescript
import { Compartment } from '@codemirror/state'
import { json } from '@codemirror/lang-json'
import { xml } from '@codemirror/lang-xml'

const langCompartment = new Compartment()

// At editor creation:
const extensions = [
  // ...other extensions
  langCompartment.of(format === 'xml' ? xml() : json()),
]

// On format change:
view.dispatch({
  effects: langCompartment.reconfigure(
    newFormat === 'xml' ? xml() : json()
  ),
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| xml2js (callback-based) | DOMParser (sync, built-in) | Always available | No dependency needed for browser XML parsing |
| fast-xml-parser v4 | fast-xml-parser v5 (ESM) | 2024 | Only relevant if DOMParser insufficient (it is sufficient here) |
| react-dropzone for all uploads | Native File API + styled input | Ongoing trend | Simpler for single-file use cases |

**Deprecated/outdated:**
- `xml2js`: Callback-based, designed for Node.js; unnecessary in browser with DOMParser available
- `@axe-core/react` for a11y on file inputs: Use native HTML `accept` attribute instead

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config file | vitest.config.ts (existing) |
| Quick run command | `npm run test` |
| Full suite command | `npm run build && npm run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-58 | File upload reads file and populates editor | integration | Manual (requires DOM file input simulation) | No - Wave 0 |
| REQ-59 | XML string parsed without error | unit | `npx vitest run src/__tests__/xmlToSchema.test.ts -t "parses valid XML"` | No - Wave 0 |
| REQ-60 | Detect JSON vs XML from content | unit | `npx vitest run src/__tests__/detectFormat.test.ts` | No - Wave 0 |
| REQ-61 | XML produces SchemaResult with correct nodes/edges | unit | `npx vitest run src/__tests__/xmlToSchema.test.ts` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run build && npm run test`
- **Phase gate:** Full suite green before `verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/xmlToSchema.test.ts` -- covers REQ-59, REQ-61 (mirror jsonToSchema.test.ts structure)
- [ ] `src/__tests__/detectFormat.test.ts` -- covers REQ-60
- [ ] Install `@codemirror/lang-xml` -- `npm install @codemirror/lang-xml`

## Open Questions

1. **Source field rename (`json` -> `rawContent`)?**
   - What we know: Current field is `json: string` which is misleading for XML content
   - What's unclear: Whether renaming breaks too many callsites vs just adding `format` field
   - Recommendation: Rename to `rawContent` with IDB migration guard. The rename is mechanical (find/replace) and prevents future confusion. The `format` field provides the discriminator.

2. **XML declaration and DOCTYPE handling?**
   - What we know: DOMParser handles `<?xml?>` declarations and basic DOCTYPEs
   - What's unclear: Whether we should strip/preserve XML declarations in the editor display
   - Recommendation: Preserve as-is. DOMParser ignores them during structural parsing.

3. **XSD-aware parsing?**
   - What we know: Some XML comes with XSD schema files that define types
   - What's unclear: Whether we should support XSD import for type-aware schema generation
   - Recommendation: Defer XSD support. Infer types from content (like jsonToSchema does). XSD parsing is a large scope increase.

## Sources

### Primary (HIGH confidence)
- [MDN DOMParser](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser) - parseFromString API, error handling
- [MDN Element.localName](https://developer.mozilla.org/en-US/docs/Web/API/Element/localName) - namespace-safe tag name access
- [@codemirror/lang-xml npm](https://www.npmjs.com/package/@codemirror/lang-xml) - v6.1.0, XML language support
- Project source: `src/lib/jsonToSchema.ts` - SchemaResult interface, walker pattern, Turtle serialization

### Secondary (MEDIUM confidence)
- [fast-xml-parser npm](https://www.npmjs.com/package/fast-xml-parser) - v5.5.9, bundle size comparison
- [fast-xml-parser Bundlephobia](https://bundlephobia.com/package/fast-xml-parser) - size metrics
- [sadmann7/file-uploader](https://github.com/sadmann7/file-uploader) - shadcn file upload patterns

### Tertiary (LOW confidence)
- Bundle size specifics for fast-xml-parser (exact numbers not verified via Bundlephobia page content)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - DOMParser is a stable Web API, @codemirror/lang-xml is the official package
- Architecture: HIGH - xmlToSchema mirrors proven jsonToSchema pattern; SchemaResult contract is clear
- Pitfalls: HIGH - DOMParser parseerror behavior and namespace handling are well-documented
- File upload: HIGH - Native File API is stable; pattern is minimal

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable APIs, unlikely to change)
