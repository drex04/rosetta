import { describe, it, expect } from 'vitest'
import { migrateSource } from '@/store/sourcesStore'

describe('migrateSource (IDB migration)', () => {
  it('copies json → rawData and sets dataFormat when only json field exists', () => {
    const legacySource = {
      id: 'abc',
      name: 'Test',
      order: 0,
      json: '[{"id":1}]',
      schemaNodes: [],
      schemaEdges: [],
    }

    const result = migrateSource(legacySource as unknown as Record<string, unknown>)

    expect(result.rawData).toBe('[{"id":1}]')
    expect(result.dataFormat).toBe('json')
    expect('json' in result).toBe(false)
  })

  it('leaves an already-migrated source unchanged', () => {
    const modernSource = {
      id: 'abc',
      name: 'Test',
      order: 0,
      rawData: '[{"id":1}]',
      dataFormat: 'json' as const,
      schemaNodes: [],
      schemaEdges: [],
    }

    const result = migrateSource(modernSource as unknown as Record<string, unknown>)

    expect(result.rawData).toBe('[{"id":1}]')
    expect(result.dataFormat).toBe('json')
    expect('json' in result).toBe(false)
  })

  it('handles missing json field gracefully (new source with no data)', () => {
    const partialSource = {
      id: 'xyz',
      name: 'Empty',
      order: 0,
      schemaNodes: [],
      schemaEdges: [],
    }

    const result = migrateSource(partialSource as unknown as Record<string, unknown>)

    expect(result.rawData).toBe('')
    expect(result.dataFormat).toBe('json')
    expect('json' in result).toBe(false)
  })
})
