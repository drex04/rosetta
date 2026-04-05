import { describe, it, expect, beforeEach } from 'vitest';
import { useMappingStore } from '@/store/mappingStore';
import type { MappingGroup, Mapping } from '@/types/index';

// Helper to reset store between tests
function resetStore() {
  useMappingStore.getState().reset();
}

// Helper to add a mapping and return its id
function addMapping(
  overrides: Partial<
    Parameters<(typeof useMappingStore.getState)['prototype']['addMapping']>[0]
  > = {},
) {
  return useMappingStore.getState().addMapping({
    sourceId: 'src1',
    sourceClassUri: 'ex:Person',
    sourcePropUri: 'ex:firstName',
    targetClassUri: 'nato:Entity',
    targetPropUri: 'nato:name',
    sourceHandle: 'prop_firstName',
    targetHandle: 'target_prop_name',
    kind: 'direct',
    ...overrides,
  });
}

describe('MappingGroup store', () => {
  beforeEach(() => {
    resetStore();
  });

  it('createGroup sets groupId on member mappings and returns a group ID', () => {
    const id1 = addMapping({ sourcePropUri: 'ex:firstName' });
    const id2 = addMapping({ sourcePropUri: 'ex:lastName' });

    const groupId = useMappingStore
      .getState()
      .createGroup('src1', [id1, id2], 'concat');

    expect(typeof groupId).toBe('string');
    expect(groupId.length).toBeGreaterThan(0);

    const mappings = useMappingStore.getState().getMappingsForSource('src1');
    const m1 = mappings.find((m) => m.id === id1);
    const m2 = mappings.find((m) => m.id === id2);

    expect(m1?.groupId).toBe(groupId);
    expect(m2?.groupId).toBe(groupId);
  });

  it('createGroup assigns groupOrder 0, 1, 2... to members in order', () => {
    const id1 = addMapping({ sourcePropUri: 'ex:a' });
    const id2 = addMapping({ sourcePropUri: 'ex:b' });
    const id3 = addMapping({ sourcePropUri: 'ex:c' });

    useMappingStore.getState().createGroup('src1', [id1, id2, id3], 'coalesce');

    const mappings = useMappingStore.getState().getMappingsForSource('src1');
    expect(mappings.find((m) => m.id === id1)?.groupOrder).toBe(0);
    expect(mappings.find((m) => m.id === id2)?.groupOrder).toBe(1);
    expect(mappings.find((m) => m.id === id3)?.groupOrder).toBe(2);
  });

  it('ungroupMappings clears groupId/groupOrder from mappings and removes the group', () => {
    const id1 = addMapping({ sourcePropUri: 'ex:x' });
    const id2 = addMapping({ sourcePropUri: 'ex:y' });

    const groupId = useMappingStore
      .getState()
      .createGroup('src1', [id1, id2], 'concat');
    useMappingStore.getState().ungroupMappings(groupId);

    const mappings = useMappingStore.getState().getMappingsForSource('src1');
    expect(mappings.find((m) => m.id === id1)?.groupId).toBeUndefined();
    expect(mappings.find((m) => m.id === id1)?.groupOrder).toBeUndefined();
    expect(mappings.find((m) => m.id === id2)?.groupId).toBeUndefined();

    const groups = useMappingStore.getState().getGroupsForSource('src1');
    expect(groups.find((g) => g.id === groupId)).toBeUndefined();
  });

  it('updateGroup can change strategy and patch fields', () => {
    const id1 = addMapping({ sourcePropUri: 'ex:part1' });
    const id2 = addMapping({ sourcePropUri: 'ex:part2' });

    const groupId = useMappingStore
      .getState()
      .createGroup('src1', [id1, id2], 'concat');

    useMappingStore.getState().updateGroup(groupId, {
      strategy: 'template',
      templatePattern: '{part1} {part2}',
      separator: '-',
    });

    const groups = useMappingStore.getState().getGroupsForSource('src1');
    const updated = groups.find((g) => g.id === groupId);
    expect(updated?.strategy).toBe('template');
    expect(updated?.separator).toBe('-');
    if (updated?.strategy === 'template') {
      expect(updated.templatePattern).toBe('{part1} {part2}');
    }
  });

  it('getMappingsInGroup returns only mappings with the given groupId', () => {
    const id1 = addMapping({ sourcePropUri: 'ex:p1' });
    const id2 = addMapping({ sourcePropUri: 'ex:p2' });
    const id3 = addMapping({ sourcePropUri: 'ex:p3' }); // not in group

    const groupId = useMappingStore
      .getState()
      .createGroup('src1', [id1, id2], 'concat');

    const inGroup = useMappingStore.getState().getMappingsInGroup(groupId);
    expect(inGroup).toHaveLength(2);
    expect(inGroup.map((m) => m.id)).toContain(id1);
    expect(inGroup.map((m) => m.id)).toContain(id2);
    expect(inGroup.map((m) => m.id)).not.toContain(id3);
  });

  it('createGroup produces a group with formulaExpression field (no sparqlConstruct)', () => {
    const id1 = addMapping({
      sourcePropUri: 'http://example.org/ns#firstName',
    });
    const id2 = addMapping({ sourcePropUri: 'http://example.org/ns#lastName' });
    const groupId = useMappingStore
      .getState()
      .createGroup('src1', [id1, id2], 'concat');
    const group = useMappingStore
      .getState()
      .getGroupsForSource('src1')
      .find((g) => g.id === groupId);
    expect(group).toBeDefined();
    expect('sparqlConstruct' in (group ?? {})).toBe(false);
    expect('formulaExpression' in (group ?? {})).toBe(true);
  });

  it('allows grouping mappings with same targetClassUri+targetPropUri (duplicate target detection)', () => {
    // Two mappings targeting the same property — valid to group (e.g. for concat)
    const id1 = addMapping({
      sourcePropUri: 'ex:first',
      targetPropUri: 'nato:name',
    });
    const id2 = addMapping({
      sourcePropUri: 'ex:last',
      targetPropUri: 'nato:name',
    });

    const groupId = useMappingStore
      .getState()
      .createGroup('src1', [id1, id2], 'concat');

    const group = useMappingStore
      .getState()
      .getGroupsForSource('src1')
      .find((g) => g.id === groupId);
    expect(group).toBeDefined();
    expect(group?.targetPropUri).toBe('nato:name');
    expect(group?.targetClassUri).toBe('nato:Entity');

    const members = useMappingStore.getState().getMappingsInGroup(groupId);
    expect(members).toHaveLength(2);
  });
});

