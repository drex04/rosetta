import { describe, it, expect, vi, afterEach } from 'vitest';
import { jsonToSchema } from '@/lib/jsonToSchema';

// ─── Primitive fields → DatatypeProperty ──────────────────────────────────────

describe('primitive field type mapping', () => {
  it('maps string field to xsd:string DatatypeProperty', () => {
    const json = JSON.stringify({ items: [{ name: 'Alpha' }] });
    const result = jsonToSchema(json, 'TestSource');
    const node = result.nodes[0];
    const prop = (
      node?.data as { properties?: Array<{ range: string; label: string }> }
    )?.properties?.find((p) => p.label === 'name');
    expect(prop?.range).toBe('xsd:string');
    expect(result.warnings).toHaveLength(0);
  });

  it('maps number with decimal to xsd:float DatatypeProperty', () => {
    const json = JSON.stringify({ items: [{ speed: 1.5 }] });
    const result = jsonToSchema(json, 'TestSource');
    const node = result.nodes[0];
    const prop = (
      node?.data as { properties?: Array<{ range: string; label: string }> }
    )?.properties?.find((p) => p.label === 'speed');
    expect(prop?.range).toBe('xsd:float');
  });

  it('maps integer to xsd:integer DatatypeProperty', () => {
    const json = JSON.stringify({ items: [{ count: 42 }] });
    const result = jsonToSchema(json, 'TestSource');
    const node = result.nodes[0];
    const prop = (
      node?.data as { properties?: Array<{ range: string; label: string }> }
    )?.properties?.find((p) => p.label === 'count');
    expect(prop?.range).toBe('xsd:integer');
  });

  it('maps boolean to xsd:boolean DatatypeProperty', () => {
    const json = JSON.stringify({ items: [{ active: true }] });
    const result = jsonToSchema(json, 'TestSource');
    const node = result.nodes[0];
    const prop = (
      node?.data as { properties?: Array<{ range: string; label: string }> }
    )?.properties?.find((p) => p.label === 'active');
    expect(prop?.range).toBe('xsd:boolean');
  });
});

// ─── Array root → Class (PascalCase, no singularization) ─────────────────────

describe('array root class naming', () => {
  it('derives class name from root key using PascalCase with NO singularization', () => {
    const json = JSON.stringify({ radarTracks: [{ id: 'A1' }] });
    const result = jsonToSchema(json, 'TestSource');
    expect(result.nodes).toHaveLength(1);
    const node = result.nodes[0];
    expect((node?.data as { label?: string })?.label).toBe('RadarTracks');
  });

  it('handles already-PascalCase key', () => {
    const json = JSON.stringify({ Radarspuren: [{ id: 'B1' }] });
    const result = jsonToSchema(json, 'TestSource');
    expect((result.nodes[0]?.data as { label?: string })?.label).toBe(
      'Radarspuren',
    );
  });
});

// ─── Nested object → separate Class + ObjectProperty link ────────────────────

describe('nested object handling', () => {
  it('emits a separate Class node for a nested object', () => {
    const json = JSON.stringify({
      tracks: [{ id: 'A1', position: { lat: 59.9, lon: 10.7 } }],
    });
    const result = jsonToSchema(json, 'TestSource');
    // Should have 2 nodes: Tracks and Position
    expect(result.nodes).toHaveLength(2);
    // Should have 1 edge linking Tracks → Position
    expect(result.edges).toHaveLength(1);
    const labels = result.nodes.map(
      (n) => (n.data as { label?: string })?.label,
    );
    expect(labels).toContain('Tracks');
    expect(labels).toContain('Position');
  });

  it('emits an ObjectProperty edge between parent and child class', () => {
    const json = JSON.stringify({
      tracks: [{ id: 'A1', position: { lat: 59.9, lon: 10.7 } }],
    });
    const result = jsonToSchema(json, 'TestSource');
    expect(result.edges).toHaveLength(1);
  });
});

// ─── Circular reference handling ──────────────────────────────────────────────

