import { useState, useEffect, useCallback } from 'react';
import type { APIKeys } from '../types';
import { PROVIDERS } from '../config';

const SESSION_KEYS = 'alignment-api-keys-session-v1';
const REMEMBER_KEYS = 'alignment-remember-api-keys-v1';
function cleanKeys(data: unknown): APIKeys {
  const keys: APIKeys = {};
  if (!data || typeof data !== 'object') return keys;
  const source = data as Record<string, unknown>;
  for (const key of [...Object.values(PROVIDERS).flatMap(p => p.key ? [p.key] : []), 'ollama'] as (keyof APIKeys)[]) {
    if (typeof source[key] === 'string') keys[key] = source[key];
  }
  return keys;
}

export function readAPIKeyState(persistent: Pick<Storage, 'getItem'>, session: Pick<Storage, 'getItem'>) {
    try {
      const saved = cleanKeys(JSON.parse(persistent.getItem('apiKeys') || '{}'));
      const preference = persistent.getItem(REMEMBER_KEYS);
      // Preserve an existing user's explicitly stored keys on migration.
      const remember = preference === 'true' || (preference === null && Object.values(saved).some(Boolean));
      const keys = remember ? saved : cleanKeys(JSON.parse(session.getItem(SESSION_KEYS) || '{}'));
      return { keys, remember };
    } catch { return { keys: {}, remember: false }; }
}

export const useAPIKeys = () => {
  const [initial] = useState(() => {
    try { return readAPIKeyState(localStorage, sessionStorage); }
    catch { return { keys: {}, remember: false }; }
  });
  const [browserApiKeys, setBrowserApiKeys] = useState<APIKeys>(initial.keys);
  const [rememberKeys, setRemember] = useState(initial.remember);
  const [keyStorageError, setKeyStorageError] = useState('');
  useEffect(() => {
    try {
      if (rememberKeys) localStorage.setItem('apiKeys', JSON.stringify(browserApiKeys));
      else sessionStorage.setItem(SESSION_KEYS, JSON.stringify(browserApiKeys));
      setKeyStorageError('');
    }
    catch { setKeyStorageError('Browser storage is unavailable. Keys work for this session only.'); }
  }, [browserApiKeys, rememberKeys]);
  const setRememberKeys = useCallback((remember: boolean) => {
    setRemember(remember);
    try {
      localStorage.setItem(REMEMBER_KEYS, String(remember));
      if (!remember) localStorage.removeItem('apiKeys');
      else sessionStorage.removeItem(SESSION_KEYS);
    } catch { setKeyStorageError('The key storage preference could not be saved. Keys still work in this session.'); }
  }, []);
  const clearAPIKeys = useCallback(() => {
    setBrowserApiKeys({});
    try { localStorage.removeItem('apiKeys'); sessionStorage.removeItem(SESSION_KEYS); }
    catch { setKeyStorageError('Could not clear stored keys. Clear this site’s storage in your browser settings.'); }
  }, []);
  return { browserApiKeys, apiKeys: browserApiKeys, setBrowserApiKeys, rememberKeys, setRememberKeys, clearKeys: clearAPIKeys, keyStorageError };
};
