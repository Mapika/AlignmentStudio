import { useEffect, useId, useRef, useState } from 'react';
import { AIProvider, getDefaultChatModel, isFreeOpenRouterModel, PROVIDERS, supportsTemperature, type ModelOption } from '../config';
import type { APIKeys, ModelConfig } from '../types';
import { compatibleOptions } from '../services/ai/compatibleService';
import OpenAI from 'openai';
import { readableError } from '../services/ai/request';
import { useAdvanced } from '../hooks/useAdvanced';

interface Props {
  label: string; config: ModelConfig; onChange: (value: ModelConfig) => void;
  models: Record<AIProvider, ModelOption[]>; keys: APIKeys; disabled?: boolean;
  ollamaError?: string | null; refreshOllama: () => void; onOpenSettings?: () => void;
}

export function ModelSelector({ label, config, onChange, models, keys, disabled, ollamaError, refreshOllama, onOpenSettings }: Props) {
  const advanced = useAdvanced();
  const id = useId();
  const [discovered, setDiscovered] = useState<Partial<Record<AIProvider, ModelOption[]>>>({});
  const [status, setStatus] = useState<{ provider: AIProvider; message: string }>();
  const [loading, setLoading] = useState(false);
  const choices = discovered[config.provider] ?? models[config.provider];
  const authored = config.model === 'classroom-authored-example';
  const canDiscover = !!PROVIDERS[config.provider].baseURL || config.provider === AIProvider.Ollama;
  const keyName = PROVIDERS[config.provider].key;
  const hasKey = !keyName || !!keys[keyName]?.trim();
  const ollama = config.provider === AIProvider.Ollama;
  const installed = models[AIProvider.Ollama];
  // Look for local models only when Ollama is actually chosen.
  const asked = useRef(false);
  useEffect(() => { if (ollama && !asked.current) { asked.current = true; refreshOllama(); } }, [ollama, refreshOllama]);
  // Replace the placeholder default with the first installed model once discovery answers.
  const latest = useRef({ config, onChange });
  latest.current = { config, onChange };
  useEffect(() => {
    const { config: current, onChange: change } = latest.current;
    if (current.provider === AIProvider.Ollama && installed.length && current.model === getDefaultChatModel(AIProvider.Ollama) && !installed.some(model => model.id === current.model)) change({ ...current, model: installed[0].id });
  }, [installed]);

  async function discover() {
    if (config.provider === AIProvider.Ollama) { refreshOllama(); return; }
    const provider = config.provider;
    setLoading(true); setStatus(undefined);
    try {
      const client = new OpenAI(compatibleOptions(config, keys));
      const response = await client.models.list();
      const found = response.data.filter(model => provider !== AIProvider.OpenRouter || isFreeOpenRouterModel(model.id))
        .map(model => ({ id: model.id, name: model.id, description: provider === AIProvider.OpenRouter ? 'Free variant' : 'Discovered; verify access' }));
      setDiscovered(previous => ({ ...previous, [provider]: found }));
      setStatus({ provider, message: `${found.length} models found. A listed model may still require payment or lack text-chat support.` });
    } catch (error) { setStatus({ provider, message: readableError(error, provider).message }); }
    finally { setLoading(false); }
  }

  return <fieldset disabled={disabled} className="min-w-0 space-y-3">
    <legend className="mb-3 flex items-center gap-2.5 font-semibold">{/^Candidate [AB]$/.test(label) && <span className={`cand cand-${label.slice(-1)}`} aria-hidden="true">{label.slice(-1)}</span>}{label}</legend>
    {authored && <p className="help text-sm">Authored classroom answer. Choose a real provider and model before generating a new response.</p>}
    <div className="grid grid-cols-1 gap-3">
      <div><label htmlFor={`${id}-provider`} className="text-xs font-medium">Provider</label><select id={`${id}-provider`} className="field min-h-11" aria-label={`${label} provider`} value={config.provider} onChange={event => {
        const provider = event.target.value as AIProvider;
        onChange({ ...config, provider, model: models[provider][0]?.id ?? getDefaultChatModel(provider) });
      }}>{Object.values(AIProvider).map(provider => <option key={provider} value={provider}>{provider === AIProvider.Claude ? 'Anthropic (Claude)' : provider}</option>)}</select></div>
      <div><label htmlFor={`${id}-preset`} className="text-xs font-medium">Model</label><select id={`${id}-preset`} className="field min-h-11" aria-label={`${label} model preset`} value={choices.some(model => model.id === config.model) ? config.model : ''} onChange={event => onChange({ ...config, model: event.target.value === '__custom__' ? '' : event.target.value })}>
        <option value="" disabled>{authored ? 'Choose a model for live inference' : choices.length ? 'Custom model (exact ID below)' : 'No listed models — enter an exact ID below'}</option>
        {choices.map(model => <option key={model.id} value={model.id}>{model.name} — {model.description}</option>)}
        {!authored && <option value="__custom__">Other model (enter ID)…</option>}
      </select></div>
    </div>
    {!advanced && !authored && !choices.some(model => model.id === config.model) && <div><label htmlFor={`${id}-model`} className="text-xs font-medium">Exact model ID</label><input id={`${id}-model`} className="field min-h-11" aria-label={`${label} exact model ID`} value={config.model} spellCheck={false} autoCapitalize="none" placeholder="e.g. meta-llama/llama-3.1-8b-instruct" onChange={event => onChange({ ...config, model: event.target.value })} /></div>}
    {!authored && <p className="key-status">{ollama ? <><span className={`key-dot ${ollamaError ? 'is-missing' : installed.length ? 'is-ok' : ''}`} aria-hidden="true" />{ollamaError ? 'Ollama not reachable' : installed.length ? `Local · ${installed.length} model${installed.length === 1 ? '' : 's'} found` : 'Looking for local models…'}<button type="button" className="text-button ml-2 min-h-0 p-0" onClick={refreshOllama}>Refresh</button></> : keyName ? <><span className={`key-dot ${hasKey ? 'is-ok' : 'is-missing'}`} aria-hidden="true" />{hasKey ? 'Key added' : 'No key yet'}{!hasKey && onOpenSettings && <button type="button" className="text-button ml-2 min-h-0 p-0" onClick={onOpenSettings}>Add in Connections</button>}{hasKey && canDiscover && <button type="button" className="text-button ml-2 min-h-0 p-0" disabled={loading || disabled} onClick={() => void discover()}>{loading ? 'Refreshing…' : 'Refresh model list'}</button>}</> : null}</p>}
    {!advanced && status?.provider === config.provider && <p className="help" role="status">{status.message}</p>}
    <p className="help text-xs leading-relaxed">{PROVIDERS[config.provider].access}.{config.provider === AIProvider.OpenRouter && !isFreeOpenRouterModel(config.model) && <strong className="ml-1 text-amber-800 dark:text-amber-300">This custom model may charge credits.</strong>}</p>
    {config.provider === AIProvider.Ollama && ollamaError && <p className="help" role="status">{ollamaError}</p>}
    {advanced && <details><summary className="min-h-11 text-sm font-medium text-[var(--muted)]">Advanced model settings</summary><div className="space-y-4 pt-2">
      <div><label htmlFor={`${id}-model`} className="text-xs font-medium">Exact model ID</label><input id={`${id}-model`} className="field min-h-11" aria-label={`${label} exact model ID`} value={config.model} spellCheck={false} autoCapitalize="none" onChange={event => onChange({ ...config, model: event.target.value })} /><p className="help mt-2">Use an identifier supported by your provider or an installed Ollama tag. Free access must be checked for custom models.</p></div>
      {canDiscover && <button type="button" className="btn-secondary min-h-11" disabled={loading} onClick={() => void discover()} aria-label={`Refresh ${label} model list`}>{loading ? 'Refreshing…' : 'Refresh model list'}</button>}
      {status?.provider === config.provider && <p className="help" role="status">{status.message}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor={`${id}-temperature`} className="text-xs font-medium">Temperature</label><input id={`${id}-temperature`} aria-label={`${label} temperature`} type="number" min="0" max="1" step="0.1" className="field min-h-11" disabled={!supportsTemperature(config.provider, config.model)} value={config.temperature ?? ''} placeholder="Provider default" onChange={event => onChange({ ...config, temperature: event.target.value === '' ? undefined : Number(event.target.value) })} /></div>
        <div><label htmlFor={`${id}-tokens`} className="text-xs font-medium">Maximum output tokens</label><input id={`${id}-tokens`} aria-label={`${label} maximum output tokens`} type="number" min="256" max="16384" step="256" className="field min-h-11" value={config.maxTokens ?? ''} placeholder="4096 by default" onChange={event => onChange({ ...config, maxTokens: event.target.value === '' ? undefined : Number(event.target.value) })} /></div>
      </div>
      <p className="help leading-relaxed">A lower temperature usually reduces variation without guaranteeing identical results. Blank uses the provider default; this setting is omitted for OpenAI reasoning models. Tokens are pieces of words, and some models count reasoning within the output limit. Unsupported settings may be rejected by a custom model.</p>
    </div></details>}
  </fieldset>;
}