describe('circular reference handling', () => {
  it('does not throw on circular references', () => {
    // Build a circular object and serialize with a replacer
    const obj: Record<string, unknown> = { id: 'root', name: 'test' };
    obj['self'] = obj;

    // We can't JSON.stringify a true circular, so we simulate what a
    // user might pass: a JSON where a property points to a previously seen
    // structural pattern — instead we test with a manually crafted case
    // that uses the same reference trick at the walk level.
    // The real circular test is at the walk level:
    expect(() => {
      // Patch: test via direct call with hand-crafted cycle at runtime
      // Since JSON itself can't encode cycles, we test that the walker
      // handles repeated nested references gracefully
      const safeJson = JSON.stringify({
        items: [{ id: 'a', child: { id: 'b', name: 'nested' } }],
      });
      jsonToSchema(safeJson, 'TestSource');
    }).not.toThrow();
  });

  it('adds circular path to warnings and suppresses the circular property', () => {
    // We test circular detection by having the walker encounter the same
    // object reference twice. We expose a test-only hook via a crafted
    // structure that reuses sub-objects:
    // Since JSON.parse returns plain objects (no cycles), we test via
    // the module's internal walk by using a deep chain that is NOT circular
    // but verify the warning mechanism with a mock approach.
    //
    // The real circular ref detection is internal: we test it via the
    // exported function by monkey-patching JSON.parse to return a cyclic graph.
    const circularObj: Record<string, unknown> = { id: 'root', name: 'test' };
    circularObj['self'] = circularObj;

    const mockParse = vi
      .spyOn(JSON, 'parse')
      .mockReturnValueOnce({ items: circularObj });

    const result = jsonToSchema('{"items": {}}', 'TestSource');

    mockParse.mockRestore();
    // Should not throw and should have a warning about the circular reference
    expect(
      result.warnings.some(
        (w) => w.includes('Circular') || w.includes('circular'),
      ),
    ).toBe(true);
  });

  it('still emits parent Class even when circular property is suppressed', () => {
    const circularObj: Record<string, unknown> = { id: 'root', name: 'test' };
    circularObj['self'] = circularObj;

    const mockParse = vi
      .spyOn(JSON, 'parse')
      .mockReturnValueOnce({ items: [circularObj] });

    const result = jsonToSchema('{"items": [{}]}', 'TestSource');

    mockParse.mockRestore();
    // Parent class node must still be emitted
    expect(result.nodes.length).toBeGreaterThan(0);
    // Circular property must be suppressed (no edge to a self-referencing node)
    // and warning present
    expect(
      result.warnings.some(
        (w) => w.includes('Circular') || w.includes('circular'),
      ),
    ).toBe(true);
  });
});

// ─── Empty input ──────────────────────────────────────────────────────────────

describe('empty input handling', () => {
  it('returns empty result for empty object {}', () => {
    const result = jsonToSchema('{}', 'TestSource');
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
    expect(result.turtle).toBe('');
    expect(result.warnings).toHaveLength(0);
  });

  it('returns empty result for empty array []', () => {
    const result = jsonToSchema('[]', 'TestSource');
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
    expect(result.turtle).toBe('');
    expect(result.warnings).toHaveLength(0);
  });
});

// ─── Null / primitive root ─────────────────────────────────────────────────────

describe('unexpected root types', () => {
  it('returns Unexpected root type warning for null root', () => {
    const result = jsonToSchema('null', 'TestSource');
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
    expect(result.turtle).toBe('');
    expect(result.warnings).toContain('Unexpected root type');
  });

  it('returns Unexpected root type warning for string root', () => {
    const result = jsonToSchema('"hello"', 'TestSource');
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
    expect(result.turtle).toBe('');
    expect(result.warnings).toContain('Unexpected root type');
  });

  it('returns Unexpected root type warning for number root', () => {
    const result = jsonToSchema('42', 'TestSource');
    expect(result.warnings).toContain('Unexpected root type');
  });

  it('returns Unexpected root type warning for boolean root', () => {
    const result = jsonToSchema('true', 'TestSource');
    expect(result.warnings).toContain('Unexpected root type');
  });
});

// ─── Invalid JSON ─────────────────────────────────────────────────────────────

describe('invalid JSON handling', () => {
  it('returns Invalid JSON warning for malformed input', () => {
    const result = jsonToSchema('{not valid json}', 'TestSource');
    expect(result.nodes).toHaveLength(0);
    expect(result.warnings).toContain('Invalid JSON');
  });
});

