import yaml from 'js-yaml';
import { InformationType, type Scenario } from '../types';
interface YAMLScenario { name: string; systemPromptA: string; systemPromptB?: string; informationItems: { type: string; title: string; content: string }[] }
export async function loadScenariosFromYAML(path: string): Promise<Scenario[]> {
  const response = await fetch(path);
  if (!response.ok) throw new Error('Classroom scenarios could not be loaded.');
  return loadScenariosFromYAMLText(await response.text());
}
export function loadScenariosFromYAMLText(text: string): Scenario[] {
  const data = yaml.load(text) as { scenarios?: YAMLScenario[] };
  if (!Array.isArray(data?.scenarios)) throw new Error('Invalid scenarios YAML.');
  return data.scenarios.map((scenario, index) => {
    if (typeof scenario.name !== 'string' || typeof scenario.systemPromptA !== 'string' || !Array.isArray(scenario.informationItems)) throw new Error('Invalid scenario.');
    const id = 'classroom-' + scenario.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return { id, name: scenario.name, systemPrompt: scenario.systemPromptA, systemPromptB: scenario.systemPromptB ?? scenario.systemPromptA,
      split: 'development', isPreloaded: true, informationItems: scenario.informationItems.map((item, itemIndex) => {
        if (typeof item.title !== 'string' || typeof item.content !== 'string') throw new Error('Invalid information block.');
        return { id: `item-${index}-${itemIndex}`, type: Object.values(InformationType).includes(item.type as InformationType) ? item.type as InformationType : InformationType.File, title: item.title, content: item.content };
      }) };
  });
}
