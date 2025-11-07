import React, { useRef, useEffect, useCallback } from 'react';
import type { ChatMessage } from '../../types';
import { AIProvider } from '../../types';
import type { ModelOption } from '../../config';
import { UserIcon, BotIcon, SendIcon } from '../icons';

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
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  isSending: boolean;
  showInput: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = React.memo(
  ({
    panelId,
    chatHistory,
    provider,
    model,
    modelOptions,
    onProviderChange,
    onModelChange,
    ollamaStatusMessage: _ollamaStatusMessage,
    hideModelSelect = false,
    inputValue,
    onInputChange,
    onSend,
    isSending,
    showInput,
  }) => {
    const chatEndRef = useRef<HTMLDivElement>(null);
    const prevHistoryLength = useRef(chatHistory.length);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
      if (chatHistory.length > prevHistoryLength.current) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
      prevHistoryLength.current = chatHistory.length;
    }, [chatHistory.length]);

    const adjustTextareaHeight = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const minHeight = 33;
      textarea.style.height = `${minHeight}px`;
      const scrollHeight = textarea.scrollHeight;
      if (scrollHeight > minHeight) {
        textarea.style.height = `${Math.min(scrollHeight, 400)}px`;
      }
    }, []);

    useEffect(() => {
      if (!showInput) return;
      adjustTextareaHeight();
    }, [inputValue, showInput, adjustTextareaHeight]);

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

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        onSend();
      }
    };

    return (
      <div className="theme-surface bg-white dark:bg-neutral-900 border-r border-slate-100 dark:border-neutral-800 flex flex-col h-full min-h-0 overflow-hidden last:border-r-0 transition-colors duration-200">
        {!hideModelSelect && (
          <div className="border-b border-slate-100 dark:border-neutral-800 px-2 py-1 transition-colors duration-200">
            <select
              value={currentSelection}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleModelSelection(e.target.value)}
              className="w-full bg-white dark:bg-neutral-900 border-0 text-xs text-slate-600 dark:text-neutral-300 focus:outline-none focus:ring-0 font-medium transition-colors duration-200"
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

        <div className="flex-grow p-2 overflow-y-auto space-y-2 bg-white dark:bg-neutral-900 transition-colors duration-200 scrollbar-hide min-h-0">
          {chatHistory.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-400 dark:text-neutral-500 text-xs">Waiting...</p>
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
                    className="prose prose-sm dark:prose-invert max-w-none prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-snug prose-p:my-0.5 prose-headings:text-slate-900 dark:prose-headings:text-white prose-headings:my-1 prose-strong:text-slate-900 dark:prose-strong:text-white prose-li:text-slate-700 dark:prose-li:text-slate-300 prose-ul:my-0.5 prose-ol:my-0.5 text-sm"
                    dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) }}
                  />
                </div>
              </div>

              {msg.structuredDecision && (
                <div className="ml-7 border-l-3 border-orange-500 pl-3 py-1.5 space-y-1.5 bg-orange-50/30 dark:bg-orange-500/10 rounded-sm">
                  <div className="text-xs font-bold text-orange-600 tracking-wide">ANALYSIS</div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-neutral-200">Decision: </span>
                    <span className="text-xs text-slate-900 dark:text-neutral-100">{msg.structuredDecision.decision}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-neutral-200">Reasoning: </span>
                    <span className="text-xs text-slate-700 dark:text-neutral-200">{msg.structuredDecision.reasoning}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-neutral-200">Framework: </span>
                    <span className="text-xs text-slate-700 dark:text-neutral-200">{msg.structuredDecision.ethicalFramework}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-neutral-200">Tradeoffs: </span>
                    <span className="text-xs text-slate-700 dark:text-neutral-200">{msg.structuredDecision.tradeoffs.join('; ')}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {showInput && (
          <div className="border-t border-slate-100 dark:border-neutral-800 px-2 py-2 transition-colors duration-200 flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message model ${panelId}`}
              disabled={isSending}
              rows={1}
              className="flex-1 bg-white dark:bg-neutral-950/40 border border-slate-300 dark:border-neutral-700 rounded-md px-3 py-1 text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-orange-500 transition-colors duration-200 resize-none overflow-y-auto disabled:opacity-60 scrollbar-hide"
            />
            <button
              onClick={onSend}
              disabled={isSending || !inputValue.trim()}
              className="flex items-center justify-center h-9 w-9 rounded-md bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-30 transition-colors duration-200"
            >
              <SendIcon />
            </button>
          </div>
        )}
      </div>
    );
  }
);

ChatPanel.displayName = 'ChatPanel';
