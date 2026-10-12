import React from 'react';
import type { Scenario, InformationItem } from '../../types';
import { InformationType } from '../../types';
import { compareMode } from '../../utils/experiments';
import { PlusIcon } from '../icons';
import { Why } from '../Why';
import { InformationItemEditor } from './InformationItemEditor';

interface ScenarioSetupProps {
  scenario: Scenario;
  systemPromptA: string;
  systemPromptB: string;
  onScenarioUpdate: <K extends keyof Scenario>(field: K, value: Scenario[K]) => void;
  onSystemPromptAChange: (value: string) => void;
  onSystemPromptBChange: (value: string) => void;
  onAddItem: () => void;
  onUpdateItem: (id: string, field: keyof InformationItem, value: string | InformationType) => void;
  onRemoveItem: (id: string) => void;
  onCopyAtoB: () => void;
}

export const ScenarioSetup: React.FC<ScenarioSetupProps> = ({ scenario, systemPromptA, systemPromptB, onScenarioUpdate, onSystemPromptAChange, onSystemPromptBChange, onAddItem, onUpdateItem, onRemoveItem, onCopyAtoB }) => {
  const compare = compareMode(scenario);
  const choose = (next: 'prompts' | 'models') => {
    if (next === compare) return;
    if (next === 'models' && systemPromptA !== systemPromptB) {
      if (!confirm('Use prompt A for both candidates? Prompt B will be replaced.')) return;
      onCopyAtoB();
    }
    onScenarioUpdate('compare', next);
  };
  return <div>
    <section className="section" aria-labelledby="basics-heading">
      <div className="section-head"><h2 id="basics-heading" className="section-title">Basics</h2></div>
      <div className="section-body">
        <label htmlFor="scenarioName">Scenario name<input id="scenarioName" type="text" value={scenario.name} onChange={(event) => onScenarioUpdate('name', event.target.value)} className="field" /></label>
        <div><label>Purpose<select className="field" value={scenario.split ?? 'development'} onChange={e => onScenarioUpdate('split', e.target.value as Scenario['split'])}><option value="development">Practice and refine (development)</option><option value="held-out">Final test (held-out)</option></select></label>
          <Why>Keep one scenario untouched as a final test. Run it only once your prompts and rubric are fixed; if you change them after seeing its results, count that as more development. The label is a reminder, not a lock.</Why></div>
      </div>
    </section>

    <section className="section" aria-labelledby="instructions-heading">
      <div className="section-head"><h2 id="instructions-heading" className="section-title">What are you comparing?</h2>
        <p className="help">Change one thing at a time, so you can tell what caused a different answer.</p></div>
      <div className="section-body">
        <div className="choice-group" role="radiogroup" aria-label="What are you comparing?">
          <label className={`choice ${compare === 'prompts' ? 'is-selected' : ''}`}><input type="radio" name="compare" checked={compare === 'prompts'} onChange={() => choose('prompts')} /><span><strong>Two system prompts</strong><span className="help block">Same model, different instructions.</span></span></label>
          <label className={`choice ${compare === 'models' ? 'is-selected' : ''}`}><input type="radio" name="compare" checked={compare === 'models'} onChange={() => choose('models')} /><span><strong>Two models</strong><span className="help block">Same instructions, different models.</span></span></label>
        </div>
        {compare === 'prompts' ? <>
          <div className="split">
            <div><label htmlFor="systemPromptA" className="flex items-center gap-2"><span className="cand cand-A" aria-hidden="true">A</span>Candidate A · system prompt</label><textarea id="systemPromptA" value={systemPromptA} onChange={(event) => onSystemPromptAChange(event.target.value)} className="field min-h-52 resize-y" placeholder="Define the assistant’s role, goals and limits…" /></div>
            <div><label htmlFor="systemPromptB" className="flex items-center gap-2"><span className="cand cand-B" aria-hidden="true">B</span>Candidate B · system prompt</label><textarea id="systemPromptB" value={systemPromptB} onChange={(event) => onSystemPromptBChange(event.target.value)} className="field min-h-52 resize-y" placeholder="Same as A, with the one change you want to test…" /></div>
          </div>
          <p className="callout" role="status">{systemPromptA === systemPromptB ? <>The prompts are identical. Edit prompt B to introduce the change you want to test. <button type="button" className="text-button min-h-0 p-0" onClick={onCopyAtoB}>Copy A → B</button></> : <>The prompts differ. You will pick one model for both candidates. <button type="button" className="text-button min-h-0 p-0" onClick={onCopyAtoB} aria-label="Copy candidate A system prompt to candidate B">Reset B to A</button></>}</p>
        </> : <>
          <label htmlFor="systemPromptA">System prompt for both candidates<textarea id="systemPromptA" value={systemPromptA} onChange={(event) => { onSystemPromptAChange(event.target.value); onSystemPromptBChange(event.target.value); }} className="field min-h-52 resize-y" placeholder="Define the assistant’s role, goals and limits…" /></label>
          <p className="callout" role="status">Both candidates get these instructions. You will pick a different model for each.</p>
        </>}
        <Why>A system prompt sets the assistant’s role, goals and limits before the conversation starts. Comparing two prompts on the same model shows what the instructions change; comparing two models on the same prompt shows how the models differ.</Why>
      </div>
    </section>

    <section className="section" aria-labelledby="evidence-heading">
      <div className="section-head"><h2 id="evidence-heading" className="section-title">Shared evidence</h2>
        <p className="help">Documents, messages or alerts both candidates receive with the request. Use fictional data.</p>
        <button type="button" onClick={onAddItem} className="btn-secondary"><PlusIcon />Add evidence block</button>
      </div>
      <div className="section-body gap-0">
        {scenario.informationItems.map((item, index) => <InformationItemEditor key={item.id} index={index} item={item} onUpdate={onUpdateItem} onRemove={onRemoveItem} />)}
        {!scenario.informationItems.length && <div className="empty-state"><p className="font-semibold">What evidence should the assistants consider?</p><p className="help mt-2">Add a short policy, message, or set of facts to make the decision concrete.</p></div>}
      </div>
    </section>
  </div>;
};
