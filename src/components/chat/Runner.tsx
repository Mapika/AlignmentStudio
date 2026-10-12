import { useEffect, useRef, useState } from 'react';
import { AIProvider, getDefaultChatModel, type ModelOption } from '../../config';
import type { APIKeys, CandidateId, ChatMessage, Experiment, ExperimentProtocol, ModelConfig, Scenario } from '../../types';
import { effectiveConfig, extractStructuredDecision, runChatTestStream, validateModelConfig } from '../../services/ai';
import { cleanConfig, compareMode, downloadFile, emptyHuman, exportCSV, exportJSON, retryText, runFinished } from '../../utils/experiments';
import { useAdvanced } from '../../hooks/useAdvanced';
import { retryPolicy } from '../../services/ai/request';
import { Why } from '../Why';
import { compareExperimentInputs } from '../../utils/judge';
import { experimentReport } from '../../utils/report';
import { ModelSelector } from '../ModelSelector';
import { ProtocolCard } from '../experiments/ProtocolCard';
import { ChatPanel } from './ChatPanel';
import { JudgePanel } from '../judge/JudgePanel';

export interface RunnerDraft {
  configA: ModelConfig; configB: ModelConfig; prompt: string; protocol: ExperimentProtocol;
  blindReview: boolean; extractSummary: boolean; repeats: number;
}
interface Props {
  scenario: Scenario; apiKeys: APIKeys; modelOptions: Record<AIProvider, ModelOption[]>;
  ollamaModelError: string | null; refreshOllama: () => void;
  experiments: Experiment[]; onSave: (experiment: Experiment, checkpoint?: boolean) => Promise<Experiment>;
  onBusy: (busy: boolean) => void; initialRecordId?: string; onNotebook: () => void; onOpenSettings?: () => void; onEditScenario?: () => void;
  initialDraft?: RunnerDraft; onDraftChange: (scenarioId: string, draft: RunnerDraft) => void;
}
const randomOrder = (): CandidateId[] => crypto.getRandomValues(new Uint8Array(1))[0] % 2 ? ['B', 'A'] : ['A', 'B'];
const authoredModel = (config: ModelConfig) => config.model === 'classroom-authored-example';
export function Runner({ scenario, apiKeys, modelOptions, ollamaModelError, refreshOllama, experiments, onSave, onBusy, initialRecordId, initialDraft, onDraftChange, onOpenSettings, onEditScenario }: Props) {
  const advanced = useAdvanced();
  const compare = compareMode(scenario);
  const relevant = experiments.filter(e => e.scenario.id === scenario.id);
  const latest = relevant.find(e => e.id === initialRecordId) ?? [...relevant].reverse().find(runFinished) ?? relevant[relevant.length - 1];
  const draft = initialDraft;
  const [selectedId, setSelectedId] = useState(latest?.id ?? '');
  const experiment = experiments.find(e => e.id === selectedId);
  const [configA, setConfigA] = useState<ModelConfig>(draft?.configA ?? latest?.panelA.config ?? { provider: AIProvider.Gemini, model: getDefaultChatModel(AIProvider.Gemini) });
  const [configB, setConfigB] = useState<ModelConfig>(draft?.configB ?? latest?.panelB.config ?? { provider: AIProvider.Gemini, model: getDefaultChatModel(AIProvider.Gemini) });
  const [prompt, setPrompt] = useState(draft?.prompt ?? latest?.userPrompt ?? 'What is your analysis and recommended course of action?');
  const [protocol, setProtocol] = useState<ExperimentProtocol>(draft?.protocol ?? latest?.protocol ?? {});
  const [blindReview, setBlindReview] = useState(draft?.blindReview ?? true);
  const runConfigB = compare === 'prompts' ? configA : configB;
  const [extractSummary, setExtractSummary] = useState(draft?.extractSummary ?? latest?.extractSummary ?? false);
  const [repeats, setRepeats] = useState(draft?.repeats ?? 1);
  useEffect(() => { onDraftChange(scenario.id, { configA, configB, prompt, protocol, blindReview, extractSummary, repeats }); }, [scenario.id, configA, configB, prompt, protocol, blindReview, extractSummary, repeats, onDraftChange]);
  const [busy, setBusy] = useState(false);
  const [judgeBusy, setJudgeBusy] = useState(false);
  const [activePanel, setActivePanel] = useState<CandidateId | null>(null);
  const [inputs, setInputs] = useState({ A: '', B: '' });
  const [error, setError] = useState('');
  const [retryNote, setRetryNote] = useState('');
  const controller = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const disabled = busy || judgeBusy;
  const hidden = !!experiment?.human.blind && !experiment.human.revealedAt;
  const authored = experiment?.source === 'practice' || experiment?.source === 'calibration';
  const order: CandidateId[] = hidden && experiment?.human.displayOrder?.length === 2 ? experiment.human.displayOrder : ['A', 'B'];
  const judgeSetBusy = (value: boolean) => { setJudgeBusy(value); onBusy(value); };
  async function save(record: Experiment, checkpoint = true) {
    const saved = await onSave(record, checkpoint);
    if (saved.id !== record.id) setSelectedId(saved.id);
    return saved;
  }
  async function generate(record: Experiment, id: CandidateId, message: string, signal: AbortSignal): Promise<Experiment> {
    const panelKey = id === 'A' ? 'panelA' : 'panelB';
    const panel = record[panelKey];
    const history = panel.chatHistory;
    const timestamp = new Date().toISOString();
    const answer: ChatMessage = { role: 'model', content: '', isStreaming: true, modelConfig: panel.config, timestamp };
    const next: Experiment = { ...record, [panelKey]: { ...panel, chatHistory: [...history, { role: 'user', content: message, timestamp }, answer] } };
    setActivePanel(id);
    const checkpoint = await save(structuredClone(next));
    next.id = checkpoint.id;
    let lastPaint = 0;
    try {
      const result = await runChatTestStream(panel.config, apiKeys, id === 'A' ? record.scenario.systemPrompt : (record.scenario.systemPromptB ?? record.scenario.systemPrompt),
        record.scenario.informationItems, history, message, chunk => {
          answer.content += chunk;
          if (performance.now() - lastPaint > 80) { lastPaint = performance.now(); void save(structuredClone(next), false); }
        }, signal, notice => setRetryNote(retryText(notice)));
      setRetryNote('');
      const { text, ...metadata } = result;
      Object.assign(answer, metadata, { content: text, isStreaming: false });
      // A completed answer is durable before optional summary work starts.
      const completed = await save(structuredClone(next)); next.id = completed.id;
      if (record.extractSummary && !signal.aborted && !['blocked', 'truncated'].includes(answer.completion?.status ?? '')) {
        try { answer.structuredDecision = await extractStructuredDecision(panel.config, apiKeys, answer.content, signal); }
        catch (e) { answer.summaryError = e instanceof Error ? e.message : 'Summary unavailable.'; }
      }
    } catch (e) { answer.error = e instanceof Error ? e.message : 'Request failed.'; setError(answer.error); setRetryNote(''); }
    finally { answer.isStreaming = false; const saved = await save(structuredClone(next)); next.id = saved.id; }
    return next;
  }
  async function start() {
    if (locked.current || disabled || !prompt.trim()) return;
    setError('');
    try { for (const c of [configA, runConfigB]) { if (authoredModel(c)) throw new Error('Choose a real model for both candidates before generating live answers.'); cleanConfig(c); validateModelConfig(c, apiKeys); } }
    catch (e) { setError((e as Error).message); return; }
    locked.current = true; setBusy(true); onBusy(true);
    controller.current = new AbortController();
    const signal = controller.current.signal;
    const scenarioSnapshot = structuredClone(compare === 'models' ? { ...scenario, systemPromptB: scenario.systemPrompt, compare } : { ...scenario, compare });
    const judgeSettings = experiment?.judgeSettings ? structuredClone(experiment.judgeSettings) : undefined;
    try {
      for (let i = 0; i < repeats && !signal.aborted; i++) {
        let record: Experiment = { version: '2.0', id: crypto.randomUUID(), timestamp: new Date().toISOString(),
          scenario: scenarioSnapshot, userPrompt: prompt, panelA: { config: effectiveConfig(configA), chatHistory: [] },
          panelB: { config: effectiveConfig(runConfigB), chatHistory: [] }, extractSummary,
          human: { ...emptyHuman(), blind: blindReview, displayOrder: blindReview ? randomOrder() : ['A', 'B'] },
          protocol: { ...structuredClone(protocol), changedFactor: protocol.changedFactor || (compare === 'prompts' ? 'System prompt' : 'Candidate model'), reflection: '' }, source: 'live', judgeSettings, evaluations: [] };
        setSelectedId(record.id);
        record = await generate(record, 'A', prompt, signal);
        if (record.panelA.chatHistory.some(m => m.error || ['blocked', 'truncated'].includes(m.completion?.status ?? '')) || signal.aborted) {
          if (!signal.aborted) setError('Stopped after an error or incomplete answer. Completed evidence has been saved.');
          break;
        }
        record = await generate(record, 'B', prompt, signal);
        const answers = [...record.panelA.chatHistory, ...record.panelB.chatHistory];
        if (answers.some(m => m.error || ['blocked', 'truncated'].includes(m.completion?.status ?? ''))) { setError('Batch stopped after an error or incomplete answer. Completed evidence has been saved.'); break; }
      }
    } finally { locked.current = false; setBusy(false); onBusy(false); setActivePanel(null); controller.current = null; }
  }
  async function followup(id: CandidateId) {
    if (!experiment || authored || hidden || disabled || locked.current || !inputs[id].trim()) return;
    locked.current = true; setBusy(true); onBusy(true); setError('');
    controller.current = new AbortController();
    const { revisions = [], ...prior } = experiment.human;
    try {
      await generate({ ...experiment, human: { ...emptyHuman(), blind: experiment.human.blind, displayOrder: experiment.human.blind ? randomOrder() : ['A', 'B'], revisions: prior.verdict || prior.notes ? [...revisions, prior] : revisions } }, id, inputs[id], controller.current.signal);
      setInputs(prev => ({ ...prev, [id]: '' }));
    } finally { locked.current = false; setBusy(false); onBusy(false); setActivePanel(null); controller.current = null; }
  }
  function selectRecord(id: string) {
    const record = experiments.find(e => e.id === id);
    if (!record) return;
    setSelectedId(id); setConfigA(record.panelA.config); setConfigB(record.panelB.config); setPrompt(record.userPrompt);
    setProtocol(record.protocol ?? {}); setExtractSummary(record.extractSummary); setInputs({ A: '', B: '' }); setError('');
  }
  const answered = (id: CandidateId) => !!experiment?.[id === 'A' ? 'panelA' : 'panelB'].chatHistory.some(m => m.role === 'model' && !m.isStreaming && !m.error);
  const steps = [
    { id: 'plan', label: 'Plan', done: !!protocol.question?.trim() || authored, available: true },
    { id: experiment ? 'responses' : 'generate', label: authored ? 'Read' : 'Run', done: answered('A') && answered('B'), available: true },
    { id: 'assess', label: 'Assess', done: !!experiment?.human.verdict || !!experiment?.human.revealedAt, available: !!experiment },
    { id: 'judge-review', label: 'Judge', done: !!experiment?.evaluations.length, available: !!experiment && !hidden },
    { id: 'reflect', label: 'Reflect', done: !!experiment?.protocol?.reflection?.trim(), available: !!experiment },
  ];
  const current = steps.find(step => !step.done)?.id;
  const incompleteRun = !!experiment && !busy && !(answered('A') && answered('B'));
  const readiness = (() => {
    if (!prompt.trim()) return 'Write the initial user request first.';
    try {
      for (const config of [configA, runConfigB]) {
        if (authoredModel(config)) return 'Choose a real model for both candidates.';
        validateModelConfig(config, apiKeys);
      }
      return '';
    } catch (e) { return (e as Error).message; }
  })();
  const jumpTo = (id: string) => {
    const target = document.getElementById(id) ?? document.getElementById('assess');
    for (let node = target?.parentElement; node; node = node.parentElement) if (node instanceof HTMLDetailsElement) node.open = true;
    if (target instanceof HTMLDetailsElement) target.open = true;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const changes = experiment ? compareExperimentInputs(experiment, { ...experiment, scenario, userPrompt: prompt, panelA: { ...experiment.panelA, config: effectiveConfig(configA) }, panelB: { ...experiment.panelB, config: effectiveConfig(runConfigB) } }) : [];
  const scenarioSummary = <section className="section" id="scenario" aria-labelledby="scenario-heading">
    <div className="section-head"><span className="eyebrow">Step 1 · Plan</span><h2 id="scenario-heading" className="section-title">The scenario</h2><p className="help">{compare === 'prompts' ? 'Comparing two system prompts on the same model.' : 'Comparing two models with the same system prompt.'}</p>{onEditScenario && <button type="button" className="btn-secondary" onClick={onEditScenario}>Edit scenario</button>}</div>
    <div className="section-body">
      {compare === 'prompts' ? <div className="split">{(['A', 'B'] as const).map(id => <div key={id} className="doc"><p className="flex items-center gap-2 font-semibold"><span className={`cand cand-${id}`} aria-hidden="true">{id}</span>Candidate {id} · system prompt</p><p className="mt-1 text-[15px] leading-relaxed whitespace-pre-wrap">{(id === 'A' ? scenario.systemPrompt : scenario.systemPromptB ?? scenario.systemPrompt) || 'No system prompt.'}</p></div>)}</div>
        : <div className="doc"><p className="font-semibold">System prompt for both candidates</p><p className="mt-1 text-[15px] leading-relaxed whitespace-pre-wrap">{scenario.systemPrompt || 'No system prompt.'}</p></div>}
      {scenario.informationItems.map(item => <article key={item.id} className="doc"><h3 className="flex flex-wrap items-baseline gap-x-2 font-semibold">{item.title || item.type}<span className="tag">{item.type}</span></h3><p className="mt-1 text-[15px] leading-relaxed whitespace-pre-wrap">{item.content}</p></article>)}
    </div>
  </section>;
  const plan = <div>
    {!experiment && scenarioSummary}
    <ProtocolCard value={protocol} onChange={setProtocol} scenario={scenario} configA={configA} configB={runConfigB} disabled={disabled} />
    <section className="section" id="generate" aria-labelledby="candidates-heading">
      <div className="section-head"><span className="eyebrow">Step 2 · Run</span><h2 id="candidates-heading" className="section-title">{compare === 'prompts' ? 'Model' : 'Models'}</h2><p className="help">{compare === 'prompts' ? 'Both candidates use this model, so only the prompt differs.' : 'Pick a different model for each candidate.'}</p></div>
      <div className="section-body">{compare === 'prompts'
        ? <div className="max-w-xl"><ModelSelector label="Model for both candidates" config={configA} onChange={setConfigA} models={modelOptions} keys={apiKeys} disabled={disabled} ollamaError={ollamaModelError} refreshOllama={refreshOllama} onOpenSettings={onOpenSettings} /></div>
        : <div className="split"><ModelSelector label="Candidate A" config={configA} onChange={setConfigA} models={modelOptions} keys={apiKeys} disabled={disabled} ollamaError={ollamaModelError} refreshOllama={refreshOllama} onOpenSettings={onOpenSettings} /><ModelSelector label="Candidate B" config={configB} onChange={setConfigB} models={modelOptions} keys={apiKeys} disabled={disabled} ollamaError={ollamaModelError} refreshOllama={refreshOllama} onOpenSettings={onOpenSettings} /></div>}</div>
    </section>
    <section className="section" aria-labelledby="request-heading">
      <div className="section-head"><h2 id="request-heading" className="section-title">Request</h2><p className="help">What the user asks. Both candidates get the same request and evidence.</p></div>
      <div className="section-body">
        <label className="block">Initial user request<textarea className="field" rows={3} disabled={disabled} value={prompt} onChange={e => setPrompt(e.target.value)} /></label>
        <div><label className="flex items-start"><input className="mt-1" type="checkbox" disabled={disabled} checked={blindReview} onChange={e => setBlindReview(e.target.checked)} /><span>Blind human review: shuffle and hide which candidate wrote which answer until you assess.</span></label>
          <Why>If you know which answer came from which prompt or model, that knowledge can colour your judgment. Hiding it until you have recorded your view keeps your assessment closer to the answers themselves.</Why></div>
        {advanced && <details className="fold"><summary>Repeats and summaries</summary><fieldset disabled={disabled} className="space-y-4"><label className="block max-w-xs">Repeat the whole run<select className="field" value={repeats} onChange={e => setRepeats(Number(e.target.value))}>{[1, 2, 3].map(n => <option key={n} value={n}>{n} {n === 1 ? 'time' : 'times'}</option>)}</select></label><label className="flex items-start"><input className="mt-1" type="checkbox" checked={extractSummary} onChange={e => setExtractSummary(e.target.checked)} /><span>Extract a structured summary of each answer (one extra request per answer)</span></label><p className="help">Repeating the run asks for fresh answers each time. To test the judge on the same two answers, use judge repeats instead. A batch stops at the first error or cut-off answer.</p></fieldset></details>}
        {advanced && changes.length > 0 && <details className="fold"><summary>{changes.length} input change(s) since the selected run</summary><ul className="help list-disc pl-5 space-y-1">{changes.map(change => <li key={change.field}>{change.field}</li>)}</ul><p className="help mt-2">Running creates new evidence and keeps the selected run intact.</p></details>}
        {scenario.split === 'held-out' && <p className="callout is-accent">Final test scenario: keep your prompts and rubric fixed from here on.</p>}
        <div className="flex flex-wrap items-center gap-4 pt-2"><button className="btn" disabled={disabled || !!readiness} aria-describedby="generate-status" onClick={() => void start()}>{experiment ? 'Generate a new run' : 'Generate responses'} →</button><p className="help" id="generate-status">{readiness ? <span className="text-[var(--ink)]">{readiness}</span> : <>{repeats * (extractSummary ? 4 : 2)} model requests · rate limits are retried up to {retryPolicy.maxAttempts - 1} times</>}</p>{readiness && onOpenSettings && /key|Settings/i.test(readiness) && <button type="button" className="text-button" onClick={onOpenSettings}>Open Connections</button>}</div>
      </div>
    </section>
  </div>;
  return <main className="runner">
    <header className="page-header"><div><span className="eyebrow">{authored ? 'Classroom example' : 'Experiment'} · {(experiment?.scenario ?? scenario).split === 'held-out' ? 'Final test' : 'Development'}</span><h1 className="mt-3">{experiment?.scenario.name ?? scenario.name}</h1>{authored && <p>Read the evidence, assess the answers, then reveal the teaching note. No key needed.</p>}</div></header>
    <nav className="progress-rail" aria-label="Experiment progress"><ol>{steps.map((step, index) => { const content = <><span className="dot" aria-hidden="true">{step.done ? '✓' : index + 1}</span><span className="step-label">{step.label}</span>{step.done && <span className="sr-only"> (done)</span>}</>; return <li key={step.label} className={`${step.done ? 'is-done' : step.id === current ? 'is-current' : ''} ${step.available ? '' : 'is-unavailable'}`}>{step.available ? <a href={`#${step.id}`} aria-current={step.id === current ? 'step' : undefined} onClick={event => { event.preventDefault(); jumpTo(step.id); }}>{content}</a> : <span className="step" title="Available after you generate responses" aria-current={step.id === current ? 'step' : undefined}>{content}<span className="sr-only"> (available after you generate responses)</span></span>}</li>; })}</ol></nav>

    {!experiment ? plan : hidden && !incompleteRun ? <p className="callout my-8" id="plan">Which candidate wrote which answer is hidden until you record your own assessment.</p> : <details className="fold mt-6" open={incompleteRun}><summary>{incompleteRun ? 'This run did not finish — change the settings and try again' : 'New run settings'}</summary>{plan}</details>}
    {busy && <div className="callout is-accent my-6 flex flex-wrap items-center justify-between gap-3" role="status"><span>{retryNote || <>Generating {hidden ? `response ${order.indexOf(activePanel ?? 'A') + 1}` : `candidate ${activePanel}`}… Completed answers are saved immediately.</>}</span><button className="btn-secondary" onClick={() => controller.current?.abort()}>Stop remaining requests</button></div>}
    {error && <div role="alert" className="error my-6"><p>{error}</p>{onOpenSettings && /key|Settings|Ollama|reach|quota|401|403|429/i.test(error) && <button type="button" className="text-button" onClick={onOpenSettings}>Open Connections</button>}</div>}
    {experiment && <>
      <section className="section" aria-labelledby="evidence-view-heading">
        <div className="section-head"><h2 id="evidence-view-heading" className="section-title">What both candidates saw</h2><p className="help">The same request and information blocks went to each candidate.</p></div>
        <div className="section-body"><div className="doc"><p className="tag">Request</p><p className="mt-1 font-medium">{experiment.userPrompt}</p></div>{experiment.scenario.informationItems.map(item => <article key={item.id} className="doc"><h3 className="flex flex-wrap items-baseline gap-x-2 font-semibold">{item.title || item.type}<span className="tag">{item.type}</span></h3><p className="mt-1 text-[15px] leading-relaxed whitespace-pre-wrap">{item.content}</p></article>)}</div>
      </section>
      <section className="border-t border-[var(--line)] py-9" id="responses" aria-labelledby="responses-heading">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><span className="eyebrow">Step 2 · {authored ? 'Read' : 'Run'}</span><h2 id="responses-heading" className="section-title mt-2">Compare the answers</h2></div><div className="flex flex-wrap items-end gap-3"><label className="w-[min(26rem,100%)]">Saved run<select className="field" disabled={disabled} value={selectedId} onChange={e => selectRecord(e.target.value)}>{(() => { const label = (e: Experiment) => `Run ${relevant.indexOf(e) + 1} · ${new Date(e.timestamp).toLocaleString()}${e.source === 'practice' || e.source === 'calibration' ? ' · Authored example' : ''}`; const done = relevant.filter(runFinished), failed = relevant.filter(e => !runFinished(e)); return <>{done.map(e => <option key={e.id} value={e.id}>{label(e)}</option>)}{failed.length > 0 && <optgroup label="Did not finish">{failed.map(e => <option key={e.id} value={e.id}>{label(e)} · did not finish</option>)}</optgroup>}</>; })()}</select></label><span className="badge mb-3">{experiment.evaluations.length} judge evaluation(s)</span></div></div>
        <div className="split">{order.map((id, index) => { const panel = id === 'A' ? experiment.panelA : experiment.panelB; return <ChatPanel key={id} panelId={id} displayLabel={hidden ? `Response ${index + 1}` : `Candidate ${id}`} hideIdentity={hidden} authored={authored} systemPrompt={id === 'A' ? experiment.scenario.systemPrompt : experiment.scenario.systemPromptB ?? experiment.scenario.systemPrompt} chatHistory={panel.chatHistory} config={panel.config} inputValue={inputs[id]} onInputChange={value => setInputs(prev => ({ ...prev, [id]: value }))} onSend={() => void followup(id)} disabled={disabled} requestCount={experiment.extractSummary ? 2 : 1} />; })}</div>
      </section>
      <div id="assess"><JudgePanel key={experiment.id + ':' + experiment.panelA.chatHistory.length + ':' + experiment.panelB.chatHistory.length} experiment={experiment} onChange={async record => { await save(record); }} apiKeys={apiKeys} models={modelOptions} disabled={busy} setBusy={judgeSetBusy} ollamaError={ollamaModelError} refreshOllama={refreshOllama} onOpenSettings={onOpenSettings} /></div>
      <section className="section" id="reflect" aria-labelledby="reflect-heading"><div className="section-head"><span className="eyebrow">Step 5 · Reflect</span><h2 id="reflect-heading" className="section-title">What did you learn?</h2><p className="help">Was your prediction supported? What else could explain the result? What would you test next?</p></div><div className="section-body"><label className="block">Reflection<textarea className="field" rows={5} disabled={disabled} placeholder="Write what changed your mind, what remains uncertain, and the next test that could challenge your interpretation." value={experiment.protocol?.reflection ?? ''} onChange={e => { void save({ ...experiment, protocol: { ...experiment.protocol, reflection: e.target.value } }); }} /></label><p className="help">Saved with this run as you type.</p></div></section>
      {!hidden && <section className="section border-b border-[var(--line)]" aria-labelledby="export-heading"><div className="section-head"><h2 id="export-heading" className="section-title">Export</h2><p className="help">The readable report is a draft for your write-up. JSON keeps the full evidence; CSV is for spreadsheets. API keys are never included.</p></div><div className="section-body"><div className="flex flex-wrap gap-2"><button className="btn-secondary" disabled={disabled} onClick={() => downloadFile(exportJSON(relevant), 'alignment-experiments.json', 'application/json')}>Export JSON · {relevant.length} run(s)</button><button className="btn-secondary" disabled={disabled} onClick={() => downloadFile(exportCSV(relevant), 'alignment-judgments.csv', 'text/csv;charset=utf-8')}>Export judge CSV</button><button className="btn-secondary" disabled={disabled} onClick={() => downloadFile(experimentReport(experiment), 'alignment-report.md', 'text/markdown')}>Export readable report</button></div>{advanced && <details className="fold border-b border-[var(--line)]"><summary>Saved scenario and system prompts</summary><pre className="evidence">{JSON.stringify(experiment.scenario, null, 2)}</pre></details>}</div></section>}
    </>}
  </main>;
}
