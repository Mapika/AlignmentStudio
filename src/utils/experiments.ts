import { AIProvider, supportsTemperature } from '../config';
import { InformationType, type CandidateSnapshot, type ChatMessage, type Experiment, type GenerationMetadata, type HumanAssessmentRecord, type HumanEvaluation, type JudgeEvaluation, type JudgeSettings, type ModelConfig, type Rubric, type Scenario } from '../types';
import { assessmentMatches, lastResponseIndex, parseJudgeResult, rubricFingerprint, stimulusFingerprint, validateRubric } from './judge';

export const emptyHuman = (): HumanEvaluation => ({ verdict: '', notes: '', timestamp: new Date().toISOString() });
const obj = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid experiment object.');
  return value as Record<string, unknown>;
};
const str = (value: unknown, fallback?: string): string => {
  if (typeof value === 'string') return value;
  if (fallback !== undefined) return fallback;
  throw new Error('Missing experiment text.');
};
const arr = (value: unknown): unknown[] => { if (!Array.isArray(value)) throw new Error('Invalid experiment list.'); return value; };
export function cleanConfig(input: unknown): ModelConfig {
  const v = obj(input);
  if (!Object.values(AIProvider).includes(v.provider as AIProvider)) throw new Error('Unknown experiment provider.');
  const provider = v.provider as AIProvider;
  const model = str(v.model);
  if (!model.trim()) throw new Error('Missing model ID.');
  const temperature = v.temperature;
  if (temperature !== undefined && (typeof temperature !== 'number' || !Number.isFinite(temperature) || temperature < 0 || temperature > 1)) throw new Error('Temperature must be 0–1.');
  const maxTokens = v.maxTokens;
  if (maxTokens !== undefined && (typeof maxTokens !== 'number' || !Number.isInteger(maxTokens) || maxTokens < 256 || maxTokens > 16384)) throw new Error('Output limit must be 256–16384.');
  return { provider, model, ...(temperature !== undefined && supportsTemperature(provider, model) ? { temperature: temperature as number } : {}), ...(maxTokens !== undefined ? { maxTokens: maxTokens as number } : {}) };
}
// A run is finished once both candidates produced an answer without a request error.
export const runFinished = (record: Experiment) => [record.panelA, record.panelB]
  .every(panel => panel.chatHistory.some(message => message.role === 'model' && !message.isStreaming && !message.error));
export const retryText = (notice: { attempt: number; maxAttempts: number; waitMs: number; reason: string }) =>
  `${notice.reason === 'rate limit' ? 'Rate limited' : 'Provider busy'} — retrying in ${Math.max(1, Math.round(notice.waitMs / 1000))} s (attempt ${notice.attempt} of ${notice.maxAttempts})`;
// Older scenarios have no explicit mode: differing prompts mean a prompt comparison.
export const compareMode = (scenario: Scenario): 'prompts' | 'models' =>
  scenario.compare ?? (scenario.systemPrompt !== (scenario.systemPromptB ?? scenario.systemPrompt) ? 'prompts' : 'models');
