import type { Experiment } from '../types';
import { cleanExperiment, importExperiments } from './experiments';

export const EXPERIMENT_RECORD_PREFIX = 'alignment-experiment-record-v1:';
const LEGACY_KEY = 'alignment-experiments-v2';
const MIGRATED_KEY = 'alignment-experiment-record-migrated-v1';
interface Envelope { revision: string; updatedAt: number; experiment: Experiment }
interface StoredRecord extends Envelope { key: string }
interface StoreOptions {
  storage?: Storage;
  events?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
}

/** A checkpoint is written under a fresh key before its exact predecessor is removed.
 * Concurrent writers therefore cannot overwrite each other's bytes, even without
 * Web Locks. Unobserved changes are recovered as separate runs, never discarded. */
export function createExperimentStore(onWarning: (message: string) => void = () => {}, options: StoreOptions = {}) {
  const expected = new Map<string, string>();
  const recoveredIds = new Map<string, string>();
  const announced = new Set<string>();
  const warn = (message: string) => { if (!announced.has(message)) { announced.add(message); onWarning(message); } };
  const storage = () => options.storage ?? localStorage;
  let pending: Promise<unknown> = Promise.resolve();

  function readRecords(): StoredRecord[] {
    const records: StoredRecord[] = [];
    const backend = storage();
    // Snapshot keys first: another tab may add or remove an entry while reading.
    const keys = Array.from({ length: backend.length }, (_, i) => backend.key(i)).filter((key): key is string => !!key && key.startsWith(EXPERIMENT_RECORD_PREFIX));
    for (const key of keys) {
      const raw = backend.getItem(key);
      if (!raw) continue;
      try {
        const value = JSON.parse(raw) as Partial<Envelope>;
        if (typeof value.revision !== 'string' || typeof value.updatedAt !== 'number' || !Number.isFinite(value.updatedAt)) throw new Error();
        records.push({ key, revision: value.revision, updatedAt: value.updatedAt, experiment: cleanExperiment(value.experiment) });
      } catch { warn('A saved checkpoint could not be read. Its original browser data is preserved; export readable runs as a backup.'); }
    }
    return records;
  }

  function writeRecord(record: Experiment): StoredRecord {
    const revision = crypto.randomUUID();
    const key = `${EXPERIMENT_RECORD_PREFIX}${encodeURIComponent(record.id)}:${revision}`;
    const envelope: Envelope = { revision, updatedAt: Date.now(), experiment: cleanExperiment(record) };
    storage().setItem(key, JSON.stringify(envelope));
    return { key, ...envelope };
  }

  function migrate() {
    const backend = storage();
    if (backend.getItem(MIGRATED_KEY)) return;
    const raw = backend.getItem(LEGACY_KEY);
    if (raw && raw !== '[]') {
      const existingIds = new Set(readRecords().map(record => record.experiment.id));
      // Parse all legacy records before writing. Keep the legacy backup untouched.
      for (const experiment of importExperiments(raw)) {
        if (!existingIds.has(experiment.id)) { writeRecord(experiment); existingIds.add(experiment.id); }
      }
    }
    backend.setItem(MIGRATED_KEY, '1');
  }

  function load(): Experiment[] {
    try {
      try { migrate(); } catch { warn('Some older saved runs could not be migrated. The original browser data is preserved; new checkpoints remain available.'); }
      const records = readRecords().sort((a, b) => b.updatedAt - a.updatedAt || a.revision.localeCompare(b.revision));
      const seen = new Set<string>();
      return records.map(record => {
        let experiment = record.experiment;
        if (seen.has(experiment.id)) {
          experiment = { ...experiment, id: `${experiment.id}-recovered-${record.revision}` };
          warn('Concurrent versions of a run were recovered separately. Review both in the notebook before continuing.');
        }
        seen.add(record.experiment.id);
        // Do not silently adopt another tab's baseline. A later stale edit forks.
        if (!expected.has(experiment.id)) expected.set(experiment.id, record.key);
        return experiment;
      });
    } catch {
      warn('Browser storage is unavailable. Work remains in this session; export JSON to keep it.');
      return [];
    }
  }

  async function save(experiment: Experiment): Promise<Experiment> {
    const operation = pending.then(() => {
      try {
        const recoveryId = recoveredIds.get(experiment.id);
        const current = recoveryId ? { ...experiment, id: recoveryId } : experiment;
        const records = readRecords().filter(record => record.experiment.id === current.id);
        const predecessor = expected.get(current.id);
        const conflict = records.length > 1 || (records.length > 0 && !records.some(record => record.key === predecessor));
        const saved = conflict ? { ...current, id: `${current.id}-recovered-${crypto.randomUUID()}` } : current;
        const entry = writeRecord(saved);
        expected.set(saved.id, entry.key);
        if (conflict) recoveredIds.set(experiment.id, saved.id);
        // Only remove the precise version we observed. A racing writer's fresh key survives.
        if (!conflict && predecessor && predecessor !== entry.key) storage().removeItem(predecessor);
        if (conflict) warn('Another tab changed this run. Your work was saved as a separate recovered run so both versions are kept.');
        return saved;
      } catch {
        warn('A checkpoint could not be saved: browser storage is full or unavailable. Work remains in this session; export JSON now.');
        return experiment;
      }
    });
    pending = operation.catch(() => {});
    return operation;
  }

  function subscribe(listener: () => void) {
    const events = options.events ?? window;
    const handler = ((event: StorageEvent) => {
      if (event.key === null || event.key?.startsWith(EXPERIMENT_RECORD_PREFIX)) listener();
    }) as EventListener;
    events.addEventListener('storage', handler);
    return () => events.removeEventListener('storage', handler);
  }
  return { load, save, subscribe };
}
