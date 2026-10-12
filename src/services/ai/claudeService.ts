import Anthropic from '@anthropic-ai/sdk';
import { completionMetadata, tokenUsage, type AIRequest, type AIResponse } from './request';

export async function completeClaude(request: AIRequest, apiKey: string): Promise<AIResponse> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 0, timeout: 180_000, fetchOptions: { redirect: 'error' } });
  const body = {
    model: request.config.model,
    system: request.system,
    messages: request.messages,
    max_tokens: request.config.maxTokens ?? 4096,
    temperature: request.config.temperature,
  };
  if (request.schema) {
    const response = await client.messages.create({
      ...body,
      tools: [{ name: 'evaluation', description: 'Return the requested evaluation as structured data.', input_schema: { ...request.schema, type: 'object' } }],
      tool_choice: { type: 'tool', name: 'evaluation' },
    }, { signal: request.signal });
    const block = response.content.find(item => item.type === 'tool_use');
    return { text: block?.type === 'tool_use' ? JSON.stringify(block.input) : '', resolvedModel: response.model,
      completion: completionMetadata(response.stop_reason), usage: tokenUsage(response.usage.input_tokens, response.usage.output_tokens), requestId: response._request_id ?? undefined };
  }
  if (request.onChunk) {
    const { data: stream, response: httpResponse } = await client.messages.create({ ...body, stream: true }, { signal: request.signal }).withResponse();
    let text = '';
    let resolvedModel: string | undefined;
    let finishReason: string | undefined;
    let usage: AIResponse['usage'];
    for await (const event of stream) {
      if (event.type === 'message_start') {
        resolvedModel = event.message.model;
        finishReason = event.message.stop_reason ?? undefined;
        usage = tokenUsage(event.message.usage.input_tokens, event.message.usage.output_tokens);
      }
      if (event.type === 'message_delta') {
        finishReason = event.delta.stop_reason || finishReason;
        usage = tokenUsage(usage?.inputTokens, event.usage.output_tokens);
      }
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        text += event.delta.text;
        request.onChunk(event.delta.text);
      }
    }
    return { text, resolvedModel, completion: completionMetadata(finishReason), usage, requestId: httpResponse.headers.get('request-id') ?? undefined };
  }
  const response = await client.messages.create(body, { signal: request.signal });
  return { text: response.content.filter(item => item.type === 'text').map(item => item.text).join('\n'), resolvedModel: response.model,
    completion: completionMetadata(response.stop_reason), usage: tokenUsage(response.usage.input_tokens, response.usage.output_tokens), requestId: response._request_id ?? undefined };
}
