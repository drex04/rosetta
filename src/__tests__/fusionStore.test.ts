import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFusionStore, subscribeFusionToMappings } from '@/store/fusionStore';
import { useMappingStore } from '@/store/mappingStore';

vi.mock('@/lib/rmlExecute', () => ({
  executeAllRml: vi.fn(),
}));

vi.mock('@/store/sourcesStore', () => ({
  useSourcesStore: {
    getState: () => ({ sources: [] }),
  },
}));

import { executeAllRml } from '@/lib/rmlExecute';
const mockExecute = executeAllRml as ReturnType<typeof vi.fn>;

beforeEach(() => {
  useFusionStore.getState().reset();
  vi.clearAllMocks();
});

describe('useFusionStore — initial state', () => {
  it('starts with null result and not loading', () => {
    const s = useFusionStore.getState();
    expect(s.result).toBeNull();
    expect(s.jsonLd).toBeNull();
    expect(s.loading).toBe(false);
    expect(s.stale).toBe(false);
    expect(s.error).toBeNull();
    expect(s.lastRun).toBeNull();
  });
});

describe('useFusionStore — setStale', () => {
  it('sets stale to true', () => {
    useFusionStore.getState().setStale(true);
    expect(useFusionStore.getState().stale).toBe(true);
  });

  it('sets stale to false', () => {
    useFusionStore.getState().setStale(true);
    useFusionStore.getState().setStale(false);
    expect(useFusionStore.getState().stale).toBe(false);
  });
});

describe('useFusionStore — reset', () => {
  it('clears all state', () => {
    useFusionStore.setState({ stale: true, error: 'oops', lastRun: 123 });
    useFusionStore.getState().reset();
    const s = useFusionStore.getState();
    expect(s.result).toBeNull();
    expect(s.stale).toBe(false);
    expect(s.error).toBeNull();
    expect(s.lastRun).toBeNull();
  });
});

describe('useFusionStore — runFusion', () => {
  it('sets result and jsonLd on success', async () => {
    const fakeResult = { nquads: '<s> <p> <o> .', jsonLd: { '@graph': [] } };
    mockExecute.mockResolvedValueOnce(fakeResult);

    await useFusionStore.getState().runFusion();

    const s = useFusionStore.getState();
    expect(s.result).toEqual(fakeResult);
    expect(s.jsonLd).toEqual(fakeResult.jsonLd);
    expect(s.loading).toBe(false);
    expect(s.stale).toBe(false);
    expect(s.error).toBeNull();
    expect(s.lastRun).toBeGreaterThan(0);
  });

  it('sets error on failure', async () => {
    mockExecute.mockRejectedValueOnce(new Error('RML failed'));

    await useFusionStore.getState().runFusion();

    const s = useFusionStore.getState();
    expect(s.error).toBe('RML failed');
    expect(s.loading).toBe(false);
    expect(s.result).toBeNull();
    expect(s.lastRun).toBeGreaterThan(0);
  });

  it('handles non-Error thrown value', async () => {
    mockExecute.mockRejectedValueOnce('string error');

    await useFusionStore.getState().runFusion();

    expect(useFusionStore.getState().error).toBe('Fusion failed');
  });

  it('skips if already loading', async () => {
    useFusionStore.setState({ loading: true });
    await useFusionStore.getState().runFusion();
    expect(mockExecute).not.toHaveBeenCalled();
  });
});

describe('subscribeFusionToMappings', () => {
  it('marks fusion stale when mappings change', () => {
    const unsub = subscribeFusionToMappings();
    useFusionStore.getState().setStale(false);

    // Trigger a mapping store change
    useMappingStore.setState({ mappings: [] });

    expect(useFusionStore.getState().stale).toBe(true);
    unsub();
  });

  it('returns an unsubscribe function', () => {
    const unsub = subscribeFusionToMappings();
    expect(typeof unsub).toBe('function');
    unsub();
    // After unsubscribing, changes should not mark stale
    useFusionStore.getState().setStale(false);
    useMappingStore.setState({ mappings: [] });
    // stale remains false since we unsubscribed
    expect(useFusionStore.getState().stale).toBe(false);
  });
});
