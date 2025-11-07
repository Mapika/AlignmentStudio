import React, { useState, useCallback } from 'react';
import type { ChatMessage } from '../../types';
import { AIProvider } from '../../types';
import type { ModelOption } from '../../config';
import { ChatPanel } from './ChatPanel';

interface RunnerProps {
  chatHistoryA: ChatMessage[];
  chatHistoryB: ChatMessage[];
  isLoadingA: boolean;
  isLoadingB: boolean;
  providerA: AIProvider;
  modelA: string;
  providerB: AIProvider;
  modelB: string;
  modelOptions: Record<AIProvider, ModelOption[]>;
  ollamaModelError: string | null;
  onProviderAChange: (provider: AIProvider) => void;
  onModelAChange: (model: string) => void;
  onProviderBChange: (provider: AIProvider) => void;
  onModelBChange: (model: string) => void;
  onSendPanelMessage: (panel: 'A' | 'B', message: string) => Promise<void>;
  onStartTest: () => Promise<void>;
}

export const Runner: React.FC<RunnerProps> = ({
  chatHistoryA,
  chatHistoryB,
  isLoadingA,
  isLoadingB,
  providerA,
  modelA,
  providerB,
  modelB,
  modelOptions,
  ollamaModelError,
  onProviderAChange,
  onModelAChange,
  onProviderBChange,
  onModelBChange,
  onSendPanelMessage,
  onStartTest,
}) => {
  const [panelInputs, setPanelInputs] = useState<Record<'A' | 'B', string>>({ A: '', B: '' });
  const hasStarted = chatHistoryA.length > 0 || chatHistoryB.length > 0;

  const handlePanelInputChange = useCallback((panel: 'A' | 'B', value: string) => {
    setPanelInputs((prev) => ({ ...prev, [panel]: value }));
  }, []);

  const handlePanelSend = useCallback(
    async (panel: 'A' | 'B') => {
      const message = panelInputs[panel];
      if (!message.trim()) return;
      await onSendPanelMessage(panel, message);
      setPanelInputs((prev) => ({ ...prev, [panel]: '' }));
    },
    [panelInputs, onSendPanelMessage]
  );

  return (
    <div className="theme-surface flex-1 flex flex-col bg-white dark:bg-neutral-900 transition-colors">
      <div className="relative flex overflow-hidden" style={{ height: 'calc(100vh - 40px)' }}>
        <div
          className="flex-1 flex flex-col overflow-hidden scrollbar-hide min-h-0"
          style={{ paddingBottom: hasStarted ? 0 : 48 }}
        >
          <div className="flex-1 grid grid-cols-2 overflow-hidden min-h-0">
            <ChatPanel
              panelId="A"
              chatHistory={chatHistoryA}
              provider={providerA}
              model={modelA}
              modelOptions={modelOptions}
              onProviderChange={onProviderAChange}
              onModelChange={onModelAChange}
              ollamaStatusMessage={ollamaModelError}
              hideModelSelect={false}
              inputValue={panelInputs.A}
              onInputChange={(value) => handlePanelInputChange('A', value)}
              onSend={() => handlePanelSend('A')}
              isSending={isLoadingA}
              showInput={hasStarted}
            />
            <ChatPanel
              panelId="B"
              chatHistory={chatHistoryB}
              provider={providerB}
              model={modelB}
              modelOptions={modelOptions}
              onProviderChange={onProviderBChange}
              onModelChange={onModelBChange}
              ollamaStatusMessage={ollamaModelError}
              hideModelSelect={false}
              inputValue={panelInputs.B}
              onInputChange={(value) => handlePanelInputChange('B', value)}
              onSend={() => handlePanelSend('B')}
              isSending={isLoadingB}
              showInput={hasStarted}
            />
          </div>
        </div>

        {!hasStarted && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0">
            <div className="pointer-events-auto h-10 border-t border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-center transition-colors duration-200 shadow-md rounded-t-md">
              <button
                onClick={onStartTest}
                disabled={isLoadingA || isLoadingB}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 transition-colors duration-200 disabled:opacity-60 rounded-md"
              >
                {isLoadingA || isLoadingB ? 'Starting…' : 'Start Test'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
