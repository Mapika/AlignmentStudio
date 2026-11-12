import type { CandidateId, Experiment, GenerationMetadata, HumanAssessmentRecord, HumanEvaluation, ModelConfig, Rubric } from '../types';
import { assessmentMatches } from './judge';

const inline = (value: string) => value.replace(/\r?\n/g, ' ').replace(/[\\`*_{}[\]()#+.!|<>]/g, '\\$&');
const textBlock = (value: string) => {
  const longest = Math.max(2, ...Array.from(value.matchAll(/`+/g), match => match[0].length));
  const fence = '`'.repeat(longest + 1);
  return `${fence}text\n${value}\n${fence}`;
};
const field = (label: string, value?: string) => `**${label}:** ${value ? inline(value) : 'Not recorded'}`;
const configText = (config: ModelConfig) => `${inline(config.provider)} / ${inline(config.model)}; temperature ${config.temperature ?? 'provider default'}; maximum output tokens ${config.maxTokens ?? '4096 (application default)'}`;

function metadataLines(metadata: GenerationMetadata & { resolvedModel?: string; timestamp?: string }): string[] {
  const lines = [field('Completion', metadata.completion ? `${metadata.completion.status}${metadata.completion.reason ? ` (${metadata.completion.reason})` : ''}` : 'Unknown / not reported')];
  if (metadata.resolvedModel) lines.push(field('Reported model', metadata.resolvedModel));
  if (metadata.timestamp) lines.push(field('Timestamp', metadata.timestamp));
  if (metadata.usage) lines.push(`**Token usage:** input ${metadata.usage.inputTokens ?? 'not reported'}; output ${metadata.usage.outputTokens ?? 'not reported'}`);
  if (metadata.latencyMs !== undefined) lines.push(`**Request duration:** ${metadata.latencyMs} ms`);
  if (metadata.requestId) lines.push(field('Provider request ID', metadata.requestId));
  return lines;
}

function rubricLines(rubric: Rubric): string[] {
  return [field('Score 1', rubric.low), field('Score 5', rubric.high),
    ...rubric.criteria.map((criterion, index) => `${index + 1}. **${inline(criterion.name)}** (${inline(criterion.id)}): ${inline(criterion.description)}`)];
}

function assessmentLines(human: HumanAssessmentRecord): string[] {
  const lines = [field('Verdict (original candidate identity)', human.verdict || 'Not assessed'), field('Recorded', human.timestamp),
    field('Identity visibility when assessed', human.blind === undefined ? 'Not recorded' : human.blind ? 'Blind review' : 'Identities visible'),
    field('Display order', human.displayOrder?.join(' → ')), field('Identities revealed', human.revealedAt),
    field('Answer fingerprint', human.stimulusFingerprint), field('Rubric fingerprint', human.rubricFingerprint),
    '**Reasoning:**', human.notes ? textBlock(human.notes) : 'No notes recorded.'];
  if (human.rubric) lines.push('**Rubric used for this assessment:**', ...rubricLines(human.rubric));
  return lines;
}

function humanHistoryLines(human: HumanEvaluation): string[] {
  const revisions = human.revisions ?? [];
  return ['### Current assessment', ...assessmentLines(human), '### Earlier assessment records',
    ...(revisions.length ? revisions.flatMap((revision, index) => [`#### Earlier record ${index + 1}`, ...assessmentLines(revision)]) : ['No earlier assessment records.'])];
}

/** A readable evidence report. Only explicit experiment fields are read; API-key
 * configuration and arbitrary imported properties are never serialized. */
