import React from 'react';
import type { Scenario } from '../../types';
import { getScenarioTheme, THEME_COLORS } from '../../data/scenarioThemes';

interface ScenarioCarouselProps {
  scenarios: Scenario[];
  onSelectScenario: (id: string) => void;
  onDeleteScenario: (id: string) => void;
  itemsPerPage?: number;
  leadingCard?: React.ReactNode;
  showTheme?: boolean;
}

// The historical export is retained for compatibility. A flat list makes every
// scenario reachable without a carousel or custom scrolling behavior.
export const ScenarioCarousel: React.FC<ScenarioCarouselProps> = ({ scenarios, onSelectScenario, onDeleteScenario, leadingCard, showTheme = true }) => <>
  {leadingCard}
  <ul className="row-list">
    {scenarios.map(scenario => {
      const theme = getScenarioTheme(scenario);
      const evidence = scenario.informationItems.length;
      return <li key={scenario.id} className="scenario-row">
        <button type="button" onClick={() => onSelectScenario(scenario.id)} aria-label={`Open ${scenario.name}`} className="scenario-open">
          <span className="min-w-0">
            <span className="title block text-[16.5px] font-semibold leading-snug">{scenario.name}</span>
            <span className="mt-1.5 flex flex-wrap items-center">
              {showTheme && <span className="tag"><span className="theme-dot" style={{ background: THEME_COLORS[theme] }} aria-hidden="true" />{theme}</span>}
              <span className="tag">{evidence} evidence {evidence === 1 ? 'block' : 'blocks'}</span>
              <span className="tag">{scenario.split === 'held-out' ? 'Held-out' : 'Development'}</span>
              {!scenario.isPreloaded && <span className="tag">Your scenario</span>}
            </span>
          </span>
          <svg className="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
        <details className="relative shrink-0">
          <summary aria-label={`Scenario actions: ${scenario.name}`} className="scenario-actions flex min-h-11 min-w-11 items-center justify-center rounded-full text-lg text-[var(--faint)] hover:bg-[var(--chip)]">⋯</summary>
          <div className="scenario-menu">
            <button type="button" onClick={() => onDeleteScenario(scenario.id)} aria-label={`Archive ${scenario.name}`} title="Saved experiments remain in your notebook" className="w-full min-h-10 rounded-lg px-3 text-left text-sm hover:bg-[var(--chip)]">Archive</button>
          </div>
        </details>
      </li>;
    })}
  </ul>
</>;
