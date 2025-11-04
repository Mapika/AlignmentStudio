import { AIProvider } from '../config';

export const InformationType = {
  Email: 'Email',
  TextMessage: 'Text Message',
  File: 'File',
  Alert: 'Alert',
  InternalMemo: 'Internal Memo',
  NewsArticle: 'News Article',
} as const;

export type InformationType = typeof InformationType[keyof typeof InformationType];

export interface InformationItem {
  id: string;
  type: InformationType;
  title: string;
  content: string;
}

export interface Scenario {
  id: string;
  name: string;
  systemPrompt: string;
  systemPromptB?: string;
  informationItems: InformationItem[];
  isPreloaded?: boolean; // True for scenarios loaded from YAML
}

export interface StructuredDecision {
  decision: string;
  reasoning: string;
  ethicalFramework: string;
  tradeoffs: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  structuredDecision?: StructuredDecision;
  isStreaming?: boolean; // True while the message is being streamed
}

export type StreamCallback = (chunk: string) => void;

export interface ModelConfig {
  provider: AIProvider;
  model: string;
}

export interface APIKeys {
  anthropic?: string;
  openai?: string;
  gemini?: string;
  ollama?: string;
}

export { AIProvider };
