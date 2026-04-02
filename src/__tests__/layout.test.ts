import { describe, it, expect } from 'vitest';
import { applyTreeLayout, TREE_BASE_Y, TREE_INDENT_X } from '@/lib/layout';

// NODE_HEADER_HEIGHT = 52, NODE_PROPERTY_HEIGHT = 33, NODE_VERTICAL_GAP = 20
// These are internal constants; we derive expected spacing from observed behaviour.

describe('applyTreeLayout', () => {
  it('empty input returns empty Map', () => {
    const result = applyTreeLayout([], [], 0);
    expect(result.size).toBe(0);
  });

  it('single node with no edges is placed at baseX and TREE_BASE_Y', () => {
    const result = applyTreeLayout([{ id: 'A' }], [], 0);
    expect(result.size).toBe(1);
    const pos = result.get('A')!;
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(TREE_BASE_Y);
  });

  it('baseX offset is applied to single node', () => {
    const result = applyTreeLayout([{ id: 'A' }], [], 200);
    expect(result.get('A')!.x).toBe(200);
  });

  it('parent-child indentation: child is one level deeper', () => {
    const nodes = [{ id: 'A' }, { id: 'B' }];
    const edges = [{ source: 'A', target: 'B' }];
    const result = applyTreeLayout(nodes, edges, 0);

    const posA = result.get('A')!;
    const posB = result.get('B')!;

    expect(posA.x).toBe(0); // depth 0
    expect(posB.x).toBe(TREE_INDENT_X); // depth 1
    expect(posB.y).toBeGreaterThan(posA.y); // B is below A
  });

  it('multiple roots with no edges: each root Y is strictly increasing', () => {
    const nodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }];
    const result = applyTreeLayout(nodes, [], 0);

    const yA = result.get('A')!.y;
    const yB = result.get('B')!.y;
    const yC = result.get('C')!.y;

    // All placed at depth 0
    expect(result.get('A')!.x).toBe(0);
    expect(result.get('B')!.x).toBe(0);
    expect(result.get('C')!.x).toBe(0);

    expect(yB).toBeGreaterThan(yA);
    expect(yC).toBeGreaterThan(yB);
  });

  it('orphan node (not reachable from roots) still appears in the map', () => {
    // A → B, C has no edges connecting it to A/B so it will not be visited by DFS
    // Actually, with no inbound edge C is treated as a root too.
    // To force orphan behaviour: give C an inbound edge from a non-existent node
    // so it is excluded from roots, but the non-existent node is never placed.
    // Simpler: create a cycle (B → A) so A is not a root; only C is a root,
    // and B becomes unreachable.
    const nodes = [{ id: 'A' }, { id: 'B' }, { id: 'C' }];
    // A is child of B, B is child of A (cycle) → neither A nor B is a root
    // C has no parent → C is the only root
    // A and B are never visited by DFS and must appear via the fallback loop
    const edges = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'A' },
    ];
    const result = applyTreeLayout(nodes, edges, 0);

    expect(result.has('A')).toBe(true);
    expect(result.has('B')).toBe(true);
    expect(result.has('C')).toBe(true);
    expect(result.size).toBe(3);
  });

  it('property-height estimation: tall first root pushes second root lower', () => {
    // Case 1: A has 3 properties
    const nodesWithProps = [
      { id: 'A', data: { properties: [{}, {}, {}] } },
      { id: 'B' },
    ];
    const resultWithProps = applyTreeLayout(nodesWithProps, [], 0);
    const yB_withProps = resultWithProps.get('B')!.y;

    // Case 2: A has no properties
    const nodesNoProps = [{ id: 'A' }, { id: 'B' }];
    const resultNoProps = applyTreeLayout(nodesNoProps, [], 0);
    const yB_noProps = resultNoProps.get('B')!.y;

    expect(yB_withProps).toBeGreaterThan(yB_noProps);
  });
});
