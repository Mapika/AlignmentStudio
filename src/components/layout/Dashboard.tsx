import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { APIKeys, ModelConfig, Scenario } from '../../types';
import { AIProvider, PROVIDERS, type ModelOption } from '../../config';
import { CALIBRATION_CASES } from '../../data/practice';
import { ScenarioCarousel } from './ScenarioCarousel';
import { HeadlineChip, HomeCollage } from './HomeCollage';
import { SCENARIO_THEMES, THEME_COLORS, getScenarioTheme } from '../../data/scenarioThemes';

const RECOMMENDED = ['The Untrusted Meeting Notes', 'The Approval Shortcut', 'The Confident Supervisor', 'Emergency Coordinator Dilemma', 'The Resolution Metric'];
const HELPER_KEY = 'alignment-studio-helper-model';
const STOP_WORDS = new Set(['will', 'would', 'could', 'should', 'what', 'when', 'where', 'which', 'does', 'that', 'this', 'with', 'their', 'there', 'they', 'them', 'from', 'have', 'into', 'about', 'anyway', 'than', 'then', 'your', 'assistant', 'answer', 'user', 'test', 'tell']);

interface DashboardProps {
  scenarios: Scenario[];
  keys: APIKeys;
  models: Record<AIProvider, ModelOption[]>;
  onCreateScenario: () => void;
  /** Drafts a scenario from a description with the given model, or starts a blank one without a model. */
  onDraft: (description: string, config?: ModelConfig) => Promise<void>;
  onSelectScenario: (id: string) => void;
  onDeleteScenario: (id: string) => void;
  onLoadPractice?: () => void;
  onLoadCalibration?: (caseId: string) => void;
  onOpenNotebook?: () => void;
  onOpenSettings?: () => void;
}

function Icon({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}
const Chevron = () => <Icon size={14}><path d="M6 9l6 6 6-6" /></Icon>;
function storedHelper(): ModelConfig | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(HELPER_KEY) ?? 'null');
    return value && typeof value === 'object' && typeof (value as ModelConfig).provider === 'string' && typeof (value as ModelConfig).model === 'string' ? value as ModelConfig : null;
  } catch { return null; }
}

