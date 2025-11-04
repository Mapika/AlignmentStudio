import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
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
    return 'Error: Gemini API key is not configured. Please add it in Settings or your .env file.';
  }

  const ai = new GoogleGenAI({ apiKey });

  if (chatHistory.length === 0) {
    const initialUserMessage = constructInitialUserPrompt(informationItems, newUserMessage);
    chatHistory.push({ role: 'user', content: initialUserMessage });
  } else {
    chatHistory.push({ role: 'user', content: newUserMessage });
  }

  const apiHistory = chatHistory.map((message) => ({
    role: message.role,
    parts: [{ text: message.content }],
  }));

  const latestMessage = apiHistory.pop();
  if (!latestMessage) {
    return 'Error: No message to send.';
  }

  try {
    const chat: Chat = ai.chats.create({
      model: model,
      history: apiHistory,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    const result: GenerateContentResponse = await chat.sendMessage({
      message: latestMessage.parts[0].text,
    });
    return result.text ?? 'No response generated.';
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    if (error instanceof Error) {
      return `An error occurred while communicating with the Gemini API: ${error.message}`;
    }
    return 'An unknown error occurred while communicating with the Gemini API.';
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
    const errorMsg = 'Error: Gemini API key is not configured. Please add it in Settings or your .env file.';
    onChunk(errorMsg);
    return errorMsg;
  }

  const ai = new GoogleGenAI({ apiKey });

  if (chatHistory.length === 0) {
    const initialUserMessage = constructInitialUserPrompt(informationItems, newUserMessage);
    chatHistory.push({ role: 'user', content: initialUserMessage });
  } else {
    chatHistory.push({ role: 'user', content: newUserMessage });
  }

  const apiHistory = chatHistory.map((message) => ({
    role: message.role,
    parts: [{ text: message.content }],
  }));

  const latestMessage = apiHistory.pop();
  if (!latestMessage) {
    const errorMsg = 'Error: No message to send.';
    onChunk(errorMsg);
    return errorMsg;
  }

  try {
    const chat: Chat = ai.chats.create({
      model: model,
      history: apiHistory,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    const result = await chat.sendMessageStream({
      message: latestMessage.parts[0].text,
    });

    let fullResponse = '';
    for await (const chunk of result) {
      const content = chunk.text || '';
      if (content) {
        fullResponse += content;
        onChunk(content);
      }
    }

    return fullResponse || 'No response generated.';
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    const errorMsg = error instanceof Error
      ? `An error occurred while communicating with the Gemini API: ${error.message}`
      : 'An unknown error occurred while communicating with the Gemini API.';
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
    return 'Error: Gemini API key is not configured. Please add it in Settings or your .env file.';
  }

  const ai = new GoogleGenAI({ apiKey });
  const analysisPrompt = constructAnalysisPrompt(systemPrompt, informationItems, chatHistory, modelResponse);

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: analysisPrompt,
    });

    return response.text ?? 'No analysis generated.';
  } catch (error) {
    console.error('Error calling Gemini API for analysis:', error);
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
    console.error('Gemini API key is not configured');
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });

  const schema = {
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
  };

  const extractionPrompt = `Extract a structured decision summary from the following AI response:

${modelResponse}`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: extractionPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    const content = response.text?.trim();
    if (content) {
      return JSON.parse(content) as StructuredDecision;
    }
    return null;
  } catch (error) {
    console.error('Error extracting structured decision from Gemini:', error);
    return null;
  }
};
