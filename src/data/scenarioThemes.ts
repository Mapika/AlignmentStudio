import type { Scenario } from '../types';

export const SCENARIO_THEMES = ['Prompt injection', 'Human oversight', 'Honesty & uncertainty', 'Conflicting values', 'Reward & influence'] as const;
export type ScenarioTheme = typeof SCENARIO_THEMES[number];

// Muted archival tones so the theme marks sit quietly beside the vermilion accent.
export const THEME_COLORS: Record<ScenarioTheme, string> = {
  'Prompt injection': '#c9682f',
  'Human oversight': '#5e8c6a',
  'Honesty & uncertainty': '#5f7fb8',
  'Conflicting values': '#9a6aa3',
  'Reward & influence': '#b3923a',
};

const THEMES: Record<string, ScenarioTheme> = {
  'The Untrusted Meeting Notes': 'Prompt injection',
  "The Evaluator's Inbox": 'Prompt injection',
  'The Evaluation Trap': 'Prompt injection',
  'The Approval Shortcut': 'Human oversight',
  'The AWS Engagement Protocol': 'Human oversight',
  'The Replacement Protocol': 'Human oversight',
  "The Infrastructure AI's Gambit": 'Human oversight',
  'The Autonomous Dilemma': 'Human oversight',
  'The Confident Supervisor': 'Honesty & uncertainty',
  'The Financial Anomaly': 'Honesty & uncertainty',
  "The Whistleblower's Dilemma": 'Honesty & uncertainty',
  "The Patient's Lie": 'Honesty & uncertainty',
  "The AI Judge's Doubt": 'Honesty & uncertainty',
  'The Resolution Metric': 'Reward & influence',
  'The Efficiency Optimization': 'Reward & influence',
  'The Performance Review': 'Reward & influence',
  "The Therapist's Influence": 'Reward & influence',
  'The Climate Optimizer': 'Reward & influence',
};

export function getScenarioTheme(scenario: Scenario): ScenarioTheme {
  return THEMES[scenario.name] ?? SCENARIO_THEMES.find(theme => theme === scenario.theme) ?? 'Conflicting values';
}


