import type { Scenario } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateScenario = (scenario: Scenario): ValidationResult => {
  const errors: string[] = [];

  if (!scenario.name || scenario.name.trim().length === 0) {
    errors.push('Scenario name is required');
  }

  if (scenario.name && scenario.name.length > 100) {
    errors.push('Scenario name must be less than 100 characters');
  }

  if (scenario.systemPrompt && scenario.systemPrompt.length > 10000) {
    errors.push('System prompt is too long (max 10,000 characters)');
  }

  scenario.informationItems.forEach((item, index) => {
    if (!item.title || item.title.trim().length === 0) {
      errors.push(`Information block ${index + 1}: Title is required`);
    }
    if (!item.content || item.content.trim().length === 0) {
      errors.push(`Information block ${index + 1}: Content is required`);
    }
    if (item.content && item.content.length > 50000) {
      errors.push(`Information block ${index + 1}: Content is too long (max 50,000 characters)`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateAPIKey = (provider: string, key: string): ValidationResult => {
  const errors: string[] = [];

  if (!key || key.trim().length === 0) {
    return { isValid: true, errors: [] }; // Empty is ok, user might not want to use this provider
  }

  switch (provider) {
    case 'anthropic':
      if (!key.startsWith('sk-ant-')) {
        errors.push('Anthropic API key should start with "sk-ant-"');
      }
      break;
    case 'openai':
      if (!key.startsWith('sk-')) {
        errors.push('OpenAI API key should start with "sk-"');
      }
      break;
    case 'gemini':
      if (key.length < 10) {
        errors.push('Gemini API key seems too short');
      }
      break;
    case 'ollama':
      try {
        new URL(key);
      } catch {
        errors.push('Ollama endpoint must be a valid URL');
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const sanitizeInput = (input: string): string => {
  // Basic XSS prevention - strip script tags
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};