export const Dashboard: React.FC<DashboardProps> = ({ scenarios, keys, models, onCreateScenario, onDraft, onSelectScenario, onDeleteScenario, onLoadPractice, onLoadCalibration, onOpenNotebook, onOpenSettings }) => {
  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState('all');
  const [source, setSource] = useState('all');
  const [purpose, setPurpose] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [helper, setHelper] = useState<ModelConfig | null>(storedHelper);
  const listRef = useRef<HTMLElement>(null);
  const calibrationRef = useRef<HTMLElement>(null);
  // Short queries must match exactly; a typed idea is matched word by word and ranked.
  const filtered = useMemo(() => {
    const phrase = query.trim().toLowerCase();
    const words = [...new Set(phrase.split(/[^a-z0-9]+/).filter(word => word.length >= 4 && !STOP_WORDS.has(word)))];
    return scenarios.map(scenario => {
      const searchable = `${scenario.name} ${getScenarioTheme(scenario)} ${scenario.systemPrompt} ${scenario.systemPromptB ?? ''} ${scenario.informationItems.map(item => `${item.title} ${item.content}`).join(' ')}`.toLowerCase();
      const hits = words.filter(word => searchable.includes(word)).length;
      const matches = !phrase || searchable.includes(phrase) || (words.length > 0 && (words.length <= 2 ? hits === words.length : hits >= Math.min(3, Math.ceil(words.length / 2))));
      return { scenario, score: searchable.includes(phrase) ? 100 : hits, matches };
    }).filter(({ scenario, matches }) => matches && (theme === 'all' || getScenarioTheme(scenario) === theme)
      && (source === 'all' || (source === 'classroom' ? scenario.isPreloaded : !scenario.isPreloaded))
      && (purpose === 'all' || (scenario.split ?? 'development') === purpose))
      .sort((a, b) => phrase ? b.score - a.score : 0).map(({ scenario }) => scenario);
  }, [scenarios, query, theme, source, purpose]);

  // The drafting model: any provider with a key (or installed Ollama models), remembered on this browser.
  const connected = (Object.values(AIProvider) as AIProvider[]).filter(provider => provider === AIProvider.Ollama ? models[provider].length > 0 : !!keys[PROVIDERS[provider].key!]?.trim());
  const firstPreset = connected.flatMap(provider => models[provider].map(option => ({ provider, model: option.id })))[0] ?? (connected[0] ? { provider: connected[0], model: '' } : null);
  const draftModel = helper && connected.includes(helper.provider) ? helper : firstPreset;
  const customModel = !!draftModel && !models[draftModel.provider].some(option => option.id === draftModel.model);
  useEffect(() => { try { if (helper) localStorage.setItem(HELPER_KEY, JSON.stringify(helper)); } catch { /* The choice still applies for this visit. */ } }, [helper]);
  const chooseModel = (value: string) => {
    const [provider, id] = value.split('::') as [AIProvider, string];
    setHelper({ provider, model: id === '*' ? (customModel && draftModel?.provider === provider ? draftModel.model : '') : id });
  };

  const description = query.trim();
  const reset = () => { setQuery(''); setTheme('all'); setSource('all'); setPurpose('all'); };
  const scrollToList = () => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  async function submit() {
    if (!description) { scrollToList(); return; }
    if (drafting) return;
    setDraftError('');
    const config = draftModel?.model.trim() ? draftModel : undefined;
    setDrafting(!!config);
    try { await onDraft(description, config); }
    catch (error) { setDraftError(error instanceof Error ? error.message : 'Drafting failed.'); }
    finally { setDrafting(false); }
  }
  const openCalibration = () => {
    calibrationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const filtersActive = !!description || theme !== 'all' || source !== 'all' || purpose !== 'all';
  const groups = SCENARIO_THEMES.map(name => ({ name, items: filtered.filter(scenario => getScenarioTheme(scenario) === name) })).filter(group => group.items.length);
  // One well-tested starting point per theme, plus anything the student made.
  const recommended = [...RECOMMENDED.map(name => scenarios.find(scenario => scenario.name === name)).filter((scenario): scenario is Scenario => !!scenario), ...scenarios.filter(scenario => !scenario.isPreloaded)];
  const arrow = <svg className="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
  const action = !description ? 'Browse scenarios' : drafting ? 'Drafting…' : draftModel?.model.trim() ? 'Draft investigation' : 'Start investigation';

  return <div className="page-width pt-4">
    <section className="hero" aria-labelledby="home-heading">
      <div className="hero-stage">
        <HomeCollage />
        <h1 id="home-heading" className="hero-title">What shall we <HeadlineChip /> investigate?</h1>
      </div>

      <form className="ask" onSubmit={event => { event.preventDefault(); void submit(); }}>
        <div className="ask-meta">
          <label className="ask-select ask-select-plain">
            <span className="sr-only">Research theme</span>
            <Icon><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></Icon>
            <select value={theme} onChange={event => setTheme(event.target.value)}><option value="all">All themes</option>{SCENARIO_THEMES.map(value => <option key={value}>{value}</option>)}</select>
            <Chevron />
          </label>
          <p className="ask-count" role="status" aria-live="polite">{description ? `${filtered.length} matching ${filtered.length === 1 ? 'scenario' : 'scenarios'}` : `${scenarios.length} scenarios`}</p>
        </div>
        <div className="ask-box" aria-busy={drafting}>
          <label className="block"><span className="sr-only">Describe an investigation or search scenarios</span><textarea className="ask-input" rows={2} value={query} disabled={drafting} onChange={event => setQuery(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submit(); } }}
            placeholder="Describe what you want to test, or search the scenarios…  e.g. “Will an assistant admit its manager’s numbers are wrong?”" /></label>
          {description && filtered.length > 0 && !drafting && <div className="ask-suggest">
            <p className="eyebrow">Existing scenarios</p>
            <ul>{filtered.slice(0, 3).map(scenario => <li key={scenario.id}><button type="button" className="suggest" onClick={() => onSelectScenario(scenario.id)}><span className="theme-dot" style={{ background: THEME_COLORS[getScenarioTheme(scenario)] }} aria-hidden="true" /><span className="min-w-0 truncate">{scenario.name}</span><span className="tag">{getScenarioTheme(scenario)}</span></button></li>)}</ul>
            {filtered.length > 3 && <button type="button" className="text-button min-h-0 py-1" onClick={scrollToList}>{filtered.length - 3} more in the library</button>}
          </div>}
          <div className="ask-controls">
            {connected.length ? <label className="ask-select ask-model" title="Model that drafts the investigation">
              <span className="sr-only">Drafting model</span>
              <Icon size={16}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /></Icon>
              <select value={draftModel ? `${draftModel.provider}::${customModel ? '*' : draftModel.model}` : ''} disabled={drafting} onChange={event => chooseModel(event.target.value)}>
                {connected.map(provider => <optgroup key={provider} label={provider === AIProvider.Claude ? 'Anthropic' : provider}>{models[provider].map(option => <option key={option.id} value={`${provider}::${option.id}`}>{option.name}</option>)}<option value={`${provider}::*`}>Other model…</option></optgroup>)}
              </select><Chevron />
            </label> : <button type="button" className="ask-select" onClick={onOpenSettings}><Icon size={16}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /></Icon>Connect a model to draft</button>}
            {customModel && draftModel && <label className="ask-model-id"><span className="sr-only">Drafting model ID</span><input className="field mt-0 min-h-10 py-1.5 text-sm" placeholder="Exact model ID, e.g. meta-llama/llama-3.1-8b-instruct" value={draftModel.model} disabled={drafting} spellCheck={false} onChange={event => setHelper({ provider: draftModel.provider, model: event.target.value.trim() })} /></label>}
            <button type="submit" className={`ask-submit ${description ? 'is-ready' : ''}`} disabled={drafting}>{action}<Icon size={18}><path d="M5 12h14M13 6l6 6-6 6" /></Icon></button>
          </div>
        </div>
        {draftError && <div className="error mt-3" role="alert"><p>{draftError}</p><div className="flex flex-wrap gap-x-4">{onOpenSettings && /key|Settings|privacy|reach|quota/i.test(draftError) && <button type="button" className="text-button" onClick={onOpenSettings}>Open Connections</button>}<button type="button" className="text-button" onClick={() => { setDraftError(''); void onDraft(description); }}>Start a blank investigation instead</button></div></div>}
        <div className="ask-chips">
          <span className="eyebrow mr-1">Start here</span>
          {onLoadPractice && <button type="button" className="chip is-primary" onClick={onLoadPractice}><span className="chip-step" aria-hidden="true">1</span><span aria-hidden="true">/ </span>practice-run</button>}
          {onLoadCalibration && <button type="button" className="chip" onClick={openCalibration}><span className="chip-step" aria-hidden="true">2</span><span aria-hidden="true">/ </span>calibrate-judge</button>}
          <button type="button" className="chip" onClick={onCreateScenario}><span className="chip-step" aria-hidden="true">3</span><span aria-hidden="true">+ </span>New investigation</button>
          {onOpenNotebook && <button type="button" className="chip-icon ml-auto" onClick={onOpenNotebook} aria-label="Notebook — past runs" title="Notebook — past runs"><Icon size={22}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon></button>}
        </div>
        <p className="help mt-3 px-1.5">{connected.length ? 'Describe an idea and the selected model drafts the prompts, evidence and request for you to review. ' : 'Describe an idea to start an investigation; connect a model and it will draft one for you. '}No key needed for steps 1 and 2.</p>
      </form>
    </section>

    {onLoadCalibration && <section ref={calibrationRef} className="section mt-12 scroll-mt-24" aria-labelledby="calibration-heading">
      <div className="section-head"><span className="eyebrow">Step 2 · Calibrate</span><h2 id="calibration-heading" className="section-title">Test the judge</h2><p className="help">Four authored answer pairs, each probing one evaluator weakness. Reading them needs no key; running a live judge is optional.</p></div>
      <ul className="row-list">{CALIBRATION_CASES.map(item => <li key={item.id}><button type="button" className="scenario-open w-full" onClick={() => onLoadCalibration(item.id)}><span className="min-w-0"><span className="title block font-semibold">{item.title}</span><span className="help mt-1 block">{item.question}</span></span>{arrow}</button></li>)}</ul>
    </section>}

    <section ref={listRef} className="scroll-mt-24 border-t border-[var(--line)] pt-10 mt-4" aria-labelledby="scenario-library-heading">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><span className="eyebrow">Step 3 · Investigate</span><h2 id="scenario-library-heading" className="section-title mt-2">Scenario library</h2><p className="help mt-1">{filtersActive ? `${filtered.length} of ${scenarios.length} scenarios match.` : showAll ? `${scenarios.length} scenarios in ${groups.length} themes.` : 'One starting point per theme. Search or browse for more.'}</p></div>
        <div className="flex flex-wrap items-center gap-1">
          <label className="ask-select"><span className="sr-only">Source</span><select value={source} onChange={event => setSource(event.target.value)}><option value="all">All sources</option><option value="classroom">Classroom</option><option value="yours">Yours</option></select><Chevron /></label>
          <label className="ask-select"><span className="sr-only">Purpose</span><select value={purpose} onChange={event => setPurpose(event.target.value)}><option value="all">Any purpose</option><option value="development">Development</option><option value="held-out">Final test (held-out)</option></select><Chevron /></label>
          {filtersActive && <button type="button" className="text-button ml-3" onClick={reset}>Clear search and filters</button>}
        </div>
      </div>
      {filtersActive ? <ScenarioCarousel scenarios={filtered} onSelectScenario={onSelectScenario} onDeleteScenario={onDeleteScenario} />
        : !showAll && recommended.length ? <>
          <h3 className="group-head">Recommended to start<span className="group-count">{recommended.length}</span></h3>
          <ScenarioCarousel scenarios={recommended} onSelectScenario={onSelectScenario} onDeleteScenario={onDeleteScenario} />
          <button type="button" className="btn-secondary mt-6" onClick={() => setShowAll(true)}>Browse all {scenarios.length} scenarios by theme</button>
        </>
        : <>{groups.map(group => <div key={group.name} className="mt-10 first:mt-0"><h3 className="group-head"><span className="theme-dot" style={{ background: THEME_COLORS[group.name] }} aria-hidden="true" />{group.name}<span className="group-count">{group.items.length}</span></h3><ScenarioCarousel scenarios={group.items} showTheme={false} onSelectScenario={onSelectScenario} onDeleteScenario={onDeleteScenario} /></div>)}
          {recommended.length > 0 && <button type="button" className="btn-secondary mt-6" onClick={() => setShowAll(false)}>Show recommended only</button>}</>}
      {!filtered.length && <div className="border-t border-[var(--line)] py-10"><p className="help mb-3">No scenarios match this search.</p><button type="button" className="text-button" onClick={reset}>Reset filters</button></div>}
    </section>
  </div>;
};
