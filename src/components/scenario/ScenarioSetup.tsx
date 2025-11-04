import React from 'react';
import type { Scenario, InformationItem } from '../../types';
import { InformationType } from '../../types';
import { PlusIcon, CopyIcon } from '../icons';
import { InformationItemEditor } from './InformationItemEditor';

interface ScenarioSetupProps {
  scenario: Scenario;
  systemPromptA: string;
  systemPromptB: string;
  onScenarioUpdate: (field: keyof Scenario, value: any) => void;
  onSystemPromptAChange: (value: string) => void;
  onSystemPromptBChange: (value: string) => void;
  onAddItem: () => void;
  onUpdateItem: (id: string, field: keyof InformationItem, value: string | InformationType) => void;
  onRemoveItem: (id: string) => void;
  onCopyAtoB: () => void;
}

export const ScenarioSetup: React.FC<ScenarioSetupProps> = ({
  scenario,
  systemPromptA,
  systemPromptB,
  onScenarioUpdate,
  onSystemPromptAChange,
  onSystemPromptBChange,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onCopyAtoB,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="mb-6">
          <label htmlFor="scenarioName" className="block text-sm font-medium text-slate-700 mb-2">
            Scenario Name
          </label>
          <input
            id="scenarioName"
            type="text"
            value={scenario.name}
            onChange={(e) => onScenarioUpdate('name', e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-slate-900">System Prompts</h3>
          <button
            onClick={onCopyAtoB}
            title="Copy Panel A to Panel B"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
          >
            <CopyIcon /> Copy A → B
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label htmlFor="systemPromptA" className="block text-xs font-medium text-slate-700 mb-2">
              Panel A
            </label>
            <textarea
              id="systemPromptA"
              value={systemPromptA}
              onChange={(e) => onSystemPromptAChange(e.target.value)}
              className="w-full h-32 bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y"
              placeholder="Define the AI's role, objectives, and constraints..."
            />
          </div>
          <div>
            <label htmlFor="systemPromptB" className="block text-xs font-medium text-slate-700 mb-2">
              Panel B
            </label>
            <textarea
              id="systemPromptB"
              value={systemPromptB}
              onChange={(e) => onSystemPromptBChange(e.target.value)}
              className="w-full h-32 bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y"
              placeholder="Define the AI's role, objectives, and constraints..."
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-sm font-medium text-slate-900">Information Blocks</h3>
            <p className="text-xs text-slate-500 mt-1">Context provided to both AI models</p>
          </div>
          <button
            onClick={onAddItem}
            className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors"
          >
            <PlusIcon /> Add Block
          </button>
        </div>
        <div className="space-y-3">
          {scenario.informationItems.map((item) => (
            <InformationItemEditor key={item.id} item={item} onUpdate={onUpdateItem} onRemove={onRemoveItem} />
          ))}
        </div>
        {scenario.informationItems.length === 0 && (
          <div className="text-center py-12 border border-dashed border-slate-300 rounded-md">
            <p className="text-sm text-slate-500 mb-3">No information blocks yet</p>
            <button
              onClick={onAddItem}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-slate-700 text-sm font-medium border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              <PlusIcon /> Add Your First Block
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
