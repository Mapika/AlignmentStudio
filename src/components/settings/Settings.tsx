import { useId, useState } from 'react';
import type { APIKeys } from '../../types';
import { PROVIDERS, AIProvider, resolveOllamaBaseUrl } from '../../config';

interface SettingsProps {
  tempKeys: APIKeys; onTempKeysChange: (keys: APIKeys) => void;
  rememberKeys: boolean; onRememberChange: (remember: boolean) => void;
  onSave: () => void; onClear: () => void;
}

export function Settings({ tempKeys, onTempKeysChange, rememberKeys, onRememberChange, onSave, onClear }: SettingsProps) {
  const inputId = useId();
  const [showKeys, setShowKeys] = useState(false);
  const [provider, setProvider] = useState<AIProvider>(AIProvider.Gemini);
  const preset = PROVIDERS[provider];
  let endpointError = '';
  try { resolveOllamaBaseUrl(tempKeys.ollama); }
  catch { endpointError = 'Enter an HTTP or HTTPS server URL without credentials, query parameters, or a fragment.'; }

  return <form onSubmit={event => { event.preventDefault(); if (!endpointError) onSave(); }}>
    <header className="page-header"><div><span className="eyebrow">Settings</span><h1 className="mt-3">Connections</h1><p>Add your own provider key or connect to local Ollama. Only configure what you need.</p></div></header>
    <section className="section" aria-labelledby={`${inputId}-cloud`}>
      <div className="section-head"><h2 id={`${inputId}-cloud`} className="section-title">Cloud provider</h2><p className="help">Bring your own key. Free tiers are enough for the assignment.</p></div>
      <div className="section-body">
      <label className="block text-sm">Configure provider<select className="field min-h-11" value={provider} onChange={event => setProvider(event.target.value as AIProvider)}>{Object.values(AIProvider).filter(value => value !== AIProvider.Ollama).map(value => <option key={value} value={value}>{value === AIProvider.Claude ? 'Anthropic (Claude)' : value}{tempKeys[PROVIDERS[value].key!] ? ' · key added' : ''}</option>)}</select></label>
      <div><label htmlFor={`${inputId}-key`} className="text-sm">{provider === AIProvider.Claude ? 'Anthropic (Claude)' : provider} API key</label><input id={`${inputId}-key`} className="field min-h-11" type={showKeys ? 'text' : 'password'} autoComplete="off" autoCapitalize="none" spellCheck={false} value={tempKeys[preset.key!] ?? ''} onChange={event => onTempKeysChange({ ...tempKeys, [preset.key!]: event.target.value.trim() })} aria-describedby={`${inputId}-key-help`} placeholder="Optional — add your own key" /></div>
      <div className="flex flex-wrap items-center justify-between gap-3"><p id={`${inputId}-key-help`} className="help">{preset.access}. <a href={preset.docs} target="_blank" rel="noreferrer">Access details ↗</a></p><label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={showKeys} onChange={event => setShowKeys(event.target.checked)} />Show API keys</label></div>
      <p className="help">Changing this selector keeps keys entered for other providers. Saving applies all changes.</p>
      </div>
    </section>
    <section className="section" aria-labelledby={`${inputId}-local`}>
      <div className="section-head"><h2 id={`${inputId}-local`} className="section-title">Local Ollama</h2><p className="help">Run models on this computer. No key needed.</p></div>
      <div className="section-body gap-2">
      <div><label htmlFor={`${inputId}-endpoint`} className="text-sm">Ollama endpoint</label><input id={`${inputId}-endpoint`} className="field min-h-11" type="url" spellCheck={false} autoCapitalize="none" value={tempKeys.ollama ?? ''} placeholder="http://localhost:11434/v1" onChange={event => onTempKeysChange({ ...tempKeys, ollama: event.target.value })} aria-invalid={!!endpointError} aria-describedby={`${inputId}-endpoint-help`} /></div>
      <p id={`${inputId}-endpoint-help`} className={endpointError ? 'error' : 'help'} role={endpointError ? 'alert' : undefined}>{endpointError || 'No key needed. Blank uses http://localhost:11434/v1; the /v1 suffix is optional. Keep Ollama running with a local model installed.'}</p>
      </div>
    </section>
    <details className="fold"><summary className="min-h-11">Storage, privacy & connection help</summary><div className="space-y-4 py-3">
      <label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={rememberKeys} onChange={event => onRememberChange(event.target.checked)} /><span>Remember keys on this browser<span className="help mt-1 block">{rememberKeys ? 'Keys persist in local storage until you clear them. Use only on a trusted browser profile.' : 'Keys use session storage. Clear them explicitly before leaving a shared computer.'}</span></span></label>
      <p className="help">Scripts on this site and people using this browser profile can access stored keys. API-key configuration is excluded from experiment exports. Cloud providers receive the prompts and answers needed for each request. Use fictional data.</p>
      <p className="help">Use only a trusted Ollama endpoint: scenario text goes to that address, but cloud credentials do not. Hosted pages may need local-network permission and an OLLAMA_ORIGINS setting. If a connection is blocked, run AlignmentStudio on localhost. See the README for setup.</p>
      <button type="button" className="text-button is-danger" onClick={() => { if (confirm('Clear every saved key and the Ollama endpoint on this browser?')) onClear(); }}>Clear all connections</button>
    </div></details>
    <div className="flex flex-wrap items-center gap-4 border-t border-[var(--line)] pt-6"><button type="submit" className="btn min-h-11" disabled={!!endpointError}>Save connections</button><span className="help text-xs">{rememberKeys ? 'Keys remembered on this browser' : 'Keys kept for this session'}</span></div>
  </form>;
}
