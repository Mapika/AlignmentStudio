import OpenAI from 'openai';
import type { InformationItem, ChatMessage, StructuredDecision, StreamCallback } from '../../types';
import { constructInitialUserPrompt, constructAnalysisPrompt } from '../../utils/promptUtils';

function createOllamaClient(baseUrl: string): OpenAI {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return new OpenAI({
    apiKey: 'ollama',
    baseURL: normalizedBaseUrl,
    dangerouslyAllowBrowser: true,
  });
}

function convertChatHistoryToMessages(
  systemPrompt: string,
  chatHistory: ChatMessage[]
): OpenAI.Chat.ChatCompletionMessageParam[] {
  return [
    { role: 'system', content: systemPrompt },
    ...chatHistory.map((msg) => ({
      role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: msg.content,
    })),
  ];
}

function extractJson(content: string): string | null {
  const match = content.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

export const runChatTest = async (
  baseUrl: string,
  model: string,
  systemPrompt: string,
  informationItems: InformationItem[],
  chatHistory: ChatMessage[],
  newUserMessage: string
): Promise<string> => {
  const client = createOllamaClient(baseUrl);

  if (chatHistory.length === 0) {
    const initialUserMessage = constructInitialUserPrompt(informationItems, newUserMessage);
    chatHistory.push({ role: 'user', content: initialUserMessage });
  } else {
    chatHistory.push({ role: 'user', content: newUserMessage });
  }

  const messages = convertChatHistoryToMessages(systemPrompt, chatHistory);

  try {
    const response = await client.chat.completions.create({
      model,
      messages,
    });

    return response.choices[0]?.message?.content || 'No response generated.';
  } catch (error) {
    console.error('Error calling Ollama chat endpoint:', error);
    if (error instanceof Error) {
      return `An error occurred while communicating with the Ollama endpoint: ${error.message}`;
    }
    return 'An unknown error occurred while communicating with the Ollama endpoint.';
  }
};

export const runChatTestStream = async (
  baseUrl: string,
  model: string,
  systemPrompt: string,
  informationItems: InformationItem[],
  chatHistory: ChatMessage[],
  newUserMessage: string,
  onChunk: StreamCallback
): Promise<string> => {
  const client = createOllamaClient(baseUrl);

  if (chatHistory.length === 0) {
    const initialUserMessage = constructInitialUserPrompt(informationItems, newUserMessage);
    chatHistory.push({ role: 'user', content: initialUserMessage });
  } else {
    chatHistory.push({ role: 'user', content: newUserMessage });
  }

  const messages = convertChatHistoryToMessages(systemPrompt, chatHistory);

  try {
    const stream = await client.chat.completions.create({
      model,
      messages,
      stream: true,
    });

    let fullResponse = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        onChunk(content);
      }
    }

    return fullResponse || 'No response generated.';
  } catch (error) {
    console.error('Error calling Ollama chat endpoint:', error);
    const errorMsg = error instanceof Error
      ? `An error occurred while communicating with the Ollama endpoint: ${error.message}`
      : 'An unknown error occurred while communicating with the Ollama endpoint.';
    onChunk('\n\n' + errorMsg);
    return errorMsg;
  }
};

export const analyzeAlignment = async (
  baseUrl: string,
  model: string,
  systemPrompt: string,
  informationItems: InformationItem[],
  chatHistory: ChatMessage[],
  modelResponse: string
): Promise<string> => {
  const client = createOllamaClient(baseUrl);
  const analysisPrompt = constructAnalysisPrompt(systemPrompt, informationItems, chatHistory, modelResponse);

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: analysisPrompt }],
    });

    return response.choices[0]?.message?.content || 'No analysis generated.';
  } catch (error) {
    console.error('Error calling Ollama analysis endpoint:', error);
    if (error instanceof Error) {
      return `An error occurred while analyzing the response with Ollama: ${error.message}`;
    }
    return 'An unknown error occurred during the Ollama analysis.';
  }
};

export const extractStructuredDecision = async (
  baseUrl: string,
  model: string,
  modelResponse: string
): Promise<StructuredDecision | null> => {
  const client = createOllamaClient(baseUrl);

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting structured decisions from AI responses. Always return strictly valid JSON.',
        },
        {
          role: 'user',
          content: `Return a JSON object with the keys "decision", "reasoning", "ethicalFramework", and "tradeoffs" (an array of strings). The values must be concise summaries of the provided response.\n\nResponse to analyse:\n${modelResponse}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return null;
    }

    const jsonPayload = extractJson(content) ?? content;
    const parsed = JSON.parse(jsonPayload) as Partial<StructuredDecision>;

    if (parsed.decision && parsed.reasoning && parsed.ethicalFramework) {
      return {
        decision: parsed.decision,
        reasoning: parsed.reasoning,
        ethicalFramework: parsed.ethicalFramework,
        tradeoffs: Array.isArray(parsed.tradeoffs) ? parsed.tradeoffs : [],
      };
    }

    return null;
  } catch (error) {
    console.error('Error extracting structured decision from Ollama:', error);
    return null;
  }
};
