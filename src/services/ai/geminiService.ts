import { GoogleGenAI } from '@google/genai';
import { completionMetadata, tokenUsage, type AIRequest, type AIResponse } from './request';

export async function completeGemini(request: AIRequest, apiKey: string): Promise<AIResponse> {
  const ai = new GoogleGenAI({ apiKey });
  const parameters = {
    model: request.config.model,
    contents: request.messages.map(message => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    })),
    config: {
      systemInstruction: request.system,
      temperature: request.config.temperature,
      maxOutputTokens: request.config.maxTokens ?? 4096,
      ...(request.schema ? { responseMimeType: 'application/json', responseJsonSchema: request.schema } : {}),
      abortSignal: request.signal,
      // This SDK's generateContent transport makes one attempt (covered by mocks).
      httpOptions: { timeout: 180_000 },
    },
  };
  if (request.onChunk) {
    const stream = await ai.models.generateContentStream(parameters);
    let text = '';
    let resolvedModel: string | undefined;
    let finishReason: string | undefined;
    let usage: AIResponse['usage'];
    for await (const chunk of stream) {
      const content = chunk.text || '';
      text += content;
      resolvedModel = chunk.modelVersion || resolvedModel;
      finishReason = chunk.candidates?.[0]?.finishReason || chunk.promptFeedback?.blockReason || finishReason;
      if (chunk.usageMetadata) usage = tokenUsage(chunk.usageMetadata.promptTokenCount, chunk.usageMetadata.candidatesTokenCount);
      if (content) request.onChunk(content);
    }
    return { text, resolvedModel, completion: completionMetadata(finishReason), usage };
  }
  const response = await ai.models.generateContent(parameters);
  return { text: response.text || '', resolvedModel: response.modelVersion,
    completion: completionMetadata(response.candidates?.[0]?.finishReason || response.promptFeedback?.blockReason),
    usage: tokenUsage(response.usageMetadata?.promptTokenCount, response.usageMetadata?.candidatesTokenCount) };
}
