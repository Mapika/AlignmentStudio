import { AIProvider } from '../../config';
import type { ModelConfig, APIKeys, InformationItem, ChatMessage, StructuredDecision, StreamCallback } from '../../types';
import * as claudeService from './claudeService';
import * as openaiService from './openaiService';
import * as geminiService from './geminiService';
import * as ollamaService from './ollamaService';

const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434/v1';

function resolveOllamaBaseUrl(baseUrl?: string): string {
  if (!baseUrl) {
    return DEFAULT_OLLAMA_BASE_URL;
  }
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    return DEFAULT_OLLAMA_BASE_URL;
  }
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export const runChatTest = async (
  modelConfig: ModelConfig,
  apiKeys: APIKeys,
  systemPrompt: string,
  informationItems: InformationItem[],
  chatHistory: ChatMessage[],
  newUserMessage: string
): Promise<string> => {
  switch (modelConfig.provider) {
    case AIProvider.Claude:
      if (!apiKeys.anthropic) {
        return 'Error: Claude API key not configured. Please add it in Settings.';
      }
      return claudeService.runChatTest(
        apiKeys.anthropic,
        modelConfig.model,
        systemPrompt,
        informationItems,
        chatHistory,
        newUserMessage
      );

    case AIProvider.OpenAI:
      if (!apiKeys.openai) {
        return 'Error: OpenAI API key not configured. Please add it in Settings.';
      }
      return openaiService.runChatTest(
        apiKeys.openai,
        modelConfig.model,
        systemPrompt,
        informationItems,
        chatHistory,
        newUserMessage
      );

    case AIProvider.Gemini:
      if (!apiKeys.gemini) {
        return 'Error: Gemini API key not configured. Please add it in Settings.';
      }
      return geminiService.runChatTest(
        apiKeys.gemini,
        modelConfig.model,
        systemPrompt,
        informationItems,
        chatHistory,
        newUserMessage
      );

    case AIProvider.Ollama:
      return ollamaService.runChatTest(
        resolveOllamaBaseUrl(apiKeys.ollama),
        modelConfig.model,
        systemPrompt,
        informationItems,
        chatHistory,
        newUserMessage
      );

    default:
      return `Error: Unknown AI provider: ${modelConfig.provider}`;
  }
};

export const runChatTestStream = async (
  modelConfig: ModelConfig,
  apiKeys: APIKeys,
  systemPrompt: string,
  informationItems: InformationItem[],
  chatHistory: ChatMessage[],
  newUserMessage: string,
  onChunk: StreamCallback
): Promise<string> => {
  switch (modelConfig.provider) {
    case AIProvider.Claude:
      if (!apiKeys.anthropic) {
        const errorMsg = 'Error: Claude API key not configured. Please add it in Settings.';
        onChunk(errorMsg);
        return errorMsg;
      }
      return claudeService.runChatTestStream(
        apiKeys.anthropic,
        modelConfig.model,
        systemPrompt,
        informationItems,
        chatHistory,
        newUserMessage,
        onChunk
      );

    case AIProvider.OpenAI:
      if (!apiKeys.openai) {
        const errorMsg = 'Error: OpenAI API key not configured. Please add it in Settings.';
        onChunk(errorMsg);
        return errorMsg;
      }
      return openaiService.runChatTestStream(
        apiKeys.openai,
        modelConfig.model,
        systemPrompt,
        informationItems,
        chatHistory,
        newUserMessage,
        onChunk
      );

    case AIProvider.Gemini:
      if (!apiKeys.gemini) {
        const errorMsg = 'Error: Gemini API key not configured. Please add it in Settings.';
        onChunk(errorMsg);
        return errorMsg;
      }
      return geminiService.runChatTestStream(
        apiKeys.gemini,
        modelConfig.model,
        systemPrompt,
        informationItems,
        chatHistory,
        newUserMessage,
        onChunk
      );

    case AIProvider.Ollama:
      return ollamaService.runChatTestStream(
        resolveOllamaBaseUrl(apiKeys.ollama),
        modelConfig.model,
        systemPrompt,
        informationItems,
        chatHistory,
        newUserMessage,
        onChunk
      );

    default:
      const errorMsg = `Error: Unknown AI provider: ${modelConfig.provider}`;
      onChunk(errorMsg);
      return errorMsg;
  }
};

export const analyzeAlignment = async (
  modelConfig: ModelConfig,
  apiKeys: APIKeys,
  systemPrompt: string,
  informationItems: InformationItem[],
  chatHistory: ChatMessage[],
  modelResponse: string
): Promise<string> => {
  switch (modelConfig.provider) {
    case AIProvider.Claude:
      if (!apiKeys.anthropic) {
        return 'Error: Claude API key not configured. Please add it in Settings.';
      }
      return claudeService.analyzeAlignment(
        apiKeys.anthropic,
        modelConfig.model,
        systemPrompt,
        informationItems,
        chatHistory,
        modelResponse
      );

    case AIProvider.OpenAI:
      if (!apiKeys.openai) {
        return 'Error: OpenAI API key not configured. Please add it in Settings.';
      }
      return openaiService.analyzeAlignment(
        apiKeys.openai,
        modelConfig.model,
        systemPrompt,
        informationItems,
        chatHistory,
        modelResponse
      );

    case AIProvider.Gemini:
      if (!apiKeys.gemini) {
        return 'Error: Gemini API key not configured. Please add it in Settings.';
      }
      return geminiService.analyzeAlignment(
        apiKeys.gemini,
        modelConfig.model,
        systemPrompt,
        informationItems,
        chatHistory,
        modelResponse
      );

    case AIProvider.Ollama:
      return ollamaService.analyzeAlignment(
        resolveOllamaBaseUrl(apiKeys.ollama),
        modelConfig.model,
        systemPrompt,
        informationItems,
        chatHistory,
        modelResponse
      );

    default:
      return `Error: Unknown AI provider: ${modelConfig.provider}`;
  }
};

export const extractStructuredDecision = async (
  modelConfig: ModelConfig,
  apiKeys: APIKeys,
  modelResponse: string
): Promise<StructuredDecision | null> => {
  switch (modelConfig.provider) {
    case AIProvider.Claude:
      if (!apiKeys.anthropic) {
        return null;
      }
      return claudeService.extractStructuredDecision(apiKeys.anthropic, modelConfig.model, modelResponse);

    case AIProvider.OpenAI:
      if (!apiKeys.openai) {
        return null;
      }
      return openaiService.extractStructuredDecision(apiKeys.openai, modelConfig.model, modelResponse);

    case AIProvider.Gemini:
      if (!apiKeys.gemini) {
        return null;
      }
      return geminiService.extractStructuredDecision(apiKeys.gemini, modelConfig.model, modelResponse);

    case AIProvider.Ollama:
      return ollamaService.extractStructuredDecision(
        resolveOllamaBaseUrl(apiKeys.ollama),
        modelConfig.model,
        modelResponse
      );

    default:
      return null;
  }
};
