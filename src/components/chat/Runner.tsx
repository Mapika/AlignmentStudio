import React, { useState } from 'react';
import type { ChatMessage, Scenario } from '../../types';
import { AIProvider } from '../../types';
import type { ModelOption } from '../../config';
import { ChatPanel } from './ChatPanel';
import { Spinner, SendIcon } from '../icons';

interface RunnerProps {
  scenario: Scenario;
  systemPromptA: string;
  systemPromptB: string;
  chatHistoryA: ChatMessage[];
  chatHistoryB: ChatMessage[];
  isLoadingA: boolean;
  isLoadingB: boolean;
  providerA: AIProvider;
  modelA: string;
  providerB: AIProvider;
  modelB: string;
  modelOptions: Record<AIProvider, ModelOption[]>;
  sharedInput: string;
  studentNotes: string;
  ollamaModelError: string | null;
  onSharedInputChange: (value: string) => void;
  onStudentNotesChange: (value: string) => void;
  onProviderAChange: (provider: AIProvider) => void;
  onModelAChange: (model: string) => void;
  onProviderBChange: (provider: AIProvider) => void;
  onModelBChange: (model: string) => void;
  onSendMessage: () => void;
  onReset: () => void;
  onImport: () => void;
  onExport: (format: 'json' | 'markdown') => void;
}

export const Runner: React.FC<RunnerProps> = ({
  scenario: _scenario,
  chatHistoryA,
  chatHistoryB,
  isLoadingA,
  isLoadingB,
  providerA,
  modelA,
  providerB,
  modelB,
  modelOptions,
  sharedInput,
  studentNotes,
  ollamaModelError,
  onSharedInputChange,
  onStudentNotesChange,
  onProviderAChange,
  onModelAChange,
  onProviderBChange,
  onModelBChange,
  onSendMessage,
  onReset: _onReset,
  onImport: _onImport,
  onExport: _onExport,
}) => {
  const hasStarted = chatHistoryA.length > 0 || chatHistoryB.length > 0;
  const [notesOpen, setNotesOpen] = useState(false);
  const bothPanelsLoading = isLoadingA && isLoadingB;

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="flex" style={{ height: 'calc(100vh - 65px)' }}>
        <div className="flex-1 flex flex-col">
          <div className="flex-1 grid grid-cols-2 overflow-hidden">
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
            />
          </div>

          <div className="border-t border-slate-100 px-3 py-2 bg-white">
            <div className="flex items-center justify-center gap-2">
              {!hasStarted ? (
                <button
                  onClick={onSendMessage}
                  disabled={bothPanelsLoading}
                  className="flex items-center justify-center gap-2 px-6 py-2 bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 rounded-md"
                >
                  {bothPanelsLoading ? (
                    <>
                      <Spinner /> Starting...
                    </>
                  ) : (
                    'Start Test'
                  )}
                </button>
              ) : (
                <>
                  <div className="flex-1 max-w-2xl relative">
                    <input
                      type="text"
                      value={sharedInput}
                      onChange={(e) => onSharedInputChange(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          onSendMessage();
                        }
                      }}
                      placeholder="Message both models..."
                      disabled={bothPanelsLoading}
                      className="w-full bg-white border border-slate-200 px-3 py-1.5 pr-9 text-sm focus:outline-none focus:border-orange-500 disabled:opacity-50 rounded-md"
                    />
                    <button
                      onClick={onSendMessage}
                      disabled={bothPanelsLoading || !sharedInput.trim()}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-30 rounded-md"
                    >
                      <SendIcon />
                    </button>
                  </div>

                  <button
                    onClick={() => setNotesOpen(!notesOpen)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors rounded-md ${
                      notesOpen
                        ? 'bg-orange-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Notes
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {hasStarted && notesOpen && (
          <div className="w-64 border-l border-slate-100 bg-white flex flex-col">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">Notes</span>
              <button
                onClick={() => setNotesOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-md"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 p-2">
              <textarea
                value={studentNotes}
                onChange={(e) => onStudentNotesChange(e.target.value)}
                placeholder="Your observations..."
                className="w-full h-full bg-white border border-slate-200 px-2 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 resize-none rounded-md"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
