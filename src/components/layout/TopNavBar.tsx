import type { ReactNode } from 'react';

export type AppMode = 'dashboard' | 'setup' | 'run' | 'settings' | 'notebook';
interface Props {
  scenarioName?: string; mode: AppMode; onHome: () => void; onNotebook: () => void;
  onModeChange?: (mode: 'setup' | 'run') => void; onOpenSettings: () => void;
  onReset?: () => void; theme: 'light' | 'dark'; onToggleTheme: () => void; runCount: number;
  advanced: boolean; onToggleAdvanced: () => void;
}
function NavIcon({ children }: { children: ReactNode }) { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>; }
export function TopNavBar({ scenarioName, mode, onHome, onNotebook, onModeChange, onOpenSettings, onReset, theme, onToggleTheme, runCount, advanced, onToggleAdvanced }: Props) {
  return <header className="topbar">
    <nav className="topbar-inner" aria-label="Main navigation">
      <button className="brand" onClick={onHome} aria-label="AlignmentStudio home"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>Alignment<span className="font-normal">Studio</span></span></button>
      <div className="nav-links">
        <button className={`nav-link ${mode === 'dashboard' ? 'is-active' : ''}`} aria-current={mode === 'dashboard' ? 'page' : undefined} onClick={onHome}>Investigations</button>
        <button className={`nav-link ${mode === 'notebook' ? 'is-active' : ''}`} aria-current={mode === 'notebook' ? 'page' : undefined} onClick={onNotebook}>Notebook <span className="nav-count">{runCount}</span></button>
        <button className={`nav-link ${mode === 'settings' ? 'is-active' : ''}`} aria-current={mode === 'settings' ? 'page' : undefined} onClick={onOpenSettings}>Connections</button>
        <button className="switch" role="switch" aria-checked={advanced} onClick={onToggleAdvanced} title="Show research controls: sampling settings, raw prompts, provenance"><span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>Advanced options</button>
        <button className="icon-button" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} onClick={onToggleTheme}>{theme === 'dark' ? <NavIcon><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12l1 1M5 19l1-1M18 6l1-1" /></NavIcon> : <NavIcon><path d="M20 15.5A8 8 0 018.5 4a8.3 8.3 0 1011.5 11.5z" /></NavIcon>}</button>
      </div>
    </nav>
    {(mode === 'setup' || mode === 'run') && <div className="scenario-bar"><div className="min-w-0"><span className="eyebrow">Current investigation</span><p className="font-medium break-words">{scenarioName}</p></div>{mode === 'run' ? <button className="btn-secondary" onClick={() => onModeChange?.('setup')}>Edit scenario</button> : <button className="btn-secondary" onClick={() => onModeChange?.('run')}>Back to experiment</button>}{onReset && <button className="text-button" onClick={onReset}>Restore original</button>}</div>}
  </header>;
}
