import { useState, useEffect, useMemo } from 'react';
import type { APIKeys } from '../types';

export const useAPIKeys = () => {
  const [browserApiKeys, setBrowserApiKeys] = useState<APIKeys>(() => {
    try {
      const saved = localStorage.getItem('apiKeys');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const apiKeys: APIKeys = useMemo(() => {
    const envOllama = import.meta.env.OLLAMA_BASE_URL || '';
    return {
      anthropic: browserApiKeys.anthropic || import.meta.env.ANTHROPIC_API_KEY || '',
      openai: browserApiKeys.openai || import.meta.env.OPENAI_API_KEY || '',
      gemini: browserApiKeys.gemini || import.meta.env.GEMINI_API_KEY || '',
      ollama: browserApiKeys.ollama?.trim() || envOllama.trim(),
    };
  }, [browserApiKeys]);

  useEffect(() => {
    localStorage.setItem('apiKeys', JSON.stringify(browserApiKeys));
  }, [browserApiKeys]);

  return { browserApiKeys, apiKeys, setBrowserApiKeys };
};
