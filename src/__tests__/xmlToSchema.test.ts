import { describe, it, expect } from 'vitest'
import { xmlToSchema } from '@/lib/xmlToSchema'
import type { ClassData, ObjectPropertyEdgeData, PropertyData } from '@/types/index'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClasses(result: ReturnType<typeof xmlToSchema>): ClassData[] {
  return result.nodes.map((n) => n.data as ClassData)
}

function propsOf(result: ReturnType<typeof xmlToSchema>, label: string): PropertyData[] {
  const cls = getClasses(result).find((c: ClassData) => c.label === label)
  return cls?.properties ?? []
}

// ─── (a) Simple flat XML → correct classes + properties ───────────────────────

describe('simple flat XML', () => {
  it('creates a class from the root element', () => {
    const xml = `<Track><id>A1</id><speed>120</speed></Track>`
    const result = xmlToSchema(xml, 'TestSource')
    expect(result.warnings).toHaveLength(0)
    const labels = getClasses(result).map((c) => c.label)
    expect(labels).toContain('Track')
  })

  it('creates DatatypeProperty for leaf text elements', () => {
    const xml = `<Track><id>A1</id><speed>120</speed></Track>`
    const result = xmlToSchema(xml, 'TestSource')
    const props = propsOf(result, 'Track')
    expect(props.map((p) => p.label)).toContain('id')
    expect(props.map((p) => p.label)).toContain('speed')
  })

  it('infers xsd:integer for integer text content', () => {
    const xml = `<Track><count>42</count></Track>`
    const result = xmlToSchema(xml, 'TestSource')
    const prop = propsOf(result, 'Track').find((p) => p.label === 'count')
    expect(prop?.range).toBe('xsd:integer')
  })

  it('infers xsd:float for decimal text content', () => {
    const xml = `<Track><speed>1.5</speed></Track>`
    const result = xmlToSchema(xml, 'TestSource')
    const prop = propsOf(result, 'Track').find((p) => p.label === 'speed')
    expect(prop?.range).toBe('xsd:float')
  })

  it('infers xsd:boolean for boolean text content', () => {
    const xml = `<Track><active>true</active></Track>`
    const result = xmlToSchema(xml, 'TestSource')
    const prop = propsOf(result, 'Track').find((p) => p.label === 'active')
    expect(prop?.range).toBe('xsd:boolean')
  })

  it('uses xsd:string for regular text', () => {
    const xml = `<Track><name>Alpha</name></Track>`
    const result = xmlToSchema(xml, 'TestSource')
    const prop = propsOf(result, 'Track').find((p) => p.label === 'name')
    expect(prop?.range).toBe('xsd:string')
  })

  it('uses source-specific URI prefix', () => {
    const xml = `<Track><id>A1</id></Track>`
    const result = xmlToSchema(xml, 'MySource')
    const cls = getClasses(result).find((c) => c.label === 'Track')
    expect(cls?.uri).toContain('mysource')
  })

  it('produces a Turtle string', () => {
    const xml = `<Track><id>A1</id></Track>`
    const result = xmlToSchema(xml, 'TestSource')
    expect(result.turtle).toContain('owl:Class')
  })
})

// ─── (b) Nested XML → ObjectProperty edges ───────────────────────────────────

describe('nested XML → ObjectProperty edges', () => {
  it('creates child class for nested element', () => {
    const xml = `<Mission><target><id>T1</id></target></Mission>`
    const result = xmlToSchema(xml, 'TestSource')
    const labels = getClasses(result).map((c) => c.label)
    expect(labels).toContain('Mission')
    expect(labels).toContain('Target')
  })

  it('creates an ObjectProperty edge between parent and child class', () => {
    const xml = `<Mission><target><id>T1</id></target></Mission>`
    const result = xmlToSchema(xml, 'TestSource')
    const opEdges = result.edges.filter((e) => e.type === 'objectPropertyEdge')
    expect(opEdges).toHaveLength(1)
    const edgeData = opEdges[0]?.data as ObjectPropertyEdgeData
    expect(edgeData?.label).toBe('target')
  })

  it('edge source is parent node, target is child node', () => {
    const xml = `<Mission><target><id>T1</id></target></Mission>`
    const result = xmlToSchema(xml, 'TestSource')
    const opEdge = result.edges.find((e) => e.type === 'objectPropertyEdge')
    const parentNode = result.nodes.find((n) => (n.data as ClassData).label === 'Mission')
    const childNode = result.nodes.find((n) => (n.data as ClassData).label === 'Target')
    expect(opEdge?.source).toBe(parentNode?.id)
    expect(opEdge?.target).toBe(childNode?.id)
  })
})

