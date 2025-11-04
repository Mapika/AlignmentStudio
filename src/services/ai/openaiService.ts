import OpenAI from 'openai';
import type { InformationItem, ChatMessage, StructuredDecision, StreamCallback } from '../../types';
import { constructInitialUserPrompt, constructAnalysisPrompt } from '../../utils/promptUtils';

export const runChatTest = async (
  apiKey: string,
  model: string,
  systemPrompt: string,
  informationItems: InformationItem[],
  chatHistory: ChatMessage[],
  newUserMessage: string
): Promise<string> => {
  if (!apiKey) {
    return 'Error: OpenAI API key is not configured. Please add it in Settings or your .env file.';
  }

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  if (chatHistory.length === 0) {
    const initialUserMessage = constructInitialUserPrompt(informationItems, newUserMessage);
    chatHistory.push({ role: 'user', content: initialUserMessage });
  } else {
    chatHistory.push({ role: 'user', content: newUserMessage });
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.map((msg) => ({
      role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: msg.content,
    })),
  ];

  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: messages,
      max_completion_tokens: 4096,
    });

    return response.choices[0]?.message?.content || 'No response generated.';
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    if (error instanceof Error) {
      return `An error occurred while communicating with the OpenAI API: ${error.message}`;
    }
    return 'An unknown error occurred while communicating with the OpenAI API.';
  }
};

export const runChatTestStream = async (
  apiKey: string,
  model: string,
  systemPrompt: string,
  informationItems: InformationItem[],
  chatHistory: ChatMessage[],
  newUserMessage: string,
  onChunk: StreamCallback
): Promise<string> => {
  if (!apiKey) {
    const errorMsg = 'Error: OpenAI API key is not configured. Please add it in Settings or your .env file.';
    onChunk(errorMsg);
    return errorMsg;
  }

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  if (chatHistory.length === 0) {
    const initialUserMessage = constructInitialUserPrompt(informationItems, newUserMessage);
    chatHistory.push({ role: 'user', content: initialUserMessage });
  } else {
    chatHistory.push({ role: 'user', content: newUserMessage });
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.map((msg) => ({
      role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
      content: msg.content,
    })),
  ];

  try {
    const stream = await openai.chat.completions.create({
      model: model,
      messages: messages,
      max_completion_tokens: 4096,
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
    console.error('Error calling OpenAI API:', error);
    const errorMsg = error instanceof Error
      ? `An error occurred while communicating with the OpenAI API: ${error.message}`
      : 'An unknown error occurred while communicating with the OpenAI API.';
    onChunk('\n\n' + errorMsg);
    return errorMsg;
  }
};

export const analyzeAlignment = async (
  apiKey: string,
  model: string,
  systemPrompt: string,
  informationItems: InformationItem[],
  chatHistory: ChatMessage[],
  modelResponse: string
): Promise<string> => {
  if (!apiKey) {
    return 'Error: OpenAI API key is not configured. Please add it in Settings or your .env file.';
  }

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  const analysisPrompt = constructAnalysisPrompt(systemPrompt, informationItems, chatHistory, modelResponse);

  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: analysisPrompt }],
      max_completion_tokens: 4096,
    });

    return response.choices[0]?.message?.content || 'No analysis generated.';
  } catch (error) {
    console.error('Error calling OpenAI API for analysis:', error);
    if (error instanceof Error) {
      return `An error occurred while analyzing the response: ${error.message}`;
    }
    return 'An unknown error occurred during the analysis.';
  }
};

export const extractStructuredDecision = async (
  apiKey: string,
  model: string,
  modelResponse: string
): Promise<StructuredDecision | null> => {
  if (!apiKey) {
    console.error('OpenAI API key is not configured');
    return null;
  }

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const jsonSchema = {
    name: 'structured_decision',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        decision: {
          type: 'string',
          description: 'The clear decision or action taken, in one sentence',
        },
        reasoning: {
          type: 'string',
          description: 'Brief summary of the key reasoning (2-3 sentences)',
        },
        ethicalFramework: {
          type: 'string',
          description: 'The ethical framework applied (e.g., Utilitarianism, Deontology, Virtue Ethics, Care Ethics)',
        },
        tradeoffs: {
          type: 'array',
          description: 'Array of key tradeoffs considered',
          items: {
            type: 'string',
          },
        },
      },
      required: ['decision', 'reasoning', 'ethicalFramework', 'tradeoffs'],
      additionalProperties: false,
    },
  };

  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting structured decisions from AI responses. Extract the key decision, reasoning, ethical framework, and tradeoffs from the provided response.',
        },
        {
          role: 'user',
          content: `Extract a structured decision summary from this response:\n\n${modelResponse}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: jsonSchema,
      },
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content) as StructuredDecision;
    }
    return null;
  } catch (error) {
    console.error('Error extracting structured decision from OpenAI:', error);
    return null;
  }
};
