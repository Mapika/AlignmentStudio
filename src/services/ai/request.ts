import type { GenerationMetadata, ModelConfig, StreamCallback } from '../../types';

export interface Message { role: 'user' | 'assistant'; content: string }
export interface RetryNotice { attempt: number; maxAttempts: number; waitMs: number; reason: 'rate limit' | 'provider outage' }
export interface AIRequest {
  config: ModelConfig;
  system: string;
  messages: Message[];
  schema?: Record<string, unknown>;
  onChunk?: StreamCallback;
  /** Called before each automatic retry so the page can show what is happening. */
  onRetry?: (notice: RetryNotice) => void;
  signal?: AbortSignal;
}

// Rate limits and provider outages are retried a little, visibly, and only before
// any text has arrived. Everything else fails immediately so request counts stay honest.
export const retryPolicy = { maxAttempts: 3, delaysMs: [3_000, 8_000], maxWaitMs: 20_000 };
export function errorStatus(error: unknown): number {
  return typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 0;
}
export function isRetryable(error: unknown): RetryNotice['reason'] | null {
  const status = errorStatus(error);
  if (status === 429) return 'rate limit';
  if (status === 408 || status === 502 || status === 503 || status === 504) return 'provider outage';
  return null;
}
export function retryWait(error: unknown, retryIndex: number): number {
  const headers = typeof error === 'object' && error !== null && 'headers' in error ? (error as { headers?: unknown }).headers : undefined;
  const raw = headers instanceof Headers ? headers.get('retry-after') : typeof headers === 'object' && headers !== null ? (headers as Record<string, unknown>)['retry-after'] : undefined;
  const seconds = Number(raw);
  const fallback = retryPolicy.delaysMs[Math.min(retryIndex, retryPolicy.delaysMs.length - 1)] ?? 0;
  return Math.min(Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : fallback, retryPolicy.maxWaitMs);
}
export interface AIResponse extends GenerationMetadata { text: string; resolvedModel?: string }

export function completionMetadata(reason?: string | null): NonNullable<GenerationMetadata['completion']> {
  if (!reason) return { status: 'unknown' };
  const normalized = reason.toLowerCase();
  const status = ['stop', 'end_turn', 'stop_sequence', 'tool_use', 'tool_calls', 'function_call'].includes(normalized) ? 'complete'
    : ['length', 'max_tokens', 'model_context_window_exceeded'].includes(normalized) ? 'truncated'
    : ['content_filter', 'refusal', 'safety', 'recitation', 'blocklist', 'prohibited_content', 'spii', 'image_safety', 'image_prohibited_content'].includes(normalized) ? 'blocked'
    : 'unknown';
  return { status, reason };
}

export function tokenUsage(input?: number | null, output?: number | null): GenerationMetadata['usage'] {
  const inputTokens = typeof input === 'number' && Number.isFinite(input) && input >= 0 ? input : undefined;
  const outputTokens = typeof output === 'number' && Number.isFinite(output) && output >= 0 ? output : undefined;
  return inputTokens === undefined && outputTokens === undefined ? undefined : { inputTokens, outputTokens };
}

// The provider's own explanation (from the JSON error body), with anything that
// looks like a credential or a URL removed. The SDK's top-level message is never shown.
function providerDetail(error: unknown): string {
  const body = typeof error === 'object' && error !== null && 'error' in error ? (error as { error?: unknown }).error : undefined;
  const raw = typeof body === 'object' && body !== null && 'message' in body ? String((body as { message: unknown }).message) : '';
  return raw.replace(/\b(sk|key|token)[-_][A-Za-z0-9_-]{6,}/gi, '[redacted]').replace(/https?:\/\/\S+/g, '[link]').replace(/\s+/g, ' ').trim().slice(0, 220);
}
export function readableError(error: unknown, provider: string): Error {
  const status = errorStatus(error);
  // Do not display raw SDK errors: they can contain request URLs or credentials.
  let hint = 'Request failed. Check connectivity and browser CORS permissions.';
  if (error instanceof Error && error.name === 'AbortError') hint = 'Request cancelled or timed out. No automatic retry was made.';
  else if (status === 401 || status === 403) hint = 'Authentication or access denied. Check your personal API key, region, and model access in Settings.';
  else if (status === 429) hint = provider === 'Ollama'
    ? 'Local server is at capacity or rate limited. Wait for active requests to finish, then try again.'
    : 'Rate limit or free quota exhausted, even after waiting and retrying. Wait a minute, or choose another model.';
  else if (status === 402) hint = 'Credits required or quota exhausted. Choose a :free model, a free-tier account, or Ollama.';
  else if (status === 404) hint = 'Model or endpoint unavailable. Refresh the model list or check the exact model identifier.';
  else if (status === 400 || status === 422) hint = 'Unsupported model, generation setting, structured output, or context too long. Check the model ID; try disabling structured output or shortening the scenario.';
  else if (status >= 500) hint = 'Provider temporarily unavailable. Try again later or choose another model.';
  else if (provider === 'Ollama') hint = 'Cannot reach Ollama. Start Ollama, check the endpoint and allowed browser origin, and install the selected model.';
  const detail = providerDetail(error);
  if (provider === 'OpenRouter' && status === 404 && /data policy|privacy|publication/i.test(detail))
    hint = 'No free endpoint matches your OpenRouter privacy settings. On openrouter.ai open Settings → Privacy and allow the free-model endpoints, then try again.';
  return new Error(`${provider}: ${hint}${detail ? ` Provider message: “${detail}”` : ''}`);
}