// ─── (c) XML attributes → @attr DatatypeProperties ───────────────────────────

describe('XML attributes', () => {
  it('creates DatatypeProperty with @attr label for each attribute', () => {
    const xml = `<Track id="A1" speed="120"></Track>`
    const result = xmlToSchema(xml, 'TestSource')
    const props = propsOf(result, 'Track')
    expect(props.map((p) => p.label)).toContain('@id')
    expect(props.map((p) => p.label)).toContain('@speed')
  })

  it('infers types for attribute values', () => {
    const xml = `<Track count="42" active="true" ratio="1.5" name="alpha"></Track>`
    const result = xmlToSchema(xml, 'TestSource')
    const props = propsOf(result, 'Track')
    expect(props.find((p) => p.label === '@count')?.range).toBe('xsd:integer')
    expect(props.find((p) => p.label === '@active')?.range).toBe('xsd:boolean')
    expect(props.find((p) => p.label === '@ratio')?.range).toBe('xsd:float')
    expect(props.find((p) => p.label === '@name')?.range).toBe('xsd:string')
  })
})

// ─── (d) Invalid XML → warnings ──────────────────────────────────────────────

describe('invalid XML', () => {
  it('returns warnings for malformed XML', () => {
    const xml = `<Track><unclosed>`
    const result = xmlToSchema(xml, 'TestSource')
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toMatch(/invalid xml/i)
  })

  it('returns empty nodes and edges for malformed XML', () => {
    const xml = `<Track><unclosed>`
    const result = xmlToSchema(xml, 'TestSource')
    expect(result.nodes).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
  })
})

// ─── (e) Repeated elements → single class ─────────────────────────────────────

describe('repeated sibling elements', () => {
  it('uses first occurrence only — no duplicate class nodes', () => {
    const xml = `<Tracks><track><id>A1</id></track><track><id>A2</id></track></Tracks>`
    const result = xmlToSchema(xml, 'TestSource')
    const trackClasses = getClasses(result).filter((c) => c.label === 'Track')
    expect(trackClasses).toHaveLength(1)
  })

  it('still creates an ObjectProperty edge for the repeated element', () => {
    const xml = `<Tracks><track><id>A1</id></track><track><id>A2</id></track></Tracks>`
    const result = xmlToSchema(xml, 'TestSource')
    const opEdges = result.edges.filter((e) => e.type === 'objectPropertyEdge')
    expect(opEdges).toHaveLength(1)
  })
})

// ─── (f) Empty string → warnings ─────────────────────────────────────────────

describe('empty string input', () => {
  it('returns warnings for empty string', () => {
    const result = xmlToSchema('', 'TestSource')
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('returns empty nodes/edges for empty string', () => {
    const result = xmlToSchema('', 'TestSource')
    expect(result.nodes).toHaveLength(0)
    expect(result.edges).toHaveLength(0)
  })
})

// ─── (g) Mixed-content elements ──────────────────────────────────────────────

describe('mixed-content elements', () => {
  it('treats mixed-content element (text + child elements) as a class, ignoring bare text', () => {
    // "Track" has both text content and child elements — treat as class
    const xml = `<Track>some text<id>A1</id></Track>`
    const result = xmlToSchema(xml, 'TestSource')
    const labels = getClasses(result).map((c) => c.label)
    expect(labels).toContain('Track')
    // The child element 'id' should produce a property
    const props = propsOf(result, 'Track')
    expect(props.map((p) => p.label)).toContain('id')
  })
})

// ─── SchemaResult shape ───────────────────────────────────────────────────────

describe('SchemaResult shape', () => {
  it('returns nodes with type sourceNode', () => {
    const xml = `<Track><id>A1</id></Track>`
    const result = xmlToSchema(xml, 'TestSource')
    for (const node of result.nodes) {
      expect(node.type).toBe('sourceNode')
    }
  })

  it('returns nodes with amber-scheme data (uri, label, prefix, properties)', () => {
    const xml = `<Track><id>A1</id></Track>`
    const result = xmlToSchema(xml, 'TestSource')
    const cls = result.nodes[0]?.data as ClassData
    expect(cls).toHaveProperty('uri')
    expect(cls).toHaveProperty('label')
    expect(cls).toHaveProperty('prefix')
    expect(cls).toHaveProperty('properties')
  })
})
