import React from 'react';

interface TopNavBarProps {
  scenarioName?: string;
  mode?: 'dashboard' | 'setup' | 'run' | 'settings';
  onBack?: () => void;
  onModeChange?: (mode: 'setup' | 'run') => void;
  onOpenSettings?: () => void;
  onImport?: () => void;
  onReset?: () => void;
  onExport?: (format: 'json' | 'markdown') => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  scenarioName,
  mode,
  onBack,
  onModeChange,
  onOpenSettings,
  onImport,
  onReset,
  onExport,
}) => {
  const showScenarioControls = mode === 'setup' || mode === 'run';
  const showRunnerControls = mode === 'run';

  return (
    <nav className="bg-white border-b border-slate-100 px-4 py-2">
      <div className="flex items-center justify-between relative">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {onBack && mode !== 'dashboard' && (
            <button
              onClick={onBack}
              className="text-slate-500 hover:text-slate-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            {mode === 'dashboard' ? (
              <h1 className="text-base font-semibold text-slate-900">Alignment Studio</h1>
            ) : mode === 'settings' ? (
              <h1 className="text-base font-semibold text-slate-900">Settings</h1>
            ) : (
              <h2 className="text-sm font-medium text-slate-900">{scenarioName || 'Scenario'}</h2>
            )}
          </div>
        </div>

        {/* Center Section - Mode Tabs */}
        {showScenarioControls && onModeChange && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-50 p-0.5 rounded-md">
            <button
              onClick={() => onModeChange('setup')}
              className={`px-3 py-1 text-xs font-medium transition-colors rounded-md ${
                mode === 'setup'
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Setup
            </button>
            <button
              onClick={() => onModeChange('run')}
              className={`px-3 py-1 text-xs font-medium transition-colors rounded-md ${
                mode === 'run'
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Test Runner
            </button>
          </div>
        )}

        {/* Right Section - Actions */}
        <div className="flex items-center gap-1.5">
          {showRunnerControls && onImport && onReset && onExport && (
            <>
              <button
                onClick={onImport}
                className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors rounded-md"
              >
                Import
              </button>
              <button
                onClick={onReset}
                className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors rounded-md"
              >
                Reset
              </button>
              <button
                onClick={() => onExport('markdown')}
                className="px-2 py-1 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors rounded-md"
              >
                MD
              </button>
              <button
                onClick={() => onExport('json')}
                className="px-2 py-1 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors rounded-md"
              >
                JSON
              </button>
            </>
          )}
          {onOpenSettings && mode !== 'settings' && (
            <button
              onClick={onOpenSettings}
              className="p-1.5 text-slate-600 hover:text-slate-900 transition-colors rounded-md"
              title="Settings"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};
