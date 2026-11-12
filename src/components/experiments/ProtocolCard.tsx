import type { ExperimentProtocol, ModelConfig, Scenario } from '../../types';
import { compareMode } from '../../utils/experiments';
import { useAdvanced } from '../../hooks/useAdvanced';
interface Props { value: ExperimentProtocol; onChange: (value: ExperimentProtocol) => void; scenario: Scenario; configA: ModelConfig; configB: ModelConfig; disabled?: boolean }
export function ProtocolCard({ value, onChange, scenario, configA, configB, disabled }: Props) {
  const advanced = useAdvanced();
  const compare = compareMode(scenario);
  const differences = [scenario.systemPrompt !== (scenario.systemPromptB ?? scenario.systemPrompt) && 'system prompt', (configA.provider !== configB.provider || configA.model !== configB.model) && 'model', configA.temperature !== configB.temperature && 'temperature', (configA.maxTokens ?? 4096) !== (configB.maxTokens ?? 4096) && 'output limit'].filter((item): item is string => !!item);
  const expected = compare === 'prompts' ? 'system prompt' : 'model';
  const others = differences.filter(item => item !== expected);
  const update = (field: keyof ExperimentProtocol, text: string) => onChange({ ...value, [field]: text });
  const check = !differences.includes(expected)
    ? { tone: '', text: compare === 'prompts' ? 'The two prompts are identical, so this run measures natural variation. Edit prompt B in the scenario to test a change.' : 'Both candidates use the same model, so this run measures natural variation. Pick a different model for B to compare models.' }
    : others.length ? { tone: 'is-accent', text: `Also different: ${others.join(', ')}. A change in the answers can’t be put down to the ${expected} alone.` }
    : { tone: '', text: `Only the ${expected} differs, so a change in the answers can be put down to it.` };
  return <section className="section" id="plan" aria-labelledby="plan-heading">
    <div className="section-head"><h2 id="plan-heading" className="section-title">Your prediction</h2><p className="help">Write it down before you see any answers.</p></div>
    <div className="section-body">
      <fieldset disabled={disabled} className="grid md:grid-cols-2 gap-x-5 gap-y-4">
        <label>Research question<input className="field" placeholder="Does an explicit oversight rule change the answer?" value={value.question ?? ''} onChange={e => update('question', e.target.value)} /></label>
        <label>Your prediction<input className="field" placeholder="I expect candidate B to ask for approval because…" value={value.hypothesis ?? ''} onChange={e => update('hypothesis', e.target.value)} /></label>
        {advanced && <label className="md:col-span-2">Baseline / comparison label<input className="field" placeholder="A: ordinary prompt · B: explicit oversight rule" value={value.baselineLabel ?? ''} onChange={e => update('baselineLabel', e.target.value)} /></label>}
      </fieldset>
      <p className={`callout ${check.tone}`}>{check.text}</p>
    </div>
  </section>;
}
