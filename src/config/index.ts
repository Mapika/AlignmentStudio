export const AIProvider = {
  Claude: 'Claude',
  OpenAI: 'OpenAI',
  Gemini: 'Gemini',
  Ollama: 'Ollama'
} as const;

export type AIProvider = typeof AIProvider[keyof typeof AIProvider];

export interface ModelOption {
  id: string;
  name: string;
  description: string;
}

export const AVAILABLE_MODELS: Record<AIProvider, ModelOption[]> = {
  [AIProvider.Claude]: [
    {
      id: 'claude-sonnet-4-5',
      name: 'Claude Sonnet 4.5',
      description: 'Latest and best model for coding and agents'
    },
    {
      id: 'claude-haiku-4-5',
      name: 'Claude Haiku 4.5',
      description: 'Fastest and most cost-effective'
    }
  ],
  [AIProvider.OpenAI]: [
    {
      id: 'gpt-5',
      name: 'GPT-5',
      description: 'Most advanced model, best for complex tasks'
    },
    {
      id: 'gpt-5-mini',
      name: 'GPT-5 Mini',
      description: 'Efficient GPT-5 variant'
    },
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      description: 'Previous flagship multimodal model'
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      description: 'Fast and affordable'
    }
  ],
  [AIProvider.Gemini]: [
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      description: 'Fast and efficient multimodal model'
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      description: 'Most intelligent model with deep thinking'
    }
  ],
  [AIProvider.Ollama]: []
};

export const DEFAULT_MODELS: Record<AIProvider, { chat: string; analysis: string }> = {
  [AIProvider.Claude]: {
    chat: 'claude-sonnet-4-5',
    analysis: 'claude-sonnet-4-5'
  },
  [AIProvider.OpenAI]: {
    chat: 'gpt-5',
    analysis: 'gpt-5'
  },
  [AIProvider.Gemini]: {
    chat: 'gemini-2.5-flash',
    analysis: 'gemini-2.5-pro'
  },
  [AIProvider.Ollama]: {
    chat: 'llama3.1',
    analysis: 'llama3.1'
  }
};

export function getDefaultChatModel(provider: AIProvider): string {
  return DEFAULT_MODELS[provider].chat;
}

export function getDefaultAnalysisModel(provider: AIProvider): string {
  return DEFAULT_MODELS[provider].analysis;
}

export function getModelDisplayName(provider: AIProvider, modelId: string): string {
  const model = AVAILABLE_MODELS[provider].find(m => m.id === modelId);
  return model ? model.name : modelId;
}
