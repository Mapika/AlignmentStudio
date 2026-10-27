import { afterEach, describe, expect, it, vi } from 'vitest';
import { AIProvider, AVAILABLE_MODELS, getDefaultChatModel, isFreeOpenRouterModel, PROVIDERS, resolveOllamaBaseUrl } from '../src/config';
import { compatibleBody, compatibleOptions } from '../src/services/ai/compatibleService';
import { buildChatMessages, complete, runChatTestStream, validateModelConfig } from '../src/services/ai';
import { readableError, retryPolicy } from '../src/services/ai/request';
import { experiment } from './fixtures';

afterEach(() => vi.unstubAllGlobals());
describe('provider configuration', () => {
  it('has a default and documented access for every provider', () => {
    for (const provider of Object.values(AIProvider)) {
      expect(getDefaultChatModel(provider)).toBeTruthy();
      expect(PROVIDERS[provider].docs).toMatch(/^https:\/\//);
    }
    expect(AVAILABLE_MODELS.OpenRouter.every(m => isFreeOpenRouterModel(m.id))).toBe(true);
    expect(isFreeOpenRouterModel('vendor/paid')).toBe(false);
    expect(isFreeOpenRouterModel('vendor/model:free')).toBe(true);
  });
  it('normalizes Ollama URLs but rejects credentials and unsafe protocols', () => {
    expect(resolveOllamaBaseUrl('http://localhost:11434/')).toBe('http://localhost:11434/v1');
    expect(resolveOllamaBaseUrl('http://localhost:11434/v1/')).toBe('http://localhost:11434/v1');
    expect(() => resolveOllamaBaseUrl('https://user:secret@example.com')).toThrow();
    expect(() => resolveOllamaBaseUrl('file:///tmp')).toThrow();
  });
  it('never routes a cloud key to a configurable Ollama endpoint', () => {
    const keys = { groq: 'groq-secret', openai: 'openai-secret', ollama: 'http://127.0.0.1:11435' };
    expect(compatibleOptions({ provider: 'Ollama', model: 'test' }, keys).apiKey).toBe('ollama');
    expect(compatibleOptions({ provider: 'Groq', model: 'test' }, keys)).toMatchObject({ apiKey: 'groq-secret', baseURL: 'https://api.groq.com/openai/v1', maxRetries: 0, fetchOptions: { redirect: 'error' } });
  });
  it('omits unsupported temperature and requests schema output for known Groq models', () => {
    expect(compatibleBody({ config: { provider: 'OpenAI', model: 'gpt-5.4-mini', temperature: 0 }, system: 'test', messages: [] }).temperature).toBeUndefined();
    expect(compatibleBody({ config: { provider: 'Groq', model: 'openai/gpt-oss-120b', temperature: 0.2 }, system: 'test', messages: [], schema: { type: 'object' } }).response_format?.type).toBe('json_schema');
  });
  it('requires cloud keys but not local keys and rejects invalid settings', () => {
    expect(() => validateModelConfig({ provider: 'Ollama', model: 'local' }, {})).not.toThrow();
    expect(() => validateModelConfig({ provider: 'Gemini', model: 'cloud' }, {})).toThrow(/Settings/);
    expect(() => validateModelConfig({ provider: 'Ollama', model: 'local', temperature: NaN }, {})).toThrow();
  });
});
describe('mocked provider routing', () => {
  it.each(Object.values(AIProvider))('routes %s to its own API and returns text', async provider => {
    const seen: Request[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init); seen.push(request);
      if (provider === 'Gemini') return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Gemini answer' }] } }], modelVersion: 'gemini-resolved' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (provider === 'Claude') return new Response(JSON.stringify({ id: 'msg1', type: 'message', role: 'assistant', model: 'claude-resolved', content: [{ type: 'text', text: 'Claude answer' }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ id: 'chat1', model: 'resolved-model', choices: [{ message: { role: 'assistant', content: 'Compatible answer' } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));
    const response = await complete({ config: { provider, model: getDefaultChatModel(provider) }, system: 'System', messages: [{ role: 'user', content: 'User' }] }, { gemini: 'gemini-test', anthropic: 'anthropic-test', openai: 'openai-test', groq: 'groq-test', openrouter: 'openrouter-test', mistral: 'mistral-test' });
    expect(response.text).toMatch(/answer/); expect(seen).toHaveLength(1);
    const host = provider === 'Ollama' ? 'localhost' : provider === 'Gemini' ? 'generativelanguage.googleapis.com' : provider === 'Claude' ? 'api.anthropic.com' : new URL(PROVIDERS[provider].baseURL!).hostname;
    expect(new URL(seen[0].url).hostname).toBe(host);
    if (provider === 'Ollama') expect(seen[0].headers.get('authorization')).toBe('Bearer ollama');
  });
  it('streams without an automatic summary request', async () => {
    const fetch = vi.fn(async () => new Response('data: {"model":"local","choices":[{"delta":{"content":"Hello"}}]}\n\ndata: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } }));
    vi.stubGlobal('fetch', fetch); const onChunk = vi.fn();
    const result = await complete({ config: { provider: 'Ollama', model: 'local' }, system: 'test', messages: [{ role: 'user', content: 'test' }], onChunk }, {});
    expect(result.text).toBe('Hello'); expect(onChunk).toHaveBeenCalledWith('Hello'); expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.completion).toEqual({ status: 'unknown' });
  });
  it.each(['Ollama', 'Gemini', 'Claude'] as const)('preserves terminal-only %s streaming stop reasons and token usage', async provider => {
    const compatible = 'data: {"model":"resolved","choices":[{"delta":{"content":"Partial"}}]}\n\ndata: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\ndata: {"choices":[],"usage":{"prompt_tokens":12,"completion_tokens":256}}\n\ndata: [DONE]\n\n';
    const gemini = 'data: {"candidates":[{"content":{"parts":[{"text":"Partial"}]}}],"modelVersion":"resolved"}\n\ndata: {"candidates":[{"finishReason":"MAX_TOKENS"}],"usageMetadata":{"promptTokenCount":12,"candidatesTokenCount":256}}\n\n';
    const claude = 'event: message_start\ndata: {"type":"message_start","message":{"id":"msg1","model":"resolved","content":[],"usage":{"input_tokens":12,"output_tokens":0}}}\n\nevent: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Partial"}}\n\nevent: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"max_tokens"},"usage":{"output_tokens":256}}\n\nevent: message_stop\ndata: {"type":"message_stop"}\n\n';
    const fetch = vi.fn(async () => new Response(provider === 'Gemini' ? gemini : provider === 'Claude' ? claude : compatible, { headers: { 'Content-Type': 'text/event-stream', 'x-request-id': 'request-compatible', 'request-id': 'request-claude' } }));
    vi.stubGlobal('fetch', fetch);
    const result = await complete({ config: { provider, model: 'test' }, system: 'System', messages: [{ role: 'user', content: 'User' }], onChunk: vi.fn() }, { gemini: 'test', anthropic: 'test' });
    expect(result).toMatchObject({ text: 'Partial', resolvedModel: 'resolved', completion: { status: 'truncated' }, usage: { inputTokens: 12, outputTokens: 256 } });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    if (provider === 'Ollama') expect(result.requestId).toBe('request-compatible');
    if (provider === 'Claude') expect(result.requestId).toBe('request-claude');
  });
  it.each([
    ['Ollama', 'stop', 'complete'], ['Ollama', 'content_filter', 'blocked'],
    ['Gemini', 'STOP', 'complete'], ['Gemini', 'SAFETY', 'blocked'],
    ['Claude', 'end_turn', 'complete'], ['Claude', 'refusal', 'blocked'],
  ] as const)('normalizes %s nonstreaming %s without losing the provider reason', async (provider, reason, status) => {
    const payload = provider === 'Gemini' ? { candidates: [{ content: { parts: [{ text: status === 'blocked' ? '' : 'Answer' }] }, finishReason: reason }], usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 2 } }
      : provider === 'Claude' ? { content: [{ type: 'text', text: status === 'blocked' ? '' : 'Answer' }], stop_reason: reason, usage: { input_tokens: 4, output_tokens: 2 } }
      : { choices: [{ message: { content: status === 'blocked' ? '' : 'Answer' }, finish_reason: reason }], usage: { prompt_tokens: 4, completion_tokens: 2 } };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } })));
    const result = await complete({ config: { provider, model: 'test' }, system: 'System', messages: [{ role: 'user', content: 'User' }] }, { gemini: 'test', anthropic: 'test' });
    expect(result.completion).toEqual({ status, reason });
    expect(result.usage).toEqual({ inputTokens: 4, outputTokens: 2 });
  });
  it('reports a user cancellation without a misleading connection error or new request', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const controller = new AbortController(); controller.abort();
    await expect(complete({ config: { provider: 'Ollama', model: 'local' }, system: 'test', messages: [{ role: 'user', content: 'test' }], signal: controller.signal }, {})).rejects.toThrow(/cancelled/);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('preserves a streamed refusal even when the terminal reason is stop', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('data: {"choices":[{"delta":{"refusal":"Cannot provide that."}}]}\n\ndata: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } })));
    const result = await complete({ config: { provider: 'OpenAI', model: 'test' }, system: 'test', messages: [{ role: 'user', content: 'test' }], onChunk: vi.fn() }, { openai: 'test' });
    expect(result).toMatchObject({ text: 'Cannot provide that.', completion: { status: 'blocked', reason: 'refusal' } });
  });
  it.each(['Groq', 'Gemini', 'Claude'] as const)('retries %s rate limits a bounded number of times and never exposes the key', async provider => {
    const fetch = vi.fn(async () => new Response('{"error":{"message":"bad key secret-test-key"}}', { status: 429, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetch);
    const delays = retryPolicy.delaysMs;
    retryPolicy.delaysMs = [0, 0];
    const onRetry = vi.fn();
    const failure = complete({ config: { provider, model: 'test' }, system: 'test', messages: [{ role: 'user', content: 'test' }], onRetry }, { groq: 'secret-test-key', gemini: 'secret-test-key', anthropic: 'secret-test-key' });
    await expect(failure).rejects.toThrow(/quota/);
    await expect(failure.catch(error => (error as Error).message)).resolves.not.toContain('secret-test-key');
    retryPolicy.delaysMs = delays;
    expect(fetch).toHaveBeenCalledTimes(retryPolicy.maxAttempts);
    expect(onRetry).toHaveBeenCalledTimes(retryPolicy.maxAttempts - 1);
    expect(readableError({ status: 401, message: 'secret-test' }, 'Groq').message).not.toContain('secret-test');
  });
});
it('retains initial information on follow-ups without mutating chat history', () => {
  const exp = experiment(); const before = structuredClone(exp.panelA.chatHistory);
  const messages = buildChatMessages(exp.scenario.informationItems, exp.panelA.chatHistory, 'Why?');
  expect(messages[0].content).toContain('Approval is pending.');
  expect(messages[2]).toEqual({ role: 'user', content: 'Why?' });
  expect(exp.panelA.chatHistory).toEqual(before);
});
it('omits a failed turn as a pair when reconstructing follow-up input', () => {
  const exp = experiment();
  exp.panelA.chatHistory.push({ role: 'user', content: 'Failed question' }, { role: 'model', content: 'Partial failed answer', error: 'Network interrupted' });
  const messages = buildChatMessages(exp.scenario.informationItems, exp.panelA.chatHistory, 'New question');
  expect(messages.map(message => message.content).join(' ')).not.toContain('Failed question');
  expect(messages).toHaveLength(3);
  expect(messages[0].content).toContain('Approval is pending.');
});
it('returns the exact generation input used on the wire for replay', async () => {
  const requests: Request[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push(new Request(input, init));
    return new Response('data: {"choices":[{"delta":{"content":"Answer"}}]}\n\ndata: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  }));
  const exp = experiment();
  const result = await runChatTestStream({ provider: 'Ollama', model: 'local' }, {}, 'Exact system', exp.scenario.informationItems, exp.panelA.chatHistory, 'Follow up', vi.fn());
  const body = await requests[0].json() as { messages: unknown[] };
  expect(body.messages).toEqual([{ role: 'system', content: result.generationInput.system }, ...result.generationInput.messages]);
  expect(result.completion?.status).toBe('complete');
});
