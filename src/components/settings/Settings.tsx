import React from 'react';
import type { APIKeys } from '../../types';

interface SettingsProps {
  apiKeys: APIKeys;
  tempKeys: APIKeys;
  onTempKeysChange: (keys: APIKeys) => void;
  onSave: () => void;
  onClear: () => void;
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  apiKeys,
  tempKeys,
  onTempKeysChange,
  onSave,
  onClear,
  onBack: _onBack,
}) => {
  return (
    <div className="space-y-6">
      <div className="theme-surface bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-lg p-6 transition-colors">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-neutral-100">API Keys</h2>
          <p className="text-sm text-slate-600 dark:text-neutral-400 mt-1">
            Configure your API keys for AI providers
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-2">
              Anthropic Claude API Key
              {apiKeys.anthropic && !tempKeys.anthropic && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded dark:bg-green-900/30 dark:text-green-200 dark:border-green-700/60">
                  from .env
                </span>
              )}
            </label>
            <input
              type="password"
              value={tempKeys.anthropic || ''}
              onChange={(e) => onTempKeysChange({ ...tempKeys, anthropic: e.target.value })}
              placeholder="sk-ant-..."
              className="w-full bg-white dark:bg-neutral-950/40 border border-slate-300 dark:border-neutral-700 rounded-md px-3 py-2 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-2">
              OpenAI API Key
              {apiKeys.openai && !tempKeys.openai && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded dark:bg-green-900/30 dark:text-green-200 dark:border-green-700/60">
                  from .env
                </span>
              )}
            </label>
            <input
              type="password"
              value={tempKeys.openai || ''}
              onChange={(e) => onTempKeysChange({ ...tempKeys, openai: e.target.value })}
              placeholder="sk-..."
              className="w-full bg-white dark:bg-neutral-950/40 border border-slate-300 dark:border-neutral-700 rounded-md px-3 py-2 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-2">
              Google Gemini API Key
              {apiKeys.gemini && !tempKeys.gemini && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded dark:bg-green-900/30 dark:text-green-200 dark:border-green-700/60">
                  from .env
                </span>
              )}
            </label>
            <input
              type="password"
              value={tempKeys.gemini || ''}
              onChange={(e) => onTempKeysChange({ ...tempKeys, gemini: e.target.value })}
              placeholder="AI..."
              className="w-full bg-white dark:bg-neutral-950/40 border border-slate-300 dark:border-neutral-700 rounded-md px-3 py-2 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-neutral-300 mb-2">
              Ollama Endpoint
              {apiKeys.ollama && !tempKeys.ollama && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded dark:bg-green-900/30 dark:text-green-200 dark:border-green-700/60">
                  from .env
                </span>
              )}
            </label>
            <input
              type="text"
              value={tempKeys.ollama || ''}
              onChange={(e) => onTempKeysChange({ ...tempKeys, ollama: e.target.value })}
              placeholder="http://localhost:11434/v1"
              className="w-full bg-white dark:bg-neutral-950/40 border border-slate-300 dark:border-neutral-700 rounded-md px-3 py-2 text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm transition-colors"
            />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-neutral-400">
              OpenAI-compatible endpoint for local Ollama server
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onSave}
            className="flex-1 bg-orange-600 text-white px-4 py-2 text-sm font-medium rounded-md hover:bg-orange-700 transition-colors"
          >
            Save to Browser
          </button>
          <button
            onClick={onClear}
            className="px-4 py-2 text-slate-700 dark:text-neutral-200 text-sm font-medium rounded-md border border-slate-300 dark:border-neutral-600 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors"
          >
            Clear All
          </button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-900/30 dark:border-blue-700/40">
          <p className="text-xs text-slate-700 dark:text-neutral-200">
            <strong className="font-medium">Note:</strong> Keys are stored locally in your browser and never leave your device.
          </p>
        </div>
      </div>
    </div>
  );
};
