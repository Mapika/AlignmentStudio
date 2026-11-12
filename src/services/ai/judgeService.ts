import type { APIKeys, CandidateId, Experiment, JudgeEvaluation, JudgeSettings } from '../../types';
import { buildJudgePrompt, JUDGE_SYSTEM, judgeOrders, judgeSchema, parseJudgeResult, snapshotCandidates, validateRubric } from '../../utils/judge';
import { complete, effectiveConfig, validateModelConfig } from './index';
import type { AIRequest } from './request';

// Injectable transport makes request counts and position mapping testable without API access.
export async function evaluateExperiment(experiment: Experiment, settings: JudgeSettings, keys: APIKeys,
  overrides: Partial<Record<CandidateId, string>> = {}, signal?: AbortSignal, transport = complete,
  onProgress?: (evaluation: JudgeEvaluation) => void | Promise<void>, onRetry?: AIRequest['onRetry']): Promise<JudgeEvaluation> {
  const errors = validateRubric(settings.rubric);
  if (errors.length) throw new Error(errors.join(' '));
  validateModelConfig(settings.model, keys);
  const frozenExperiment = structuredClone(experiment);
  const candidates = snapshotCandidates(frozenExperiment, overrides, settings.allowIncomplete);
  if (Object.values(candidates).some(c => !c.response.trim())) throw new Error('Evaluation variants cannot be empty.');
  const snapshot = structuredClone({ ...settings, model: effectiveConfig(settings.model) });
  const evaluation: JudgeEvaluation = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), settings: snapshot,
    human: frozenExperiment.human, candidates, calls: [], status: 'running' };
  const orders = judgeOrders(snapshot);
  await onProgress?.(structuredClone(evaluation));
  for (const [index, order] of orders.entries()) {
    if (signal?.aborted) break;
    const call: JudgeEvaluation['calls'][number] = { order, system: JUDGE_SYSTEM,
      prompt: buildJudgePrompt(frozenExperiment, candidates, snapshot, order), raw: '', timestamp: new Date().toISOString(),
      repeat: Math.floor(index / (snapshot.mode === 'rubric' || snapshot.swap ? 2 : 1)) + 1 };
    let transportFailed = false;
    try {
      const response = await transport({ config: snapshot.model, system: call.system, messages: [{ role: 'user', content: call.prompt }],
        ...(snapshot.structured ? { schema: judgeSchema(snapshot.mode, snapshot.rubric) } : {}), signal, onRetry }, keys);
      const { text, ...metadata } = response;
      call.raw = text;
      Object.assign(call, metadata);
      if (call.completion?.status === 'truncated' || call.completion?.status === 'blocked') call.error = `Judge output was ${call.completion.status}. Raw output preserved; no repair request was sent.`;
      else {
        try { call.result = parseJudgeResult(call.raw, snapshot.mode, snapshot.rubric, order); }
        catch { call.error = 'Invalid or incomplete evaluation. Raw output preserved; no repair request was sent.'; }
      }
    } catch (error) {
      call.error = error instanceof Error ? error.message : 'Judge request failed.';
      transportFailed = true;
    }
    evaluation.calls.push(call);
    await onProgress?.(structuredClone(evaluation));
    if (transportFailed) break; // Quota/auth errors must not consume the remaining batch.
  }
  evaluation.status = evaluation.calls.length === orders.length && !signal?.aborted ? 'complete' : 'interrupted';
  await onProgress?.(structuredClone(evaluation));
  return evaluation;
}
