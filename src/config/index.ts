// Presets checked on 2026-10-12 against official documentation; see PROVIDERS.md.
export const AIProvider = {
  Gemini: 'Gemini', Groq: 'Groq', OpenRouter: 'OpenRouter', Mistral: 'Mistral',
  Ollama: 'Ollama', OpenAI: 'OpenAI', Claude: 'Claude',
} as const;
export type AIProvider = typeof AIProvider[keyof typeof AIProvider];
export type KeyName = 'gemini' | 'groq' | 'openrouter' | 'mistral' | 'openai' | 'anthropic';
export interface ModelOption { id: string; name: string; description: string }
export interface ProviderPreset { key?: KeyName; baseURL?: string; access: string; docs: string }
export const PROVIDERS: Record<AIProvider, ProviderPreset> = {
  Gemini: { key: 'gemini', access: 'Free tier available; account quotas apply', docs: 'https://ai.google.dev/gemini-api/docs/pricing' },
  Groq: { key: 'groq', baseURL: 'https://api.groq.com/openai/v1', access: 'Free plan available; account quotas apply', docs: 'https://console.groq.com/docs/rate-limits' },
  OpenRouter: { key: 'openrouter', baseURL: 'https://openrouter.ai/api/v1', access: 'Only :free models or the free router are free', docs: 'https://openrouter.ai/docs/api/reference/limits' },
  Mistral: { key: 'mistral', baseURL: 'https://api.mistral.ai/v1', access: 'Free developer mode; check account model access', docs: 'https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key' },
  Ollama: { access: 'Local inference; no API key', docs: 'https://docs.ollama.com/faq' },
  OpenAI: { key: 'openai', baseURL: 'https://api.openai.com/v1', access: 'Paid API credits may be required', docs: 'https://developers.openai.com/api/docs/pricing' },
  Claude: { key: 'anthropic', access: 'Paid API credits may be required', docs: 'https://platform.claude.com/docs/en/about-claude/pricing' },
};
const model = (id: string, name: string, description: string): ModelOption => ({ id, name, description });
export const AVAILABLE_MODELS: Record<AIProvider, ModelOption[]> = {
  Gemini: [model('gemini-3.5-flash-lite', 'Gemini 3.5 Flash-Lite', 'Free tier'), model('gemini-3.8-flash', 'Gemini 3.8 Flash', 'Free tier'), model('gemini-3.1-flash-lite', 'Gemini 3.1 Flash-Lite', 'Free tier')],
  Groq: [model('openai/gpt-oss-120b', 'GPT-OSS 120B', 'Free plan'), model('openai/gpt-oss-20b', 'GPT-OSS 20B', 'Free plan'), model('qwen/qwen3.8-27b', 'Qwen 3.8 27B', 'Free plan')],
  OpenRouter: [model('google/gemma-4-31b-it:free', 'Gemma 4 31B :free', 'Free; availability varies'), model('nvidia/nemotron-3-super-120b-a12b:free', 'Nemotron 3 Super 120B :free', 'Free; availability varies'), model('openrouter/free', 'Free router', 'Free; underlying model varies')],
  Mistral: [model('mistral-small-latest', 'Mistral Small', 'Free developer mode; rolling alias')],
  Ollama: [],
  OpenAI: [model('gpt-5.4-mini', 'GPT-5.4 mini', 'Paid API')],
  Claude: [model('claude-haiku-4-5', 'Claude Haiku 4.5', 'Paid API'), model('claude-sonnet-4-5', 'Claude Sonnet 4.5', 'Paid API')],
};
export const getDefaultChatModel = (provider: AIProvider) => AVAILABLE_MODELS[provider][0]?.id ?? 'qwen3.5:2b';
export const getDefaultAnalysisModel = getDefaultChatModel;
export const getModelDisplayName = (provider: AIProvider, id: string) => AVAILABLE_MODELS[provider].find(m => m.id === id)?.name ?? id;
export const isFreeOpenRouterModel = (id: string) => id.endsWith(':free') || id === 'openrouter/free';
export function supportsTemperature(provider: AIProvider, id: string) {
  return !(provider === AIProvider.OpenAI && /^(gpt-[56]|o[134])/.test(id));
}
export function resolveOllamaBaseUrl(value = '') {
  const url = new URL(value.trim() || 'http://localhost:11434/v1');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Use an HTTP(S) Ollama URL without credentials, query parameters, or fragments.');
  }
  url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/v1$/, '') + '/v1';
  return url.toString().replace(/\/$/, '');
}
