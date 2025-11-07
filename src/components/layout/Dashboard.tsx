import React from 'react';
import type { Scenario } from '../../types';
import { PlusIcon } from '../icons';
import { ScenarioCarousel } from './ScenarioCarousel';

interface DashboardProps {
  scenarios: Scenario[];
  onCreateScenario: () => void;
  onSelectScenario: (id: string) => void;
  onDeleteScenario: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  scenarios,
  onCreateScenario,
  onSelectScenario,
  onDeleteScenario,
}) => {
  // Separate scenarios into premade (from YAML) and user-created
  const preloadedScenarios = scenarios.filter((s) => s.isPreloaded);
  const userScenarios = scenarios.filter((s) => !s.isPreloaded);
  const hasUserScenarios = userScenarios.length > 0;

  return (
    <div className="theme-surface min-h-screen bg-slate-50 dark:bg-neutral-950 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-7 py-6">
        {/* Premade Scenarios Section */}
        {preloadedScenarios.length > 0 && (
          <div className="mb-8">
            <div className="mb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-neutral-50 mb-0.5 transition-colors">
                Premade Scenarios
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-neutral-400 transition-colors">
                Curated ethical dilemmas and alignment challenges
              </p>
            </div>
            <ScenarioCarousel
              scenarios={preloadedScenarios}
              onSelectScenario={onSelectScenario}
              onDeleteScenario={onDeleteScenario}
              itemsPerPage={3}
            />
          </div>
        )}

        {/* User Created Scenarios Section */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-neutral-50 mb-0.5 transition-colors">
                Your Scenarios
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-neutral-400 transition-colors">
                Custom scenarios you own
              </p>
            </div>
          </div>
          <ScenarioCarousel
            scenarios={userScenarios}
            onSelectScenario={onSelectScenario}
            onDeleteScenario={onDeleteScenario}
            itemsPerPage={3}
            leadingCard={
              <button
                type="button"
                onClick={onCreateScenario}
                className="theme-surface w-full h-full bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-300 dark:border-neutral-700 rounded-lg p-5 flex flex-col justify-between min-h-[170px] text-left hover:border-orange-400 dark:hover:border-orange-400 transition-colors duration-300 group"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="theme-surface w-10 h-10 rounded-full bg-[#dfe3e7] dark:bg-neutral-800 flex items-center justify-center text-slate-600 dark:text-neutral-200 transition-colors duration-300 group-hover:bg-[#fbc99b] dark:group-hover:bg-orange-500/30 group-hover:text-orange-600">
                      <PlusIcon />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-neutral-50 group-hover:text-orange-900">
                        Create New Scenario
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                        Set up a custom alignment test
                      </p>
                    </div>
                  </div>
                  {!hasUserScenarios && (
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-relaxed">
                      You don't have any custom scenarios yet.
                      <br />
                      Start by creating one.
                    </p>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 group-hover:text-orange-700">
                  Start building
                  <span aria-hidden="true">→</span>
                </span>
              </button>
            }
          />
        </div>

        {/* Empty State */}
        {scenarios.length === 0 && (
          <div className="text-center mt-12">
            <p className="text-slate-500 dark:text-neutral-400 mb-4">
              No scenarios yet. Create your first one to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