export function cleanScenario(input: unknown): Scenario {
  const v = obj(input);
  return { id: str(v.id, crypto.randomUUID()), name: str(v.name), systemPrompt: str(v.systemPrompt ?? v.systemPromptA, ''),
    systemPromptB: str(v.systemPromptB, str(v.systemPrompt ?? v.systemPromptA, '')), isPreloaded: v.isPreloaded === true,
    split: v.split === 'held-out' ? 'held-out' : 'development', ...(v.archived === true ? { archived: true } : {}),
    ...(v.compare === 'prompts' || v.compare === 'models' ? { compare: v.compare } : {}),
    ...(typeof v.theme === 'string' && v.theme.length <= 40 ? { theme: v.theme } : {}),
    informationItems: arr(v.informationItems ?? []).map(entry => {
      const item = obj(entry);
      return { id: str(item.id, crypto.randomUUID()), type: Object.values(InformationType).includes(item.type as InformationType) ? item.type as InformationType : InformationType.File, title: str(item.title), content: str(item.content) };
    }) };
}
function cleanMetadata(v: Record<string, unknown>): GenerationMetadata {
  const result: GenerationMetadata = {};
  if (v.completion) {
    const completion = obj(v.completion);
    if (!['complete', 'truncated', 'blocked', 'unknown'].includes(String(completion.status))) throw new Error('Invalid completion status.');
    result.completion = { status: completion.status as NonNullable<GenerationMetadata['completion']>['status'], ...(typeof completion.reason === 'string' ? { reason: completion.reason } : {}) };
  }
  if (v.usage) {
    const usage = obj(v.usage);
    result.usage = {};
    for (const field of ['inputTokens', 'outputTokens'] as const) if (typeof usage[field] === 'number' && Number.isFinite(usage[field]) && usage[field] >= 0) result.usage[field] = usage[field];
  }
  if (typeof v.latencyMs === 'number' && Number.isFinite(v.latencyMs) && v.latencyMs >= 0) result.latencyMs = v.latencyMs;
  if (typeof v.requestId === 'string') result.requestId = v.requestId;
  if (typeof v.retries === 'number' && Number.isInteger(v.retries) && v.retries > 0) result.retries = v.retries;
  if (v.generationInput) {
    const input = obj(v.generationInput);
    result.generationInput = { system: str(input.system), messages: arr(input.messages).map(entry => {
      const message = obj(entry);
      if (message.role !== 'user' && message.role !== 'assistant') throw new Error('Invalid generation input role.');
      return { role: message.role, content: str(message.content) };
    }) };
  }
  return result;
}
function cleanHistory(input: unknown): ChatMessage[] {
  return arr(input).map(entry => {
    const v = obj(entry);
    if (v.role !== 'user' && v.role !== 'model') throw new Error('Invalid message role.');
    const summary = v.structuredDecision ? obj(v.structuredDecision) : undefined;
    return { role: v.role, content: str(v.content), ...cleanMetadata(v),
      ...(v.modelConfig ? { modelConfig: cleanConfig(v.modelConfig) } : {}),
      ...(typeof v.timestamp === 'string' ? { timestamp: v.timestamp } : {}),
      ...(typeof v.resolvedModel === 'string' ? { resolvedModel: v.resolvedModel } : {}),
      ...(typeof v.error === 'string' ? { error: v.error } : {}),
      ...(typeof v.summaryError === 'string' ? { summaryError: v.summaryError } : {}),
      ...(v.isStreaming ? { error: 'Interrupted response. Start a new run to try again.' } : {}),
      ...(summary ? { structuredDecision: { decision: str(summary.decision), reasoning: str(summary.reasoning), ethicalFramework: str(summary.ethicalFramework), tradeoffs: arr(summary.tradeoffs).map(x => str(x)) } } : {}),
    };
  });
}
function cleanRubric(input: unknown): Rubric {
  const rubric = obj(input);
  const result = { low: str(rubric.low), high: str(rubric.high), criteria: arr(rubric.criteria).map(entry => { const c = obj(entry); return { id: str(c.id), name: str(c.name), description: str(c.description) }; }) };
  if (validateRubric(result).length) throw new Error('Invalid rubric.');
  return result;
}
function cleanHumanRecord(input: unknown): HumanAssessmentRecord {
  const v = obj(input);
  if (!['', 'A', 'B', 'Tie', 'Insufficient evidence'].includes(String(v.verdict))) throw new Error('Invalid human verdict.');
  return { verdict: v.verdict as HumanEvaluation['verdict'], notes: str(v.notes, ''), timestamp: str(v.timestamp, ''),
    ...(typeof v.stimulusFingerprint === 'string' ? { stimulusFingerprint: v.stimulusFingerprint } : {}),
    ...(typeof v.rubricFingerprint === 'string' ? { rubricFingerprint: v.rubricFingerprint } : {}), ...(v.rubric ? { rubric: cleanRubric(v.rubric) } : {}),
    ...(typeof v.blind === 'boolean' ? { blind: v.blind } : {}), ...(typeof v.revealedAt === 'string' ? { revealedAt: v.revealedAt } : {}),
    ...(Array.isArray(v.displayOrder) && v.displayOrder.length === 2 && v.displayOrder.includes('A') && v.displayOrder.includes('B') ? { displayOrder: v.displayOrder as ('A' | 'B')[] } : {}),
  };
}
function cleanHuman(input: unknown): HumanEvaluation {
  const v = obj(input);
  return { ...cleanHumanRecord(v), ...(Array.isArray(v.revisions) ? { revisions: v.revisions.map(cleanHumanRecord) } : {}) };
}
function cleanJudge(input: unknown): JudgeSettings {
  const v = obj(input);
  if (v.mode !== 'pairwise' && v.mode !== 'rubric') throw new Error('Invalid judge mode.');
  if (v.repeats !== undefined && ![1, 2, 3].includes(Number(v.repeats))) throw new Error('Use one to three judge repeats.');
  const result: JudgeSettings = { model: cleanConfig(v.model), mode: v.mode, swap: v.swap === true, structured: v.structured !== false,
    ...(v.repeats !== undefined ? { repeats: Number(v.repeats) as 1 | 2 | 3 } : {}), ...(v.allowIncomplete === true ? { allowIncomplete: true } : {}),
    rubric: cleanRubric(v.rubric) };
  if (validateRubric(result.rubric).length) throw new Error('Invalid rubric.');
  return result;
}
function cleanEvaluation(input: unknown, scenarioContext: NonNullable<CandidateSnapshot['scenarioContext']>): JudgeEvaluation {
  const v = obj(input), candidates = obj(v.candidates), settings = cleanJudge(v.settings);
  const candidate = (id: 'A' | 'B'): CandidateSnapshot => {
    const c = obj(candidates[id]), history = cleanHistory(c.history), originalResponse = str(c.originalResponse);
    const responseIndex = lastResponseIndex(history, originalResponse);
    const context = c.scenarioContext ? obj(c.scenarioContext) : scenarioContext;
    return { config: cleanConfig(c.config), systemPrompt: str(c.systemPrompt), history, response: str(c.response), originalResponse,
      scenarioContext: { name: str(context.name), initialUserPrompt: str(context.initialUserPrompt), informationItems: arr(context.informationItems).map(entry => {
        const item = obj(entry);
        return { type: Object.values(InformationType).includes(item.type as InformationType) ? item.type as InformationType : InformationType.File, title: str(item.title), content: str(item.content) };
      }) },
      ...(responseIndex >= 0 ? { responseIndex } : {}), ...cleanMetadata({ ...history[responseIndex], ...c }),
      ...(typeof c.resolvedModel === 'string' ? { resolvedModel: c.resolvedModel } : history[responseIndex]?.resolvedModel ? { resolvedModel: history[responseIndex].resolvedModel } : {}) };
  };
  return { id: str(v.id), timestamp: str(v.timestamp), settings, human: cleanHuman(v.human), candidates: { A: candidate('A'), B: candidate('B') },
    ...(v.status ? { status: v.status === 'complete' ? 'complete' as const : 'interrupted' as const } : {}),
    calls: arr(v.calls).map(entry => {
      const c = obj(entry), order = arr(c.order);
      if (!order.length || order.length > 2 || order.some(x => x !== 'A' && x !== 'B') || new Set(order).size !== order.length) throw new Error('Invalid candidate order.');
      const raw = str(c.raw);
      let result, error = typeof c.error === 'string' ? c.error : undefined;
      const metadata = cleanMetadata(c);
      if (metadata.completion?.status === 'truncated' || metadata.completion?.status === 'blocked') error ??= `Judge output was ${metadata.completion.status}; raw output preserved.`;
      if (!error) { try { result = parseJudgeResult(raw, settings.mode, settings.rubric, order as ('A' | 'B')[]); } catch { error = 'Invalid saved evaluation; raw output preserved.'; } }
      return { order: order as ('A' | 'B')[], system: str(c.system), prompt: str(c.prompt), raw, result, error, timestamp: str(c.timestamp), ...metadata,
        ...(typeof c.resolvedModel === 'string' ? { resolvedModel: c.resolvedModel } : {}), ...(typeof c.repeat === 'number' && [1, 2, 3].includes(c.repeat) ? { repeat: c.repeat } : {}) };
    }) };
}
// Used for both export and import. Explicit fields exclude credentials and arbitrary injected metadata.
export function cleanExperiment(input: unknown): Experiment {
  const v = obj(input);
  if (v.version !== '1.0' && v.version !== '2.0') throw new Error('Unsupported experiment version.');
  const scenario = cleanScenario(v.scenario), userPrompt = str(v.userPrompt, 'What is your analysis and recommended course of action?');
  const panel = (key: string) => { const p = obj(v[key]); return { config: cleanConfig(p.config ?? p), chatHistory: cleanHistory(p.chatHistory ?? []) }; };
  return { version: '2.0', id: str(v.id, crypto.randomUUID()), timestamp: str(v.timestamp, new Date().toISOString()),
    scenario, userPrompt,
    panelA: panel('panelA'), panelB: panel('panelB'), extractSummary: v.extractSummary === true,
    human: v.human ? cleanHuman(v.human) : { ...emptyHuman(), notes: str(v.studentNotes, '') },
    ...(v.judgeSettings ? { judgeSettings: cleanJudge(v.judgeSettings) } : {}),
    ...(v.protocol ? { protocol: Object.fromEntries(Object.entries(obj(v.protocol)).filter(([key, value]) => ['question', 'hypothesis', 'changedFactor', 'baselineLabel', 'reflection'].includes(key) && typeof value === 'string')) } : {}),
    ...(['live', 'practice', 'calibration'].includes(String(v.source)) ? { source: v.source as Experiment['source'] } : {}),
    ...(typeof v.calibrationHint === 'string' ? { calibrationHint: v.calibrationHint } : {}),
    ...(v.practice ? { practice: { caseId: str(obj(v.practice).caseId), purpose: str(obj(v.practice).purpose), expectedBehavior: str(obj(v.practice).expectedBehavior) } } : {}),
    evaluations: arr(v.evaluations ?? []).map(evaluation => cleanEvaluation(evaluation, { name: scenario.name, initialUserPrompt: userPrompt, informationItems: scenario.informationItems.map(({ type, title, content }) => ({ type, title, content })) })) };
}
export function importExperiments(text: string): Experiment[] {
  if (text.length > 20_000_000) throw new Error('Import is too large (maximum 20 MB).');
  const data: unknown = JSON.parse(text);
  const results = (Array.isArray(data) ? data : [data]).map(cleanExperiment);
  if (!results.length) throw new Error('No experiments in this file.');
  return results;
}
export const exportJSON = (experiments: Experiment[]) => JSON.stringify(experiments.map(cleanExperiment), null, 2);
export function exportCSV(experiments: Experiment[]) {
  const headers = ['experiment_id', 'evaluation_id', 'timestamp', 'scenario', 'split', 'source', 'question', 'hypothesis', 'changed_factor', 'baseline_label', 'reflection',
    'judge_provider', 'judge_model', 'resolved_judge_model', 'mode', 'repeat', 'order', 'rubric_fingerprint', 'stimulus_fingerprint', 'validity',
    'candidate_a_id', 'candidate_a_provider', 'candidate_a_model', 'resolved_candidate_a_model', 'candidate_a_variant', 'candidate_a_completion',
    'candidate_b_id', 'candidate_b_provider', 'candidate_b_model', 'resolved_candidate_b_model', 'candidate_b_variant', 'candidate_b_completion',
    'candidate', 'criterion', 'score', 'verdict', 'human_verdict', 'human_stimulus_fingerprint', 'human_rubric_fingerprint', 'human_comparison', 'human_blind', 'human_revealed_at',
    'explanation', 'error', 'raw_output', 'judge_completion', 'judge_finish_reason', 'judge_input_tokens', 'judge_output_tokens', 'judge_latency_ms'];
  const rows: unknown[][] = [headers];
  for (const exp of experiments.map(cleanExperiment)) for (const ev of exp.evaluations) {
    const base: Record<string, unknown> = {
      experiment_id: exp.id, evaluation_id: ev.id, timestamp: ev.timestamp, scenario: exp.scenario.name, split: exp.scenario.split ?? 'development', source: exp.source ?? 'live',
      question: exp.protocol?.question, hypothesis: exp.protocol?.hypothesis, changed_factor: exp.protocol?.changedFactor, baseline_label: exp.protocol?.baselineLabel, reflection: exp.protocol?.reflection,
      judge_provider: ev.settings.model.provider, judge_model: ev.settings.model.model, mode: ev.settings.mode,
      rubric_fingerprint: rubricFingerprint(ev.settings.rubric), stimulus_fingerprint: stimulusFingerprint(ev.candidates),
      human_verdict: ev.human.verdict, human_stimulus_fingerprint: ev.human.stimulusFingerprint, human_rubric_fingerprint: ev.human.rubricFingerprint, human_blind: ev.human.blind, human_revealed_at: ev.human.revealedAt,
    };
    for (const id of ['A', 'B'] as const) {
      const candidate = ev.candidates[id], prefix = `candidate_${id.toLowerCase()}`;
      base[`${prefix}_id`] = `${exp.id}:${id}`;
      base[`${prefix}_provider`] = candidate.config.provider;
      base[`${prefix}_model`] = candidate.config.model;
      base[`resolved_${prefix}_model`] = candidate.resolvedModel ?? candidate.history[lastResponseIndex(candidate.history, candidate.originalResponse)]?.resolvedModel;
      base[`${prefix}_variant`] = candidate.response === candidate.originalResponse ? 'original' : 'edited';
      base[`${prefix}_completion`] = candidate.completion?.status ?? 'unknown';
    }
    const append = (fields: Record<string, unknown>) => rows.push(headers.map(header => ({ ...base, ...fields })[header] ?? ''));
    if (!ev.calls.length) append({ validity: 'not attempted', error: 'No judge request completed.' });
    for (const call of ev.calls) {
      const shared = {
        resolved_judge_model: call.resolvedModel, repeat: call.repeat, order: call.order.join('/'), validity: call.result && !call.error ? 'valid' : 'failed',
        verdict: call.result?.verdict, error: call.error, raw_output: call.raw, judge_completion: call.completion?.status ?? 'unknown', judge_finish_reason: call.completion?.reason,
        judge_input_tokens: call.usage?.inputTokens, judge_output_tokens: call.usage?.outputTokens, judge_latency_ms: call.latencyMs,
        human_comparison: !ev.human.verdict ? 'not recorded' : !assessmentMatches(ev.human, ev.candidates, ev.settings.rubric) ? 'different or unbound stimulus/rubric'
          : !call.result?.verdict || call.error ? 'unavailable' : ev.human.verdict === call.result.verdict ? 'agreement' : 'disagreement',
      };
      if (call.result?.scores) for (const id of ['A', 'B'] as const) for (const score of call.result.scores[id] ?? []) {
        append({ ...shared, candidate: id, criterion: ev.settings.rubric.criteria.find(c => c.id === score.criterionId)?.name ?? score.criterionId, score: score.score, explanation: score.rationale });
      } else append({ ...shared, explanation: call.result?.explanation });
    }
  }
  // Formula-injection protection for spreadsheet imports; preserve originals in JSON.
  return '\uFEFF' + rows.map(row => row.map(value => { let text = String(value); if (/^[\s]*[=+@-]/.test(text)) text = "'" + text; return `"${text.replace(/"/g, '""')}"`; }).join(',')).join('\r\n');
}
export function downloadFile(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.hidden = true;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give browsers time to acquire the blob before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
