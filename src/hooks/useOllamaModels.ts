import { useState, useEffect } from 'react';
import type { APIKeys } from '../types';
import type { ModelOption } from '../config';
import { AIProvider, AVAILABLE_MODELS } from '../config';

export const useOllamaModels = (apiKeys: APIKeys) => {
  const [ollamaModels, setOllamaModels] = useState<ModelOption[]>(AVAILABLE_MODELS[AIProvider.Ollama]);
  const [ollamaModelError, setOllamaModelError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const configuredUrl = apiKeys.ollama && apiKeys.ollama.trim() !== '' ? apiKeys.ollama.trim() : 'http://localhost:11434/v1';
    const baseUrl = configuredUrl.endsWith('/') ? configuredUrl.slice(0, -1) : configuredUrl;

    const fetchModels = async () => {
      try {
        setOllamaModelError(null);
        const response = await fetch(`${baseUrl}/models`);
        if (!response.ok) {
          throw new Error(`Failed to load models (status ${response.status})`);
        }
        const payload = await response.json();
        const models: ModelOption[] = Array.isArray(payload?.data)
          ? payload.data
              .map((entry: any) => (typeof entry?.id === 'string' ? entry.id : null))
              .filter((id: string | null): id is string => Boolean(id))
              .map((id: string): ModelOption => ({
                id,
                name: id,
                description: 'Model provided by the local Ollama instance',
              }))
          : [];
        if (!isCancelled) {
          setOllamaModels(models);
          if (models.length === 0) {
            setOllamaModelError('No models returned by the Ollama endpoint. Run `ollama list` to confirm availability.');
          }
        }
      } catch (error) {
        console.error('Failed to load Ollama models:', error);
        if (!isCancelled) {
          setOllamaModelError(error instanceof Error ? error.message : 'Unknown error');
          setOllamaModels((prev) => (prev.length ? prev : []));
        }
      }
    };

    fetchModels();

    return () => {
      isCancelled = true;
    };
  }, [apiKeys.ollama]);

  return { ollamaModels, ollamaModelError, setOllamaModelError };
};
