import { describe, it, expect, beforeEach } from 'vitest'
import { useMappingStore } from '../store/mappingStore'
import type { Mapping } from '../types/index'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeBase(overrides: Partial<Omit<Mapping, 'id'>> = {}): Omit<Mapping, 'id'> {
  return {
    sourceId: 'src-1',
    sourceClassUri: 'http://example.org/TrackReport',
    sourcePropUri: 'http://example.org/trackId',
    targetClassUri: 'http://nato.int/onto#Track',
    targetPropUri: 'http://nato.int/onto#identifier',
    sourceHandle: 'prop_trackId',
    targetHandle: 'target_prop_identifier',
    kind: 'direct',
    sparqlConstruct: '',
    ...overrides,
  }
}

// Reset store between tests
beforeEach(() => {
  useMappingStore.setState({ mappings: {}, selectedMappingId: null })
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useMappingStore — addMapping', () => {
  it('returns an id and stores the mapping under sourceId', () => {
    const store = useMappingStore.getState()
    const id = store.addMapping(makeBase())

    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)

    const list = useMappingStore.getState().mappings['src-1']
    expect(list).toHaveLength(1)
    expect(list![0]!.id).toBe(id)
    expect(list![0]!.sourcePropUri).toBe('http://example.org/trackId')
  })

  it('is idempotent: duplicate prop pair returns existing id, no new entry (RD-04)', () => {
    const store = useMappingStore.getState()
    const id1 = store.addMapping(makeBase())
    const id2 = useMappingStore.getState().addMapping(makeBase())

    expect(id1).toBe(id2)
    expect(useMappingStore.getState().mappings['src-1']).toHaveLength(1)
  })

  it('allows distinct prop pairs for the same sourceId', () => {
    const store = useMappingStore.getState()
    store.addMapping(makeBase())
    useMappingStore.getState().addMapping(makeBase({ sourcePropUri: 'http://example.org/speed' }))

    expect(useMappingStore.getState().mappings['src-1']).toHaveLength(2)
  })

  it('stores mappings under different sourceId keys independently', () => {
    useMappingStore.getState().addMapping(makeBase({ sourceId: 'src-1' }))
    useMappingStore.getState().addMapping(makeBase({ sourceId: 'src-2' }))

    expect(useMappingStore.getState().mappings['src-1']).toHaveLength(1)
    expect(useMappingStore.getState().mappings['src-2']).toHaveLength(1)
  })
})

describe('useMappingStore — removeMapping', () => {
  it('removes the mapping with the given id', () => {
    const id = useMappingStore.getState().addMapping(makeBase())
    useMappingStore.getState().removeMapping(id)

    expect(useMappingStore.getState().mappings['src-1']).toHaveLength(0)
  })

  it('clears selectedMappingId when it matches the removed id', () => {
    const id = useMappingStore.getState().addMapping(makeBase())
    useMappingStore.setState({ selectedMappingId: id })

    useMappingStore.getState().removeMapping(id)

    expect(useMappingStore.getState().selectedMappingId).toBeNull()
  })

  it('does not clear selectedMappingId when a different mapping is removed', () => {
    const id1 = useMappingStore.getState().addMapping(makeBase())
    const id2 = useMappingStore
      .getState()
      .addMapping(makeBase({ sourcePropUri: 'http://example.org/speed' }))
    useMappingStore.setState({ selectedMappingId: id1 })

    useMappingStore.getState().removeMapping(id2)

    expect(useMappingStore.getState().selectedMappingId).toBe(id1)
  })

  it('is a no-op for an unknown id', () => {
    useMappingStore.getState().addMapping(makeBase())
    useMappingStore.getState().removeMapping('does-not-exist')

    expect(useMappingStore.getState().mappings['src-1']).toHaveLength(1)
  })
})

describe('useMappingStore — getMappingsForSource', () => {
  it('returns [] for an unknown sourceId', () => {
    expect(useMappingStore.getState().getMappingsForSource('unknown')).toEqual([])
  })

  it('returns stored mappings for a known sourceId', () => {
    useMappingStore.getState().addMapping(makeBase())
    useMappingStore.getState().addMapping(makeBase({ sourcePropUri: 'http://example.org/speed' }))

    const list = useMappingStore.getState().getMappingsForSource('src-1')
    expect(list).toHaveLength(2)
  })
})

describe('useMappingStore — updateMapping', () => {
  it('patches only the targeted mapping', () => {
    const id1 = useMappingStore.getState().addMapping(makeBase())
    const id2 = useMappingStore
      .getState()
      .addMapping(makeBase({ sourcePropUri: 'http://example.org/speed' }))

    useMappingStore.getState().updateMapping(id1, { kind: 'sparql', sparqlConstruct: 'CONSTRUCT {}' })

    const list = useMappingStore.getState().mappings['src-1']!
    const updated = list.find((m) => m.id === id1)!
    const untouched = list.find((m) => m.id === id2)!

    expect(updated.kind).toBe('sparql')
    expect(updated.sparqlConstruct).toBe('CONSTRUCT {}')
    expect(untouched.kind).toBe('direct')
    expect(untouched.sparqlConstruct).toBe('')
  })

  it('does not change the id of the patched mapping', () => {
    const id = useMappingStore.getState().addMapping(makeBase())
    useMappingStore.getState().updateMapping(id, { kind: 'sparql' })

    const list = useMappingStore.getState().mappings['src-1']!
    expect(list[0]!.id).toBe(id)
  })
})

describe('useMappingStore — setSelectedMappingId', () => {
  it('sets and clears selectedMappingId', () => {
    useMappingStore.getState().setSelectedMappingId('abc')
    expect(useMappingStore.getState().selectedMappingId).toBe('abc')

    useMappingStore.getState().setSelectedMappingId(null)
    expect(useMappingStore.getState().selectedMappingId).toBeNull()
  })
})
