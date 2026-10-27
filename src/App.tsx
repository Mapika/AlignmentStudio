import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InformationType, type APIKeys, type Experiment, type InformationItem, type ModelConfig, type Scenario } from './types';
import { AIProvider, AVAILABLE_MODELS, getDefaultChatModel, resolveOllamaBaseUrl } from './config';
import { draftScenario } from './services/ai/draftScenario';
import { loadScenariosFromYAML } from './utils/scenarioLoader';
import { cleanScenario, emptyHuman, importExperiments } from './utils/experiments';
import { createExperimentStore } from './utils/experimentStorage';
import { createCalibrationExperiment, createPracticeExperiment } from './data/practice';
import { useAPIKeys } from './hooks/useAPIKeys';
import { useOllamaModels } from './hooks/useOllamaModels';
import { Dashboard } from './components/layout/Dashboard';
import { TopNavBar, type AppMode } from './components/layout/TopNavBar';
import { ScenarioSetup } from './components/scenario/ScenarioSetup';
import { Settings } from './components/settings/Settings';
import { Runner, type RunnerDraft } from './components/chat/Runner';
import { ExperimentNotebook } from './components/experiments/ExperimentNotebook';
import { NotificationContainer } from './components/NotificationContainer';
import { useNotification } from './hooks/useNotification';
import { useColorScheme } from './hooks/useColorScheme';
import { AdvancedContext } from './hooks/useAdvanced';

