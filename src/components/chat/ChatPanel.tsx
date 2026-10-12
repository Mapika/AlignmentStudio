import type { ChatMessage, ModelConfig } from '../../types';
import { useAdvanced } from '../../hooks/useAdvanced';
interface Props {
  panelId: 'A' | 'B'; chatHistory: ChatMessage[]; config: ModelConfig; inputValue: string;
  onInputChange: (value: string) => void; onSend: () => void; disabled: boolean; requestCount: number;
  displayLabel?: string; hideIdentity?: boolean; authored?: boolean; systemPrompt: string;
}
export function ChatPanel({ panelId, chatHistory, config, inputValue, onInputChange, onSend, disabled, requestCount, displayLabel, hideIdentity, authored, systemPrompt }: Props) {
  const advanced = useAdvanced();
  const label = displayLabel ?? `Candidate ${panelId}`;
  const hasResponse = chatHistory.some(message => message.role === 'model' && !message.isStreaming && !message.error);
  return <section className="min-w-0 flex flex-col gap-3" aria-label={`${label} response`}>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h3 className="flex items-center gap-2.5 text-[17px] font-semibold"><span className={`cand ${hideIdentity ? '' : `cand-${panelId}`}`} aria-hidden="true">{hideIdentity ? label.slice(-1) : panelId}</span>{label}</h3>
    {!hideIdentity && !authored && <p className="badge break-all">{config.provider} / {config.model}</p>}</div>
    {advanced && <details className="fold border-b border-[var(--line)]"><summary>Response instructions</summary><p className="help whitespace-pre-wrap">{systemPrompt || 'No system instructions.'}</p></details>}
    <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1 pt-2">
      {!chatHistory.length && <p className="help py-8">Waiting for this response.</p>}
      {chatHistory.map((message, index) => <article key={index} className="space-y-2">
        <p className="eyebrow">{message.role === 'user' ? 'Your request' : 'Answer'}{message.isStreaming ? ' · generating…' : ''}</p>
        {/* Model and imported text stays escaped React text, never HTML. */}
        <div className="response-copy">{message.content}</div>
        {message.retries ? <p className="help">Arrived after {message.retries} automatic {message.retries === 1 ? 'retry' : 'retries'} (rate limit or provider outage).</p> : null}
        {message.error && <p className="error" role="alert">{message.error}</p>}
        {message.completion && message.completion.status !== 'complete' && <p className={message.completion.status === 'unknown' ? 'callout' : 'error'}>Completion: {message.completion.status}{message.completion.reason ? ` (${message.completion.reason})` : ''}. {message.completion.status === 'unknown' ? 'The provider did not confirm a finish status.' : 'This may not be a complete answer. Automated judging requires an explicit override.'}</p>}
        {advanced && !hideIdentity && message.role === 'model' && !authored && !message.isStreaming && <details><summary>Response details</summary><dl className="help space-y-1">
          <div>Reported model: {message.resolvedModel ?? 'Not supplied'}</div><div>Completion: {message.completion?.status ?? 'Not recorded'}{message.completion?.reason && ` · ${message.completion.reason}`}</div>
          <div>Tokens: {message.usage?.inputTokens ?? '—'} input / {message.usage?.outputTokens ?? '—'} output</div><div>Elapsed: {message.latencyMs === undefined ? 'Not recorded' : `${(message.latencyMs / 1000).toFixed(2)} s`}</div>
          {message.requestId && <div className="break-all">Request: {message.requestId}</div>}
        </dl>{message.generationInput && <details><summary>Exact sent context</summary><pre className="evidence">{message.generationInput.system}{'\n\n'}{message.generationInput.messages.map(m => `${m.role.toUpperCase()}\n${m.content}`).join('\n\n')}</pre></details>}</details>}
        {message.summaryError && <p className="help">Response summary unavailable: {message.summaryError}</p>}
        {message.structuredDecision && <details><summary>Structured response summary</summary><p className="help">A description of the answer, not a judge evaluation.</p><dl className="space-y-1 text-sm p-2"><dt>Decision</dt><dd>{message.structuredDecision.decision}</dd><dt>Reasoning</dt><dd>{message.structuredDecision.reasoning}</dd><dt>Framework</dt><dd>{message.structuredDecision.ethicalFramework}</dd><dt>Trade-offs</dt><dd>{message.structuredDecision.tradeoffs.join('; ')}</dd></dl></details>}
      </article>)}
    </div>
    {advanced && !authored && !hideIdentity && <details className="mt-auto"><summary>Continue this conversation</summary><p className="help mb-3">A follow-up changes the evidence. Your earlier assessment and judge snapshots are retained in history.</p><label>Follow-up to {label}<textarea className="field" rows={2} disabled={disabled || !hasResponse} value={inputValue} onChange={e => onInputChange(e.target.value)} /></label><button className="btn-secondary mt-3" disabled={disabled || !hasResponse || !inputValue.trim()} onClick={onSend}>Send to {panelId} · {requestCount} request(s)</button></details>}
  </section>;
}
