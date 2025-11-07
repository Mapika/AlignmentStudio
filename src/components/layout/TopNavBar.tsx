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
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
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
  theme = 'dark',
  onToggleTheme,
}) => {
  const showScenarioControls = mode === 'setup' || mode === 'run';
  const showRunnerControls = mode === 'run';
  const isDarkMode = theme === 'dark';
  const isDashboard = mode === 'dashboard';
  const showSetupReset = mode === 'setup';
  const titleText =
    mode === 'dashboard' ? 'Alignment Studio' : mode === 'settings' ? 'Settings' : scenarioName || 'Scenario';
  const titleClass =
    mode === 'dashboard'
      ? 'text-base font-semibold text-slate-900 dark:text-neutral-100 transition-colors'
      : 'text-sm font-medium text-slate-900 dark:text-neutral-100 transition-colors';

  return (
    <nav className="theme-surface bg-[#e4e0da] dark:bg-neutral-900 border-b border-slate-200 dark:border-neutral-800/80 px-4 py-2 shadow-sm transition-colors duration-300">
      <div className="flex items-center justify-between relative">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {onBack && !isDashboard ? (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-left text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white transition-colors rounded-md px-1 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              aria-label="Go back"
            >
              <span className="flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </span>
              <span className={titleClass}>{titleText}</span>
            </button>
          ) : mode === 'dashboard' ? (
            <h1 className={titleClass}>{titleText}</h1>
          ) : (
            <h2 className={titleClass}>{titleText}</h2>
          )}
        </div>

        {/* Center Section - Mode Tabs */}
        {showScenarioControls && onModeChange && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-50 dark:bg-neutral-800/60 p-0.5 rounded-md backdrop-blur-sm transition-colors duration-300">
            <button
              onClick={() => onModeChange('setup')}
              className={`px-3 py-1 text-xs font-medium transition-colors rounded-md ${
                mode === 'setup'
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white'
              }`}
            >
              Setup
            </button>
            <button
              onClick={() => onModeChange('run')}
              className={`px-3 py-1 text-xs font-medium transition-colors rounded-md ${
                mode === 'run'
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white'
              }`}
            >
              Test Runner
            </button>
          </div>
        )}

        {/* Right Section - Actions */}
        <div className="flex items-center gap-1.5">
          {(showRunnerControls || showSetupReset) && onReset && (
            <button
              onClick={onReset}
              className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white transition-colors rounded-md"
            >
              Reset
            </button>
          )}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-neutral-200 dark:hover:text-white transition-colors rounded-md"
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={isDarkMode}
            >
              {isDarkMode ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <circle cx="12" cy="12" r="4"></circle>
                  <path strokeLinecap="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-7.364l-1.414 1.414M7.05 16.95l-1.414 1.414m0-13.414l1.414 1.414m10.607 10.607l1.414 1.414" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
                  />
                </svg>
              )}
            </button>
          )}
          {onOpenSettings && mode !== 'settings' && (
            <button
              onClick={onOpenSettings}
              className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-neutral-200 dark:hover:text-white transition-colors rounded-md"
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
