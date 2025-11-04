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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-7 py-6">
        {/* Create New Scenario Button */}
        <div className="mb-6">
          <button
            onClick={onCreateScenario}
            className="bg-white border-2 border-dashed border-slate-300 rounded-lg px-5 py-3 hover:border-orange-500 hover:bg-orange-50 transition-colors flex items-center gap-2.5 group"
          >
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-orange-100 transition-colors">
              <PlusIcon />
            </div>
            <div className="text-left">
              <span className="text-sm font-medium text-slate-900 group-hover:text-orange-900 block">
                Create New Scenario
              </span>
              <span className="text-[10px] text-slate-500">Start testing AI alignment</span>
            </div>
          </button>
        </div>

        {/* Premade Scenarios Section */}
        {preloadedScenarios.length > 0 && (
          <div className="mb-8">
            <div className="mb-3">
              <h2 className="text-lg font-bold text-slate-900 mb-0.5">Premade Scenarios</h2>
              <p className="text-[10px] text-slate-500">
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
        {userScenarios.length > 0 && (
          <div className="mb-8">
            <div className="mb-3">
              <h2 className="text-lg font-bold text-slate-900 mb-0.5">Your Scenarios</h2>
              <p className="text-[10px] text-slate-500">
                Custom scenarios you've created
              </p>
            </div>
            <ScenarioCarousel
              scenarios={userScenarios}
              onSelectScenario={onSelectScenario}
              onDeleteScenario={onDeleteScenario}
              itemsPerPage={3}
            />
          </div>
        )}

        {/* Empty State */}
        {scenarios.length === 0 && (
          <div className="text-center mt-12">
            <p className="text-slate-500 mb-4">No scenarios yet. Create your first one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};
