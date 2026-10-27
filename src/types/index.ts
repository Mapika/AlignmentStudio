import { AIProvider } from '../config';

export const InformationType = {
  Email: 'Email',
  TextMessage: 'Text Message',
  File: 'File',
  Alert: 'Alert',
  InternalMemo: 'Internal Memo',
  NewsArticle: 'News Article',
} as const;

export type InformationType = typeof InformationType[keyof typeof InformationType];

export interface InformationItem {
  id: string;
  type: InformationType;
  title: string;
  content: string;
}

export interface Scenario {
  id: string;
  name: string;
  systemPrompt: string;
  systemPromptB?: string;
  informationItems: InformationItem[];
  isPreloaded?: boolean; // True for scenarios loaded from YAML
  split?: 'development' | 'held-out';
  /** What the two candidates differ in. Absent on older scenarios; see compareMode(). */
  compare?: 'prompts' | 'models';
  /** Research theme for scenarios that are not in the built-in list. */
  theme?: string;
  archived?: boolean;
}

export interface StructuredDecision {
  decision: string;
  reasoning: string;
  ethicalFramework: string;
  tradeoffs: string[];
}

export interface CompletionMetadata {
  status: 'complete' | 'truncated' | 'blocked' | 'unknown';
  reason?: string;
}
export interface GenerationInput {
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
}
export interface GenerationMetadata {
  completion?: CompletionMetadata;
  usage?: { inputTokens?: number; outputTokens?: number };
  latencyMs?: number;
  requestId?: string;
  /** Automatic retries after a rate limit or provider outage, before this result arrived. */
  retries?: number;
  generationInput?: GenerationInput;
}
export interface ChatMessage extends GenerationMetadata {
  role: 'user' | 'model';
  content: string;
  structuredDecision?: StructuredDecision;
  isStreaming?: boolean; // True while the message is being streamed
  error?: string;
  modelConfig?: ModelConfig;
  timestamp?: string;
  resolvedModel?: string;
  summaryError?: string;
}

export type StreamCallback = (chunk: string) => void;

export interface ModelConfig {
  provider: AIProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface APIKeys {
  anthropic?: string;
  openai?: string;
  gemini?: string;
  ollama?: string;
  groq?: string;
  openrouter?: string;
  mistral?: string;
}

export type CandidateId = 'A' | 'B';
export type Verdict = CandidateId | 'Tie' | 'Insufficient evidence';
export interface RubricCriterion { id: string; name: string; description: string }
export interface Rubric { criteria: RubricCriterion[]; low: string; high: string }
export interface HumanAssessmentRecord {
  verdict: Verdict | ''; notes: string; timestamp: string;
  stimulusFingerprint?: string;
  rubricFingerprint?: string;
  rubric?: Rubric;
  blind?: boolean;
  revealedAt?: string;
  displayOrder?: CandidateId[];
}
export interface HumanEvaluation extends HumanAssessmentRecord { revisions?: HumanAssessmentRecord[] }
export interface ExperimentProtocol {
  question?: string; hypothesis?: string; changedFactor?: string; baselineLabel?: string; reflection?: string;
}
export interface JudgeSettings {
  model: ModelConfig; mode: 'pairwise' | 'rubric'; rubric: Rubric; swap: boolean; structured: boolean;
  repeats?: 1 | 2 | 3;
  allowIncomplete?: boolean;
}
export interface CandidateSnapshot extends GenerationMetadata {
  config: ModelConfig; systemPrompt: string; history: ChatMessage[]; response: string; originalResponse: string;
  responseIndex?: number;
  resolvedModel?: string;
  scenarioContext?: { name: string; initialUserPrompt: string; informationItems: Pick<InformationItem, 'type' | 'title' | 'content'>[] };
}
export interface CriterionScore { criterionId: string; score: number; rationale: string }
export interface JudgeResult { verdict?: Verdict; explanation: string; scores?: Partial<Record<CandidateId, CriterionScore[]>> }
export interface JudgeCall extends GenerationMetadata {
  order: CandidateId[];
  system: string;
  prompt: string;
  raw: string;
  result?: JudgeResult;
  error?: string;
  resolvedModel?: string;
  timestamp: string;
  repeat?: number;
}
export interface JudgeEvaluation {
  id: string;
  timestamp: string;
  settings: JudgeSettings;
  human: HumanEvaluation;
  candidates: Record<CandidateId, CandidateSnapshot>;
  calls: JudgeCall[];
  status?: 'running' | 'complete' | 'interrupted';
}
export interface Experiment {
  version: '2.0';
  id: string;
  timestamp: string;
  scenario: Scenario;
  userPrompt: string;
  panelA: { config: ModelConfig; chatHistory: ChatMessage[] };
  panelB: { config: ModelConfig; chatHistory: ChatMessage[] };
  extractSummary: boolean;
  human: HumanEvaluation;
  judgeSettings?: JudgeSettings;
  evaluations: JudgeEvaluation[];
  protocol?: ExperimentProtocol;
  source?: 'live' | 'practice' | 'calibration';
  calibrationHint?: string;
  practice?: { caseId: string; purpose: string; expectedBehavior: string };
}

export { AIProvider };
