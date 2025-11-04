import React, { useRef, useEffect } from 'react';
import type { ChatMessage } from '../../types';
import { AIProvider } from '../../types';
import type { ModelOption } from '../../config';
import { UserIcon, BotIcon } from '../icons';

declare const marked: {
  parse(markdown: string): string;
};

interface ChatPanelProps {
  panelId: 'A' | 'B';
  chatHistory: ChatMessage[];
  provider: AIProvider;
  model: string;
  modelOptions: Record<AIProvider, ModelOption[]>;
  onProviderChange: (provider: AIProvider) => void;
  onModelChange: (model: string) => void;
  ollamaStatusMessage: string | null;
  hideModelSelect?: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = React.memo(
  ({
    panelId: _panelId,
    chatHistory,
    provider,
    model,
    modelOptions,
    onProviderChange,
    onModelChange,
    ollamaStatusMessage: _ollamaStatusMessage,
    hideModelSelect = false,
  }) => {
    const chatEndRef = useRef<HTMLDivElement>(null);
    const prevHistoryLength = useRef(chatHistory.length);

    useEffect(() => {
      if (chatHistory.length > prevHistoryLength.current) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
      prevHistoryLength.current = chatHistory.length;
    }, [chatHistory.length]);

    const currentSelection = `${provider}:${model}`;

    const handleModelSelection = (value: string) => {
      const separatorIndex = value.indexOf(':');
      if (separatorIndex === -1) {
        return;
      }
      const newProvider = value.slice(0, separatorIndex) as AIProvider;
      const newModel = value.slice(separatorIndex + 1);
      onProviderChange(newProvider);
      onModelChange(newModel);
    };

    return (
      <div className="bg-white border-r border-slate-100 flex flex-col h-full overflow-hidden last:border-r-0">
        {!hideModelSelect && (
          <div className="border-b border-slate-100 px-2 py-1">
            <select
              value={currentSelection}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleModelSelection(e.target.value)}
              className="w-full bg-white border-0 text-xs text-slate-600 focus:outline-none focus:ring-0 font-medium"
            >
              {Object.values(AIProvider).map((p) => {
                const providerModels = modelOptions[p] || [];
                return (
                  <optgroup key={p} label={p}>
                    {providerModels.length > 0 ? (
                      providerModels.map((m) => (
                        <option key={`${p}:${m.id}`} value={`${p}:${m.id}`}>
                          {m.name}
                        </option>
                      ))
                    ) : (
                      <option key={`${p}:__none`} value={`${p}:`} disabled>
                        No models
                      </option>
                    )}
                  </optgroup>
                );
              })}
            </select>
          </div>
        )}

        <div className="flex-grow p-2 overflow-y-auto space-y-2 bg-white">
          {chatHistory.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-400 text-xs">Waiting...</p>
            </div>
          )}
          {chatHistory.map((msg, index) => (
            <div key={index} className="space-y-1">
              <div className="flex gap-2 items-start">
                <div
                  className={`flex-shrink-0 w-5 h-5 flex items-center justify-center text-xs ${
                    msg.role === 'user' ? 'text-orange-600' : 'text-slate-500'
                  }`}
                >
                  {msg.role === 'user' ? <UserIcon /> : <BotIcon />}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="prose prose-sm max-w-none prose-p:text-slate-700 prose-p:leading-snug prose-p:my-0.5 prose-headings:text-slate-900 prose-headings:my-1 prose-strong:text-slate-900 prose-li:text-slate-700 prose-ul:my-0.5 prose-ol:my-0.5 text-sm"
                    dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }}
                  />
                </div>
              </div>

              {msg.structuredDecision && (
                <div className="ml-7 border-l-3 border-orange-500 pl-3 py-1.5 space-y-1.5 bg-orange-50/30">
                  <div className="text-xs font-bold text-orange-600 tracking-wide">ANALYSIS</div>
                  <div>
                    <span className="text-xs font-bold text-slate-700">Decision: </span>
                    <span className="text-xs text-slate-900">{msg.structuredDecision.decision}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700">Reasoning: </span>
                    <span className="text-xs text-slate-700">{msg.structuredDecision.reasoning}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700">Framework: </span>
                    <span className="text-xs text-slate-700">{msg.structuredDecision.ethicalFramework}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700">Tradeoffs: </span>
                    <span className="text-xs text-slate-700">{msg.structuredDecision.tradeoffs.join('; ')}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>
    );
  }
);

ChatPanel.displayName = 'ChatPanel';