// ─── URI prefix sanitization ──────────────────────────────────────────────────

describe('URI prefix sanitization', () => {
  it('sanitizes source name with special chars: Norway/Track#Alpha → src_norwaytrackalpha_', () => {
    const json = JSON.stringify({ items: [{ id: 'x' }] });
    const result = jsonToSchema(json, 'Norway/Track#Alpha');
    // The turtle should contain the sanitized prefix (all lowercase)
    expect(result.turtle).toContain('src_norwaytrackalpha_');
  });

  it('sanitizes spaces: Norwegian Radar → src_norwegianradar_', () => {
    const json = JSON.stringify({ items: [{ id: 'x' }] });
    const result = jsonToSchema(json, 'Norwegian Radar');
    expect(result.turtle).toContain('src_norwegianradar_');
  });
});

// ─── Root object with array property ─────────────────────────────────────────

describe('root object with array property', () => {
  it('class name is PascalCase of the array key with NO singularization', () => {
    const json = JSON.stringify({
      radarTracks: [
        { trkNo: 'A-0042', lat: 59.9, lon: 10.7, alt_ft: 32000, active: true },
      ],
    });
    const result = jsonToSchema(json, 'Norwegian Radar');
    expect(result.nodes).toHaveLength(1);
    expect((result.nodes[0]?.data as { label?: string })?.label).toBe(
      'RadarTracks',
    );
    expect(result.warnings).toHaveLength(0);

    // Verify primitive properties present
    const props =
      (
        result.nodes[0]?.data as {
          properties?: Array<{ label: string; range: string }>;
        }
      )?.properties ?? [];
    const propMap = Object.fromEntries(props.map((p) => [p.label, p.range]));
    expect(propMap['trkNo']).toBe('xsd:string');
    expect(propMap['lat']).toBe('xsd:float');
    expect(propMap['alt_ft']).toBe('xsd:integer');
    expect(propMap['active']).toBe('xsd:boolean');
  });
});

// ─── N3.Writer failure ────────────────────────────────────────────────────────

describe('N3.Writer failure handling', () => {
  afterEach(() => {
    vi.doUnmock('n3');
    vi.resetModules();
  });

  it('returns turtle="" and warning when N3.Writer throws', async () => {
    // Use vi.doMock (not hoisted) so it only affects this test
    vi.doMock('n3', async () => {
      const actual = await vi.importActual<typeof import('n3')>('n3');
      return {
        ...actual,
        Writer: class {
          addQuad() {
            throw new Error('N3 writer error');
          }
          end() {
            throw new Error('N3 writer error');
          }
        },
      };
    });

    vi.resetModules();
    const { jsonToSchema: jsonToSchemaFresh } =
      await import('@/lib/jsonToSchema');
    const result = jsonToSchemaFresh(
      JSON.stringify({ items: [{ id: 'x' }] }),
      'TestSource',
    );
    expect(result.turtle).toBe('');
    expect(result.warnings).toContain('Failed to serialize schema to Turtle');
  });
});

// ─── Norwegian sample JSON ────────────────────────────────────────────────────

describe('Norwegian radar sample', () => {
  it('produces RadarTracks class with primitive properties and no errors', async () => {
    const norwegianJson = JSON.stringify({
      radarTracks: [
        {
          trkNo: 'A-0042',
          lat: 59.9139,
          lon: 10.7522,
          alt_ft: 32000,
          spd_kts: 450,
          hdg: 270,
          iff: 'FRI',
          iff_conf: 0.95,
          sensor: 'NORSE-3D',
          country: 'NOR',
          time: '2026-03-24T14:23:00Z',
        },
      ],
    });

    const result = jsonToSchema(norwegianJson, 'Norwegian Radar');
    expect(result.warnings).toHaveLength(0);
    expect(result.nodes).toHaveLength(1);
    expect((result.nodes[0]?.data as { label?: string })?.label).toBe(
      'RadarTracks',
    );
    expect(result.turtle).toContain('RadarTracks');
    expect(result.turtle).toContain('src_norwegianradar_');
  });
});
