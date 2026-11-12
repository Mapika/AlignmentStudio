import { describe, expect, it, vi } from 'vitest';
import { createExperimentStore, EXPERIMENT_RECORD_PREFIX } from '../src/utils/experimentStorage';
import { experiment } from './fixtures';
import { readAPIKeyState } from '../src/hooks/useAPIKeys';

class MemoryStorage implements Storage {
  data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, value); }
}
const recordKeys = (storage: MemoryStorage) => [...storage.data.keys()].filter(key => key.startsWith(EXPERIMENT_RECORD_PREFIX));

describe('experiment checkpoint storage', () => {
  it('migrates legacy runs once without deleting the backup', () => {
    const storage = new MemoryStorage();
    const original = JSON.stringify([experiment()]); storage.setItem('alignment-experiments-v2', original);
    const store = createExperimentStore(vi.fn(), { storage });
    expect(store.load()).toHaveLength(1); expect(store.load()).toHaveLength(1);
    expect(recordKeys(storage)).toHaveLength(1);
    expect(storage.getItem('alignment-experiments-v2')).toBe(original);
  });
  it('preserves records written independently by two tabs', async () => {
    const storage = new MemoryStorage();
    const first = createExperimentStore(vi.fn(), { storage }); const second = createExperimentStore(vi.fn(), { storage });
    first.load(); second.load();
    await first.save(experiment()); await second.save({ ...experiment(), id: 'second-run' });
    expect(first.load().map(run => run.id).sort()).toEqual(['experiment-1', 'second-run']);
  });
  it('forks stale same-ID edits and preserves both versions', async () => {
    const storage = new MemoryStorage(); const warn = vi.fn();
    const first = createExperimentStore(vi.fn(), { storage }); await first.save(experiment());
    const second = createExperimentStore(warn, { storage }); const stale = second.load()[0];
    await first.save({ ...experiment(), userPrompt: 'First tab update' });
    const recovered = await second.save({ ...stale, userPrompt: 'Second tab update' });
    expect(recovered.id).not.toBe(stale.id);
    expect(second.load().map(run => run.userPrompt)).toEqual(expect.arrayContaining(['First tab update', 'Second tab update']));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Another tab'));
    const continued = await second.save({ ...stale, userPrompt: 'Second tab continued' });
    expect(continued.id).toBe(recovered.id);
    expect(second.load()).toHaveLength(2);
  });
  it('writes the next checkpoint before removing its predecessor', async () => {
    const storage = new MemoryStorage(); const warn = vi.fn(); const store = createExperimentStore(warn, { storage });
    await store.save(experiment());
    const priorKey = recordKeys(storage)[0];
    storage.setItem = () => { throw new Error('quota exceeded'); };
    await store.save({ ...experiment(), userPrompt: 'Unsaved update' });
    expect(storage.getItem(priorKey)).toBeTruthy();
    expect(store.load()[0].userPrompt).toBe(experiment().userPrompt);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not be saved'));
  });
  it('recovers terminal interrupted work while retaining completed answers', async () => {
    const storage = new MemoryStorage(); const store = createExperimentStore(vi.fn(), { storage }); const exp = experiment();
    exp.panelB.chatHistory[1] = { role: 'model', content: 'Partial output', isStreaming: true };
    await store.save(exp);
    const restored = createExperimentStore(vi.fn(), { storage }).load()[0];
    expect(restored.panelA.chatHistory[1].content).toBe('Wait for approval.');
    expect(restored.panelB.chatHistory[1]).toMatchObject({ content: 'Partial output', error: expect.stringContaining('Interrupted') });
    expect(exp.panelB.chatHistory[1].isStreaming).toBe(true);
  });
  it('keeps malformed records intact while loading readable records', async () => {
    const storage = new MemoryStorage(); const warn = vi.fn(); const store = createExperimentStore(warn, { storage });
    await store.save(experiment());
    storage.setItem(`${EXPERIMENT_RECORD_PREFIX}broken`, 'do not destroy');
    expect(store.load()).toHaveLength(1);
    expect(storage.getItem(`${EXPERIMENT_RECORD_PREFIX}broken`)).toBe('do not destroy');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not be read'));
  });
  it('recovers both siblings from an unobserved simultaneous revision race', async () => {
    const storage = new MemoryStorage(); const store = createExperimentStore(vi.fn(), { storage });
    await store.save(experiment());
    const key = recordKeys(storage)[0]; const envelope = JSON.parse(storage.getItem(key)!);
    storage.setItem(`${EXPERIMENT_RECORD_PREFIX}concurrent-revision`, JSON.stringify({ ...envelope, revision: 'other-writer', experiment: { ...envelope.experiment, userPrompt: 'Concurrent answer' } }));
    const recovered = store.load();
    expect(recovered).toHaveLength(2);
    expect(new Set(recovered.map(run => run.id)).size).toBe(2);
    expect(recovered.map(run => run.userPrompt)).toContain('Concurrent answer');
  });
  it('compacts sequential checkpoints to one record per run', async () => {
    const storage = new MemoryStorage(); const store = createExperimentStore(vi.fn(), { storage });
    for (let i = 0; i < 4; i++) await store.save({ ...experiment(), userPrompt: `Step ${i}` });
    expect(recordKeys(storage)).toHaveLength(1); expect(store.load()[0].userPrompt).toBe('Step 3');
  });
});

describe('credential storage preferences', () => {
  it('defaults to session-only and restores tab-session keys', () => {
    const persistent = new MemoryStorage(); const session = new MemoryStorage();
    session.setItem('alignment-api-keys-session-v1', JSON.stringify({ gemini: 'session-secret', arbitrary: 'ignored' }));
    expect(readAPIKeyState(persistent, session)).toEqual({ keys: { gemini: 'session-secret' }, remember: false });
    expect(persistent.length).toBe(0);
  });
  it('retains legacy saved credentials until the user opts out', () => {
    const persistent = new MemoryStorage(); const session = new MemoryStorage();
    persistent.setItem('apiKeys', JSON.stringify({ groq: 'saved-secret' }));
    expect(readAPIKeyState(persistent, session)).toEqual({ keys: { groq: 'saved-secret' }, remember: true });
    persistent.setItem('alignment-remember-api-keys-v1', 'false');
    expect(readAPIKeyState(persistent, session)).toEqual({ keys: {}, remember: false });
  });
});
