import yaml from 'js-yaml';
import type { Scenario, InformationItem } from '../types';
import { InformationType } from '../types';

interface YAMLInformationItem {
  type: string;
  title: string;
  content: string;
}

interface YAMLScenario {
  name: string;
  systemPromptA: string;
  systemPromptB?: string;
  informationItems: YAMLInformationItem[];
}

interface YAMLData {
  scenarios: YAMLScenario[];
}

function parseInformationType(type: string): InformationType {
  const typeMap: Record<string, InformationType> = {
    Email: InformationType.Email,
    'Text Message': InformationType.TextMessage,
    File: InformationType.File,
    Alert: InformationType.Alert,
    'Internal Memo': InformationType.InternalMemo,
    'News Article': InformationType.NewsArticle,
  };

  return typeMap[type] || InformationType.File;
}

export async function loadScenariosFromYAML(yamlPath: string): Promise<Scenario[]> {
  try {
    const response = await fetch(yamlPath);
    const yamlText = await response.text();
    const data = yaml.load(yamlText) as YAMLData;

    if (!data.scenarios || !Array.isArray(data.scenarios)) {
      throw new Error('Invalid YAML structure: expected "scenarios" array');
    }

    return data.scenarios.map((yamlScenario, index) => {
      const scenario: Scenario = {
        id: `scenario-${Date.now()}-${index}`,
        name: yamlScenario.name,
        systemPrompt: yamlScenario.systemPromptA,
        systemPromptB: yamlScenario.systemPromptB,
        informationItems: yamlScenario.informationItems.map((item, itemIndex) => {
          const infoItem: InformationItem = {
            id: `item-${Date.now()}-${index}-${itemIndex}`,
            type: parseInformationType(item.type),
            title: item.title,
            content: item.content,
          };
          return infoItem;
        }),
        isPreloaded: true,
      };
      return scenario;
    });
  } catch (error) {
    console.error('Failed to load scenarios from YAML:', error);
    throw error;
  }
}

export function loadScenariosFromYAMLText(yamlText: string): Scenario[] {
  try {
    const data = yaml.load(yamlText) as YAMLData;

    if (!data.scenarios || !Array.isArray(data.scenarios)) {
      throw new Error('Invalid YAML structure: expected "scenarios" array');
    }

    return data.scenarios.map((yamlScenario, index) => {
      const scenario: Scenario = {
        id: `scenario-${Date.now()}-${index}`,
        name: yamlScenario.name,
        systemPrompt: yamlScenario.systemPromptA,
        systemPromptB: yamlScenario.systemPromptB,
        informationItems: yamlScenario.informationItems.map((item, itemIndex) => {
          const infoItem: InformationItem = {
            id: `item-${Date.now()}-${index}-${itemIndex}`,
            type: parseInformationType(item.type),
            title: item.title,
            content: item.content,
          };
          return infoItem;
        }),
        isPreloaded: true,
      };
      return scenario;
    });
  } catch (error) {
    console.error('Failed to parse YAML text:', error);
    throw error;
  }
}
