import { useState, useEffect, useCallback } from 'react';
import type { APIKeys } from '../types';
import { resolveOllamaBaseUrl, type ModelOption } from '../config';

export const useOllamaModels = (apiKeys: APIKeys) => {
  const [ollamaModels, setOllamaModels] = useState<ModelOption[]>([]);
  const [ollamaModelError, setOllamaModelError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [enabled, setEnabled] = useState(!!apiKeys.ollama);
  const refreshOllamaModels = useCallback(() => { setEnabled(true); setRevision(v => v + 1); }, []);
  useEffect(() => {
    if (!enabled && !apiKeys.ollama) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let active = true;
    (async () => {
      try {
        const response = await fetch(resolveOllamaBaseUrl(apiKeys.ollama) + '/models', { signal: controller.signal, redirect: 'error' });
        if (!response.ok) throw new Error('Ollama discovery failed.');
        const payload: { data?: { id?: unknown }[] } = await response.json();
        const models = (payload.data ?? []).filter((e): e is { id: string } => typeof e.id === 'string')
          .map(e => ({ id: e.id, name: e.id, description: e.id.includes('cloud') ? 'Cloud-backed Ollama model; may require sign-in' : 'Installed Ollama model' }));
        if (active) { setOllamaModels(models); setOllamaModelError(models.length ? null : 'No installed models found. Pull a model in Ollama, then refresh.'); }
      } catch {
        if (active) { setOllamaModels([]); setOllamaModelError('Ollama unavailable. Start it, check Settings and browser origin permissions, then refresh. You can also type an installed model ID.'); }
      } finally { clearTimeout(timer); }
    })();
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [apiKeys.ollama, revision, enabled]);
  return { ollamaModels, ollamaModelError, refreshOllamaModels };
};
