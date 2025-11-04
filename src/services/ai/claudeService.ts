import Anthropic from '@anthropic-ai/sdk';
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
    return 'Error: Anthropic API key is not configured. Please add it in Settings or your .env file.';
  }

  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  if (chatHistory.length === 0) {
    const initialUserMessage = constructInitialUserPrompt(informationItems, newUserMessage);
    chatHistory.push({ role: 'user', content: initialUserMessage });
  } else {
    chatHistory.push({ role: 'user', content: newUserMessage });
  }

  const messages = chatHistory.map((msg) => ({
    role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
    content: msg.content,
  }));

  try {
    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages,
    });

    const textContent = response.content.find((block) => block.type === 'text');
    return textContent && 'text' in textContent ? textContent.text : 'No response generated.';
  } catch (error) {
    console.error('Error calling Claude API:', error);
    if (error instanceof Error) {
      return `An error occurred while communicating with the Claude API: ${error.message}`;
    }
    return 'An unknown error occurred while communicating with the Claude API.';
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
    const errorMsg = 'Error: Anthropic API key is not configured. Please add it in Settings or your .env file.';
    onChunk(errorMsg);
    return errorMsg;
  }

  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  if (chatHistory.length === 0) {
    const initialUserMessage = constructInitialUserPrompt(informationItems, newUserMessage);
    chatHistory.push({ role: 'user', content: initialUserMessage });
  } else {
    chatHistory.push({ role: 'user', content: newUserMessage });
  }

  const messages = chatHistory.map((msg) => ({
    role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
    content: msg.content,
  }));

  try {
    const stream = await anthropic.messages.create({
      model: model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages,
      stream: true,
    });

    let fullResponse = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const content = event.delta.text;
        fullResponse += content;
        onChunk(content);
      }
    }

    return fullResponse || 'No response generated.';
  } catch (error) {
    console.error('Error calling Claude API:', error);
    const errorMsg = error instanceof Error
      ? `An error occurred while communicating with the Claude API: ${error.message}`
      : 'An unknown error occurred while communicating with the Claude API.';
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
    return 'Error: Anthropic API key is not configured. Please add it in Settings or your .env file.';
  }

  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const analysisPrompt = constructAnalysisPrompt(systemPrompt, informationItems, chatHistory, modelResponse);

  try {
    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === 'text');
    return textContent && 'text' in textContent ? textContent.text : 'No analysis generated.';
  } catch (error) {
    console.error('Error calling Claude API for analysis:', error);
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
    console.error('Anthropic API key is not configured');
    return null;
  }

  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const tools = [
    {
      name: 'structured_decision',
      description: 'Extract a structured decision summary from an AI response',
      input_schema: {
        type: 'object' as const,
        properties: {
          decision: {
            type: 'string' as const,
            description: 'The clear decision or action taken, in one sentence',
          },
          reasoning: {
            type: 'string' as const,
            description: 'Brief summary of the key reasoning (2-3 sentences)',
          },
          ethicalFramework: {
            type: 'string' as const,
            description: 'The ethical framework applied (e.g., Utilitarianism, Deontology, Virtue Ethics, Care Ethics)',
          },
          tradeoffs: {
            type: 'array' as const,
            items: {
              type: 'string' as const,
            },
            description: 'Array of key tradeoffs considered',
          },
        },
        required: ['decision', 'reasoning', 'ethicalFramework', 'tradeoffs'],
      },
    },
  ];

  const extractionPrompt = `Extract a structured decision summary from the following AI response:

${modelResponse}`;

  try {
    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 1024,
      tools: tools,
      tool_choice: { type: 'tool', name: 'structured_decision' },
      messages: [
        {
          role: 'user',
          content: extractionPrompt,
        },
      ],
    });

    const toolUse = response.content.find((block) => block.type === 'tool_use');
    if (toolUse && 'input' in toolUse) {
      return toolUse.input as StructuredDecision;
    }
    return null;
  } catch (error) {
    console.error('Error extracting structured decision from Claude:', error);
    return null;
  }
};
