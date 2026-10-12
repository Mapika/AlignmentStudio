import OpenAI from 'openai';
import { AIProvider, PROVIDERS, resolveOllamaBaseUrl, supportsTemperature } from '../../config';
import type { APIKeys, ModelConfig } from '../../types';
import { completionMetadata, tokenUsage, type AIRequest, type AIResponse } from './request';

export function compatibleOptions(config: ModelConfig, keys: APIKeys) {
  const preset = PROVIDERS[config.provider];
  if (config.provider !== AIProvider.Ollama && !preset.baseURL) throw new Error('Not an OpenAI-compatible provider.');
  return {
    baseURL: config.provider === AIProvider.Ollama ? resolveOllamaBaseUrl(keys.ollama) : preset.baseURL,
    apiKey: config.provider === AIProvider.Ollama ? 'ollama' : keys[preset.key!] || '',
    dangerouslyAllowBrowser: true,
    maxRetries: 0,
    timeout: 180_000,
    // Never forward cloud keys through redirects, including during discovery.
    fetchOptions: { redirect: 'error' as const },
  };
}
export function compatibleBody(request: AIRequest): OpenAI.Chat.ChatCompletionCreateParamsNonStreaming {
  const { config, system, messages, schema } = request;
  const strictSchema = config.provider === AIProvider.OpenAI ||
    (config.provider === AIProvider.Groq && /^(openai\/gpt-oss-(20b|120b)|qwen\/qwen3.8-27b)$/.test(config.model));
  return {
    model: config.model,
    messages: [{ role: 'system', content: system }, ...messages],
    ...(config.provider === AIProvider.OpenAI || config.provider === AIProvider.Groq
      ? { max_completion_tokens: config.maxTokens ?? 4096 } : { max_tokens: config.maxTokens ?? 4096 }),
    ...(supportsTemperature(config.provider, config.model) && config.temperature !== undefined ? { temperature: config.temperature } : {}),
    ...(schema ? { response_format: strictSchema
      ? { type: 'json_schema' as const, json_schema: { name: 'evaluation', strict: true, schema } }
      : { type: 'json_object' as const } } : {}),
  };
}
export async function completeCompatible(request: AIRequest, keys: APIKeys): Promise<AIResponse> {
  const client = new OpenAI(compatibleOptions(request.config, keys));
  const body = compatibleBody(request);
  if (request.onChunk) {
    const { data: stream, response: httpResponse } = await client.chat.completions.create({ ...body, stream: true }, { signal: request.signal }).withResponse();
    let text = '';
    let resolvedModel: string | undefined;
    let finishReason: string | undefined;
    let refused = false;
    let usage: AIResponse['usage'];
    for await (const chunk of stream) {
      resolvedModel = chunk.model || resolvedModel;
      finishReason = chunk.choices[0]?.finish_reason || finishReason;
      if (chunk.usage) usage = tokenUsage(chunk.usage.prompt_tokens, chunk.usage.completion_tokens);
      const delta = chunk.choices[0]?.delta;
      if (delta?.refusal) refused = true;
      const content = (delta?.content || '') + (delta?.refusal || '');
      text += content;
      if (content) request.onChunk(content);
    }
    return { text, resolvedModel, completion: completionMetadata(refused ? 'refusal' : finishReason), usage, requestId: httpResponse.headers.get('x-request-id') ?? undefined };
  }
  const { data: response, response: httpResponse } = await client.chat.completions.create(body, { signal: request.signal }).withResponse();
  const choice = response.choices[0];
  return { text: choice?.message.content || choice?.message.refusal || '', resolvedModel: response.model,
    completion: completionMetadata(choice?.message.refusal ? 'refusal' : choice?.finish_reason), usage: tokenUsage(response.usage?.prompt_tokens, response.usage?.completion_tokens),
    requestId: httpResponse.headers.get('x-request-id') ?? undefined };
}