export function experimentReport(experiment: Experiment): string {
  const authored = experiment.source === 'practice' || experiment.source === 'calibration';
  const lines = [`# ${inline(experiment.scenario.name)}`, '## Experiment record', field('Record ID', experiment.id), field('Record timestamp', experiment.timestamp),
    field('Provenance', authored ? `${experiment.source}: authored classroom answers, not observed model outputs` : 'Live experiment'),
    field('Scenario purpose', experiment.scenario.split ?? 'development'),
    '**Interpretation:** Judge verdicts are fallible judgments under a specific rubric. Counts and scores are not objective measurements of alignment.',
    '## Research plan', field('Question', experiment.protocol?.question), field('Prediction', experiment.protocol?.hypothesis), field('Changed factor', experiment.protocol?.changedFactor), field('Baseline label', experiment.protocol?.baselineLabel),
    '## Scenario and instructions', '### Initial user request', textBlock(experiment.userPrompt), '### Candidate A system prompt', textBlock(experiment.scenario.systemPrompt),
    '### Candidate B system prompt', textBlock(experiment.scenario.systemPromptB ?? experiment.scenario.systemPrompt), '### Shared evidence'];
  if (!experiment.scenario.informationItems.length) lines.push('No evidence blocks.');
  for (const [index, item] of experiment.scenario.informationItems.entries()) lines.push(`#### ${index + 1}. ${inline(item.title)} (${inline(item.type)})`, textBlock(item.content));

  lines.push('## Candidate responses', authored ? 'The following text was authored for teaching. Provider/model placeholders do not identify a model that generated it.' : 'The text below preserves each saved turn. Completion metadata describes what the provider reported; missing metadata remains unknown.');
  for (const id of ['A', 'B'] as const) {
    const panel = id === 'A' ? experiment.panelA : experiment.panelB;
    lines.push(`### Candidate ${id}`, `**Saved configuration:** ${configText(panel.config)}`);
    if (!panel.chatHistory.length) lines.push('No turns recorded.');
    for (const [index, message] of panel.chatHistory.entries()) {
      lines.push(`#### Turn ${index + 1} · ${message.role === 'user' ? 'User request' : authored ? 'Authored response' : 'Candidate response'}`, textBlock(message.content));
      if (message.role === 'model') {
        if (message.modelConfig) lines.push(`**Generation configuration:** ${configText(message.modelConfig)}`);
        if (!authored) lines.push(...metadataLines(message));
        if (message.isStreaming) lines.push('**State:** In progress at the time this report was created.');
        if (message.error) lines.push(field('Request error', message.error));
        if (message.structuredDecision) lines.push('**Optional response summary (not a judge evaluation):**', field('Decision', message.structuredDecision.decision), field('Reasoning', message.structuredDecision.reasoning), field('Ethical framework', message.structuredDecision.ethicalFramework), ...message.structuredDecision.tradeoffs.map(tradeoff => `- ${inline(tradeoff)}`));
        if (message.summaryError) lines.push(field('Optional summary error', message.summaryError));
      }
    }
  }

  lines.push('## Human assessment and revision history', ...humanHistoryLines(experiment.human), '## Judge evaluations');
  if (!experiment.evaluations.length) lines.push('No judge evaluations were run.');
  for (const [index, evaluation] of experiment.evaluations.entries()) {
    const settings = evaluation.settings;
    lines.push(`### Evaluation ${index + 1}`, field('Evaluation ID', evaluation.id), field('Recorded', evaluation.timestamp), field('Evaluation state', evaluation.status ?? 'Not recorded'),
      `**Judge configuration:** ${configText(settings.model)}`, field('Mode', settings.mode === 'pairwise' ? 'Pairwise comparison' : 'Independent rubric scores'),
      `**Requested trials:** ${settings.repeats ?? 1}; position swap ${settings.swap ? 'enabled' : 'disabled'}; structured output ${settings.structured ? 'requested' : 'not requested'}; incomplete candidates ${settings.allowIncomplete ? 'explicitly included' : 'not included'}`,
      '#### Evaluation rubric', ...rubricLines(settings.rubric), '#### Answers evaluated');
    for (const id of ['A', 'B'] as const) {
      const candidate = evaluation.candidates[id];
      lines.push(`**Original candidate ${id}:** ${configText(candidate.config)}`, `**${candidate.response === candidate.originalResponse ? 'Original answer' : 'Edited evaluation copy'}:**`, textBlock(candidate.response));
      if (candidate.response !== candidate.originalResponse) lines.push('**Preserved original answer:**', textBlock(candidate.originalResponse));
      if (!authored) lines.push(...metadataLines(candidate));
    }
    lines.push('#### Human assessment captured for this evaluation', ...assessmentLines(evaluation.human),
      assessmentMatches(evaluation.human, evaluation.candidates, settings.rubric) ? '**Comparability:** Human assessment refers to these answer snapshots and this rubric.' : '**Comparability:** No matching human assessment of these exact answer snapshots and rubric was recorded. Do not count this as human–judge agreement or disagreement.');
    if (!evaluation.calls.length) lines.push('No judge calls were recorded.');
    for (const [callIndex, call] of evaluation.calls.entries()) {
      lines.push(`#### Judge call ${callIndex + 1} · trial ${call.repeat ?? 1}`, field('Presented order (original identities)', call.order.join(' → ')), ...metadataLines(call));
      if (call.error || !call.result) {
        lines.push(field('Outcome', call.error || 'No valid parsed result was recorded.'), 'This call is not a valid scored judgment. Inspect the complete JSON export for the raw response and exact request.');
        continue;
      }
      if (call.result.verdict) lines.push(field('Verdict (original candidate identity)', call.result.verdict));
      lines.push('**Judge explanation:**', textBlock(call.result.explanation));
      for (const candidateId of ['A', 'B'] as CandidateId[]) {
        const scores = call.result.scores?.[candidateId];
        if (!scores) continue;
        lines.push(`**Candidate ${candidateId} criterion scores:**`);
        const table = ['| Criterion | Score (1–5) | Rationale |', '| --- | --- | --- |'];
        for (const score of scores) {
          const name = settings.rubric.criteria.find(criterion => criterion.id === score.criterionId)?.name ?? score.criterionId;
          table.push(`| ${inline(name)} | ${score.score} | ${inline(score.rationale)} |`);
        }
        lines.push(table.join('\n'));
      }
    }
  }

  lines.push('## Reflection', experiment.protocol?.reflection ? textBlock(experiment.protocol.reflection) : 'No reflection recorded.');
  if (authored && experiment.calibrationHint) lines.push('## Teaching note', textBlock(experiment.calibrationHint), 'This authored control illustrates a narrow question. It does not validate a judge for other tasks or supply a universal moral answer key.');
  lines.push('## Evidence and limitations', 'This readable report preserves the saved answers and presents structured judgments as prose and tables. Export JSON alongside it for exact generation inputs, full conversation snapshots, raw judge inputs and outputs, and machine-readable metadata. API-key configuration is excluded; text deliberately entered into the experiment remains part of its evidence.', 'Model aliases, provider behavior, small samples, incomplete blinding, and subjective rubric choices limit reproducibility and interpretation.');
  return `${lines.join('\n\n')}\n`;
}