describe('clearMappingsForSource', () => {
  beforeEach(resetStore);

  it('also removes groups for the source, leaving no orphaned group records', () => {
    const store = useMappingStore.getState();
    const SOURCE_ID = 'src-clear-test';

    const m1 = store.addMapping({
      sourceId: SOURCE_ID,
      sourceClassUri: 'http://src.test/C',
      sourcePropUri: 'http://src.test/p1',
      targetClassUri: 'http://onto.test/C',
      targetPropUri: 'http://onto.test/p',
      sourceHandle: 'h1',
      targetHandle: 'h2',
      kind: 'direct',
    });
    const m2 = store.addMapping({
      sourceId: SOURCE_ID,
      sourceClassUri: 'http://src.test/C',
      sourcePropUri: 'http://src.test/p2',
      targetClassUri: 'http://onto.test/C',
      targetPropUri: 'http://onto.test/p',
      sourceHandle: 'h3',
      targetHandle: 'h2',
      kind: 'direct',
    });
    store.createGroup(SOURCE_ID, [m1, m2], 'concat');

    expect(store.getGroupsForSource(SOURCE_ID)).toHaveLength(1);

    store.clearMappingsForSource(SOURCE_ID);

    expect(
      useMappingStore.getState().getMappingsForSource(SOURCE_ID),
    ).toHaveLength(0);
    expect(
      useMappingStore.getState().getGroupsForSource(SOURCE_ID),
    ).toHaveLength(0);
  });
});

// ─── Type shape tests ─────────────────────────────────────────────────────────

describe('MappingGroup type shape', () => {
  it('MappingGroup concat variant has formulaExpression, not sparqlConstruct', () => {
    const group: MappingGroup = {
      id: 'g1',
      strategy: 'concat',
      separator: ',',
      targetClassUri: 'http://nato.int/ns#Entity',
      targetPropUri: 'http://nato.int/ns#name',
      formulaExpression: 'CONCAT(a, b)',
    };
    expect(group.formulaExpression).toBe('CONCAT(a, b)');
    expect('sparqlConstruct' in group).toBe(false);
  });

  it('MappingGroup formulaExpression is optional (can be omitted)', () => {
    const group: MappingGroup = {
      id: 'g2',
      strategy: 'coalesce',
      separator: '',
      targetClassUri: 'http://nato.int/ns#Entity',
      targetPropUri: 'http://nato.int/ns#name',
    };
    expect(group.formulaExpression).toBeUndefined();
  });
});

// ─── Unused variable suppression ─────────────────────────────────────────────
// Ensure Mapping import is used to keep TypeScript happy
const _mappingTypeCheck: Mapping = {
  id: 'x',
  sourceId: 's',
  sourceClassUri: 'c',
  sourcePropUri: 'p',
  targetClassUri: 'tc',
  targetPropUri: 'tp',
  sourceHandle: 'sh',
  targetHandle: 'th',
  kind: 'direct',
};
void _mappingTypeCheck;