const chronological = (records: Experiment[]) => records.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
export default function App() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [defaults, setDefaults] = useState<Scenario[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [scenarioStorageSafe, setScenarioStorageSafe] = useState(true);
  const [store] = useState(() => createExperimentStore(setStorageError));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | undefined>();
  const [mode, setMode] = useState<AppMode>('dashboard');
  const [settingsReturnMode, setSettingsReturnMode] = useState<AppMode>('dashboard');
  const [drafts, setDrafts] = useState<Record<string, RunnerDraft>>({});
  const saveDraft = useCallback((id: string, draft: RunnerDraft) => setDrafts(previous => ({ ...previous, [id]: draft })), []);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const recoveredIds = useRef(new Map<string, string>());
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [tempKeys, setTempKeys] = useState<APIKeys>({});
  const { browserApiKeys, apiKeys, setBrowserApiKeys, keyStorageError, rememberKeys, setRememberKeys, clearKeys } = useAPIKeys();
  const { ollamaModels, ollamaModelError, refreshOllamaModels } = useOllamaModels(apiKeys);
  const { notifications, showNotification, removeNotification } = useNotification();
  const { theme, toggleTheme } = useColorScheme();
  const [advanced, setAdvanced] = useState(() => { try { return localStorage.getItem('alignment-studio-advanced') === 'on'; } catch { return false; } });
  const toggleAdvanced = () => setAdvanced(value => { try { localStorage.setItem('alignment-studio-advanced', value ? 'off' : 'on'); } catch { /* The choice still applies for this visit. */ } return !value; });
  const activeScenario = scenarios.find(s => s.id === activeId);
  const models = useMemo(() => ({ ...AVAILABLE_MODELS, [AIProvider.Ollama]: ollamaModels }), [ollamaModels]);
  const changeBusy = useCallback((value: boolean) => { busyRef.current = value; setBusy(value); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [mode, activeId]);

  useEffect(() => {
    let cancelled = false;
    setExperiments(chronological(store.load()));
    (async () => {
      let saved: Scenario[] = [];
      try {
        const raw: unknown = JSON.parse(localStorage.getItem('scenarios') || '[]');
        if (!Array.isArray(raw)) throw new Error();
        saved = raw.map(cleanScenario);
      } catch { setScenarioStorageSafe(false); setStorageError('Saved scenarios could not be read. Original browser data is preserved; readable runs are available in the Notebook.'); }
      let builtins: Scenario[] = [];
      try { builtins = await loadScenariosFromYAML(`${import.meta.env.BASE_URL}scenarios.yaml`); }
      catch { showNotification('warning', 'Could not load classroom scenarios. Saved scenarios and practice examples remain available.'); }
      if (cancelled) return;
      setDefaults(builtins);
      const merged = builtins.map(original => saved.find(s => s.id === original.id || (s.isPreloaded && s.name === original.name)) ?? original);
      setScenarios([...merged, ...saved.filter(s => !builtins.some(b => b.id === s.id || (s.isPreloaded && b.name === s.name)))]);
      setLoaded(true);
    })();
    const unsubscribe = store.subscribe(() => {
      const stored = store.load();
      setExperiments(prev => {
        const merged = new Map(prev.map(record => [record.id, record]));
        for (const record of stored) if (!busyRef.current || !merged.has(record.id)) merged.set(record.id, record);
        return chronological([...merged.values()]);
      });
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [showNotification, store]);

  useEffect(() => {
    if (!loaded || !scenarioStorageSafe) return;
    const timer = setTimeout(() => {
      try { localStorage.setItem('scenarios', JSON.stringify(scenarios)); }
      catch { setStorageError('Scenario storage is full or unavailable. Export your experiments from the Notebook to keep them.'); }
    }, 300);
    return () => clearTimeout(timer);
  }, [scenarios, loaded, scenarioStorageSafe]);

  const saveExperiment = useCallback(async (record: Experiment, checkpoint = true): Promise<Experiment> => {
    const mappedId = recoveredIds.current.get(record.id);
    const experiment = mappedId ? { ...record, id: mappedId } : record;
    const upsert = (value: Experiment) => setExperiments(prev => prev.some(e => e.id === value.id) ? prev.map(e => e.id === value.id ? value : e) : [...prev, value]);
    upsert(experiment);
    if (!checkpoint) return experiment;
    const saved = await store.save(structuredClone(experiment));
    if (saved.id !== experiment.id) {
      recoveredIds.current.set(record.id, saved.id);
      const recovered = store.load();
      setExperiments(prev => chronological([...new Map([...prev, ...recovered, saved].map(value => [value.id, value])).values()]));
    }
    return saved;
  }, [store]);
  function updateScenario<K extends keyof Scenario>(field: K, value: Scenario[K]) {
    setScenarios(prev => prev.map(s => s.id === activeId ? { ...s, [field]: value } : s));
  }
  function createScenario() {
    const scenario: Scenario = { id: crypto.randomUUID(), name: 'Untitled investigation', systemPrompt: '', systemPromptB: '', informationItems: [], split: 'development' };
    setScenarios(prev => [...prev, scenario]); setActiveId(scenario.id); setRunId(undefined); setMode('setup');
  }
  // Turns a typed idea into a scenario: drafted by a model when one is chosen, otherwise blank.
  async function draftInvestigation(description: string, config?: ModelConfig) {
    let scenario: Scenario = { id: crypto.randomUUID(), name: description.slice(0, 60), systemPrompt: '', systemPromptB: '', informationItems: [], split: 'development', compare: 'prompts', isPreloaded: false };
    let request = 'What is your analysis and recommended course of action?', question = description.slice(0, 300), prediction = '';
    if (config) ({ scenario, request, question, prediction } = await draftScenario(description, config, apiKeys));
    const runConfig = config ?? { provider: AIProvider.Gemini, model: getDefaultChatModel(AIProvider.Gemini) };
    setScenarios(prev => [...prev, scenario]);
    saveDraft(scenario.id, { configA: runConfig, configB: runConfig, prompt: request, protocol: { question, hypothesis: prediction }, blindReview: true, extractSummary: false, repeats: 1 });
    setActiveId(scenario.id); setRunId(undefined); setMode('setup');
    showNotification('success', config ? `Drafted by ${config.model}. Check every part before you run it; edit anything that is unrealistic.` : 'Blank investigation started. Add the prompts and evidence.');
  }
  function openRecord(record: Experiment) {
    setDrafts(previous => { const next = { ...previous }; delete next[record.scenario.id]; return next; });
    setScenarios(prev => prev.some(s => s.id === record.scenario.id) ? prev : [...prev, { ...record.scenario, isPreloaded: false }]);
    setActiveId(record.scenario.id); setRunId(record.id); setMode('run');
  }
  async function openExample(caseId?: string) {
    const record = caseId ? createCalibrationExperiment(caseId) : createPracticeExperiment();
    record.human = { ...record.human, blind: true, displayOrder: crypto.getRandomValues(new Uint8Array(1))[0] % 2 ? ['B', 'A'] : ['A', 'B'] };
    const saved = await saveExperiment(record); openRecord(saved);
  }
  async function branchRecord(record: Experiment) {
    const scenario = { ...structuredClone(record.scenario), id: crypto.randomUUID(), name: `${record.scenario.name} · variation`, isPreloaded: false, archived: false };
    const branch: Experiment = { ...structuredClone(record), id: crypto.randomUUID(), timestamp: new Date().toISOString(), scenario, source: 'live', practice: undefined, calibrationHint: undefined, human: emptyHuman(), evaluations: [], panelA: { config: record.panelA.config, chatHistory: [] }, panelB: { config: record.panelB.config, chatHistory: [] }, protocol: { ...record.protocol, reflection: '' } };
    await saveExperiment(branch); openRecord(branch); setMode('setup');
    showNotification('success', 'A new setup is ready. Change one factor; the original evidence is retained.');
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      const group = crypto.randomUUID();
      const imported = importExperiments(await file.text()).map(record => ({ ...record, id: crypto.randomUUID(), scenario: { ...record.scenario, id: `import-${group}-${record.scenario.id}`, isPreloaded: false, archived: false } }));
      for (const record of imported) await saveExperiment(record);
      setScenarios(prev => [...prev, ...imported.map(e => e.scenario).filter((s, i, all) => all.findIndex(p => p.id === s.id) === i)]);
      openRecord(imported[0]); showNotification('success', `Imported ${imported.length} experiment(s). No model requests were sent.`);
    } catch (error) { showNotification('error', error instanceof Error ? error.message : 'Invalid experiment export.'); }
  }
  const headerRef = useRef<HTMLFieldSetElement>(null);
  useEffect(() => {
    const header = headerRef.current;
    if (!header || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => document.documentElement.style.setProperty('--topbar-h', `${header.offsetHeight}px`));
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  const unsavedConnections = mode === 'settings' && [...new Set([...Object.keys(tempKeys), ...Object.keys(browserApiKeys)])]
    .some(key => (tempKeys[key as keyof APIKeys] ?? '') !== (browserApiKeys[key as keyof APIKeys] ?? ''));
  const go = (next: AppMode) => {
    if (unsavedConnections && !confirm('Leave Connections without saving your changes?')) return;
    setMode(next);
  };
  const openSettings = () => { setTempKeys(browserApiKeys); if (mode !== 'settings') setSettingsReturnMode(mode); setMode('settings'); };
  return <AdvancedContext.Provider value={advanced}><div className="app-shell">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <fieldset ref={headerRef} disabled={busy} className="topbar-wrap border-0 m-0 p-0 min-w-0"><TopNavBar scenarioName={activeScenario?.name} mode={mode} theme={theme} onToggleTheme={toggleTheme} advanced={advanced} onToggleAdvanced={toggleAdvanced}
      onHome={() => go('dashboard')} onNotebook={() => go('notebook')} runCount={experiments.length} onModeChange={activeScenario ? go : undefined} onOpenSettings={openSettings}
      onReset={mode === 'setup' && activeScenario?.isPreloaded ? () => { const original = defaults.find(s => s.id === activeId); if (original && confirm('Restore the original scenario prompts and information? Saved runs are retained.')) setScenarios(prev => prev.map(s => s.id === activeId ? structuredClone(original) : s)); } : undefined} /></fieldset>
    <div id="main-content" tabIndex={-1}>
    {(storageError || keyStorageError) && <p className="error mx-5 mt-5" role="alert">{storageError || keyStorageError}</p>}
    {!loaded ? <p className="page-width">Loading your lab…</p> : mode === 'dashboard' ? <>
      <Dashboard scenarios={scenarios.filter(s => !s.archived)} onCreateScenario={createScenario} onSelectScenario={id => { setActiveId(id); setRunId(undefined); setMode('run'); }} onDeleteScenario={id => { setScenarios(prev => prev.map(s => s.id === id ? { ...s, archived: true } : s)); showNotification('success', 'Scenario archived. Its saved experiments remain in the Notebook.'); }} onLoadPractice={() => void openExample()} onLoadCalibration={id => void openExample(id)} onOpenNotebook={() => setMode('notebook')} keys={apiKeys} models={models} onDraft={draftInvestigation} onOpenSettings={openSettings} />
      {scenarios.some(s => s.archived) && <div className="page-width pt-0"><details><summary>Archived scenarios ({scenarios.filter(s => s.archived).length})</summary><div className="flex flex-wrap gap-2 mt-3">{scenarios.filter(s => s.archived).map(s => <button key={s.id} className="btn-secondary" onClick={() => setScenarios(prev => prev.map(item => item.id === s.id ? { ...item, archived: false } : item))}>Restore {s.name}</button>)}</div></details></div>}
    </> : mode === 'notebook' ? <ExperimentNotebook experiments={experiments} onOpen={openRecord} onBranch={record => void branchRecord(record)} onImport={file => void importFile(file)} /> : mode === 'settings' ? <main className="page-width"><Settings tempKeys={tempKeys} onTempKeysChange={setTempKeys} rememberKeys={rememberKeys} onRememberChange={setRememberKeys}
      onSave={() => { try { resolveOllamaBaseUrl(tempKeys.ollama); } catch (e) { showNotification('error', (e as Error).message); return; } setBrowserApiKeys(tempKeys); showNotification('success', 'Connections saved.'); setMode(settingsReturnMode); }}
      onClear={() => { setTempKeys({}); clearKeys(); }} /></main> : activeScenario ? mode === 'setup' ? <main className="page-width">
      <header className="page-header"><div><span className="eyebrow">Scenario</span><h1 className="mt-3">Edit scenario</h1><p>Set what the two candidates have in common and the one thing that differs. Changes apply to your next run; saved runs keep their own copy.</p></div><button className="btn" onClick={() => setMode('run')}>Done — back to experiment</button></header>
      <ScenarioSetup scenario={activeScenario} systemPromptA={activeScenario.systemPrompt} systemPromptB={activeScenario.systemPromptB ?? activeScenario.systemPrompt} onScenarioUpdate={updateScenario} onSystemPromptAChange={value => updateScenario('systemPrompt', value)} onSystemPromptBChange={value => updateScenario('systemPromptB', value)}
        onAddItem={() => updateScenario('informationItems', [...activeScenario.informationItems, { id: crypto.randomUUID(), type: InformationType.File, title: '', content: '' }])}
        onUpdateItem={(id: string, field: keyof InformationItem, value: string) => updateScenario('informationItems', activeScenario.informationItems.map(item => item.id === id ? { ...item, [field]: value } : item))}
        onRemoveItem={id => updateScenario('informationItems', activeScenario.informationItems.filter(item => item.id !== id))} onCopyAtoB={() => updateScenario('systemPromptB', activeScenario.systemPrompt)} />
      <div className="flex justify-end border-t border-[var(--line)] pt-6"><button className="btn" onClick={() => setMode('run')}>Done — back to experiment</button></div>
    </main> : <Runner key={`${activeScenario.id}:${runId ?? 'latest'}`} initialRecordId={runId} initialDraft={drafts[activeScenario.id]} onDraftChange={saveDraft} scenario={activeScenario} apiKeys={apiKeys} modelOptions={models} ollamaModelError={ollamaModelError} refreshOllama={refreshOllamaModels} experiments={experiments} onSave={saveExperiment} onBusy={changeBusy} onNotebook={() => setMode('notebook')} onOpenSettings={openSettings} onEditScenario={() => setMode('setup')} /> : <p className="page-width">Select a scenario to begin.</p>}
    </div>
    <footer className="app-footer"><span>AlignmentStudio · AGI course · 2026</span><span>Archive photos: U.S. Army, U.S. Navy, Draper Laboratory · public domain via Wikimedia Commons</span></footer>
    <NotificationContainer notifications={notifications} onRemove={removeNotification} />
  </div></AdvancedContext.Provider>;
}
