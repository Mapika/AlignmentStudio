import { useState } from 'react';
import type { Experiment } from '../../types';
import { downloadFile, exportCSV, exportJSON, runFinished } from '../../utils/experiments';
import { GroupedResults } from './GroupedResults';
import { useAdvanced } from '../../hooks/useAdvanced';
interface Props { experiments: Experiment[]; onOpen: (record: Experiment) => void; onBranch: (record: Experiment) => void; onImport: (file?: File) => void }
export function ExperimentNotebook({ experiments, onOpen, onBranch, onImport }: Props) {
  const advanced = useAdvanced();
  const [query, setQuery] = useState('');
  const [purpose, setPurpose] = useState('all');
  const filtered = experiments.filter(e => `${e.scenario.name} ${e.protocol?.question ?? ''}`.toLowerCase().includes(query.toLowerCase()) && (purpose === 'all' || purpose === (e.scenario.split ?? 'development')));
  // Runs that never produced both answers stay in the record (every attempt counts) but out of the way.
  const finished = filtered.filter(runFinished);
  const unfinished = filtered.filter(record => !runFinished(record));
  const calls = filtered.flatMap(e => e.evaluations.flatMap(ev => ev.calls));
  const valid = calls.filter(c => c.result && !c.error).length;
  const exportRecords = (format: 'json' | 'csv') => downloadFile(format === 'json' ? exportJSON(filtered) : exportCSV(filtered), `alignment-notebook.${format}`, format === 'json' ? 'application/json' : 'text/csv;charset=utf-8');
  const row = (record: Experiment) => {
    const hidden = !!record.human.blind && !record.human.revealedAt;
    const done = runFinished(record);
    const recordCalls = record.evaluations.flatMap(evaluation => evaluation.calls);
    const recordValid = recordCalls.filter(call => call.result && !call.error).length;
    const failure = [record.panelA, record.panelB].flatMap(panel => panel.chatHistory).find(message => message.error)?.error;
    const status = !done ? 'Did not finish' : hidden ? 'Blind review pending' : record.evaluations.length ? `Judged · ${recordValid} of ${recordCalls.length} calls valid` : record.human.verdict ? 'Assessed' : 'Revealed · not yet assessed';
    return <article className="border-t border-[var(--line)] py-7" key={record.id}>
      <div className="flex flex-wrap justify-between gap-3"><div className="min-w-0"><h2 className="card-title">{record.scenario.name}</h2><p className="mt-2 flex flex-wrap gap-1.5"><span className="tag">{new Date(record.timestamp).toLocaleString()}</span><span className="tag">{record.scenario.split === 'held-out' ? 'final test' : 'development'}</span>{record.source && record.source !== 'live' && <span className="tag">authored example</span>}{record.id.includes('-recovered-') && <span className="tag">recovered version</span>}</p><p className={`mt-2 inline-flex items-center gap-2 text-sm font-medium ${hidden && done ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}><span className={`key-dot ${!done ? 'is-missing' : hidden ? 'is-pending' : record.evaluations.length ? 'is-ok' : ''}`} aria-hidden="true" />{status}</p></div><button className="btn-secondary self-start" onClick={() => onOpen(record)}>Open evidence →</button></div>
      {!done && failure && <p className="help mt-2">{failure}</p>}
      {done && record.protocol?.question && <p className="mt-3 font-medium">{record.protocol.question}</p>}
      {record.protocol?.reflection && <p className="help mt-2 whitespace-pre-wrap">{record.protocol.reflection}</p>}
      {done && <details className="mt-2"><summary>{record.evaluations.length} judge {record.evaluations.length === 1 ? 'evaluation' : 'evaluations'} · details</summary><p className="help">{hidden ? 'Blind review pending. Open the evidence to assess the answers.' : `${record.panelA.config.model} / ${record.panelB.config.model}`}</p>{advanced && <p className="help break-all">Run {record.id}</p>}<button className="text-button" onClick={() => onBranch(record)}>Branch this setup</button></details>}
    </article>;
  };
  return <main className="page-width">
    <header className="page-header"><div><span className="eyebrow">Evidence log</span><h1 className="mt-3">Experiment notebook</h1><p>Every run you have made, including archived scenarios and attempts that did not finish.</p></div></header>
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] py-5">
      <p className="text-[15px]"><strong>{finished.length}</strong> finished {finished.length === 1 ? 'run' : 'runs'}{unfinished.length > 0 && <> · {unfinished.length} unfinished</>} · {calls.length ? <><strong>{valid}</strong> of {calls.length} judge {calls.length === 1 ? 'call' : 'calls'} valid</> : 'no judge calls yet'}</p>
      <div className="flex flex-wrap items-center gap-2"><button className="btn-secondary" disabled={!filtered.length} onClick={() => exportRecords('json')}>Export JSON · {filtered.length}</button><button className="btn-secondary" disabled={!filtered.length} onClick={() => exportRecords('csv')}>Export CSV</button><label className="btn-secondary cursor-pointer">Import JSON…<input className="sr-only" type="file" accept=".json,application/json" aria-label="Import saved experiments (JSON)" onChange={e => { onImport(e.target.files?.[0]); e.target.value = ''; }} /></label></div>
    </div>
    <p className="help -mt-2 pb-4">Exports include every run matching the filters below, unfinished ones too. API keys are never included.</p>
    <div className="flex flex-wrap gap-4 items-end border-t border-[var(--line)] py-6"><label className="flex-1 min-w-[220px]">Find an experiment<input className="field" placeholder="Scenario or research question" value={query} onChange={e => setQuery(e.target.value)} /></label><label>Scenario purpose<select className="field" value={purpose} onChange={e => setPurpose(e.target.value)}><option value="all">All experiments</option><option value="development">Development</option><option value="held-out">Final test (held-out)</option></select></label></div>
    {finished.some(record => record.evaluations.length && (!record.human.blind || record.human.revealedAt)) && <details className="fold"><summary>Compare judge results across runs</summary><GroupedResults evaluations={finished.filter(record => !record.human.blind || record.human.revealedAt).flatMap(record => record.evaluations)} /></details>}
    {!filtered.length ? <div className="empty-state border-t border-[var(--line)]"><h2 className="card-title">No experiments yet.</h2><p className="help mt-2">Open a practice example or run your first comparison.</p></div> : <>
      <div className="mt-8 border-b border-[var(--line)]">{[...finished].reverse().map(row)}</div>
      {!finished.length && <p className="help py-6">No finished runs match. Unfinished attempts are listed below.</p>}
      {unfinished.length > 0 && <details className="fold mt-8 border-b border-[var(--line)]"><summary>Did not finish · {unfinished.length} {unfinished.length === 1 ? 'attempt' : 'attempts'}</summary><p className="help">Kept so your report can account for every attempt, for example rate limits or unavailable models.</p>{[...unfinished].reverse().map(row)}</details>}
    </>}
  </main>;
}
