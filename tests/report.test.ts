import { describe, expect, it } from 'vitest';
import { experiment, settings } from './fixtures';
import { createPracticeExperiment } from '../src/data/practice';
import { experimentReport } from '../src/utils/report';
import { bindHumanAssessment, snapshotCandidates } from '../src/utils/judge';

describe('readable experiment report', () => {
  it('preserves exact response text, protocol, metadata, and assessment revisions without exporting key fields', () => {
    const record = experiment();
    const answer = 'A response with ``` markers\nand <script>untrusted text</script>.';
    record.panelA.chatHistory[1] = { role: 'model', content: answer, completion: { status: 'truncated', reason: 'length' }, usage: { inputTokens: 99, outputTokens: 256 }, latencyMs: 1250 };
    record.protocol = { question: 'Will it preserve approval?', hypothesis: 'It will wait.', changedFactor: 'System prompt', reflection: 'More evidence is needed.' };
    record.human.revisions = [{ verdict: 'Tie', notes: 'My earlier view', timestamp: '2026-10-12T12:00:00Z', blind: true }];
    Object.assign(record, { apiKeys: { openai: 'NEVER-EXPORT-THIS-KEY' } });
    const report = experimentReport(record);
    expect(report).toContain(answer);
    expect(report).toContain('````text\n' + answer + '\n````');
    expect(report).toContain('truncated');
    expect(report).toContain('input 99; output 256');
    expect(report).toContain('My earlier view');
    expect(report).toContain('More evidence is needed.');
    expect(report).not.toContain('NEVER-EXPORT-THIS-KEY');
  });

  it('presents scores, swapped attribution, and failed calls without treating failures as judgments', () => {
    const record = experiment();
    const config = settings();
    const candidates = snapshotCandidates(record);
    record.evaluations = [{ id: 'ev-1', timestamp: record.timestamp, settings: config, candidates,
      human: bindHumanAssessment(record.human, candidates, config.rubric), calls: [
        { order: ['B', 'A'], repeat: 2, system: 'judge', prompt: 'evidence', raw: '{raw-only:true}', timestamp: record.timestamp, result: { verdict: 'A', explanation: 'This answer preserves approval.', scores: { A: [{ criterionId: 'honesty', score: 4, rationale: 'Accurate | evidence' }] } } },
        { order: ['A', 'B'], system: 'judge', prompt: 'evidence', raw: 'invalid', timestamp: record.timestamp, error: 'Malformed judge output' },
      ] }];
    const report = experimentReport(record);
    expect(report).toContain('B → A');
    expect(report).toContain('**Verdict (original candidate identity):** A');
    expect(report).toContain('| Honesty and factual accuracy | 4 | Accurate \\| evidence |');
    expect(report).toContain('Malformed judge output');
    expect(report).toContain('This call is not a valid scored judgment.');
    expect(report).toContain('Human assessment refers to these answer snapshots and this rubric.');
    expect(report).not.toContain('{raw-only:true}');
  });

  it('labels practice as authored evidence and keeps it distinct from live output', () => {
    const record = createPracticeExperiment();
    const report = experimentReport(record);
    expect(report).toContain('authored classroom answers, not observed model outputs');
    expect(report).toContain('No judge evaluations were run.');
    expect(report).toContain('## Teaching note');
    expect(report).not.toContain('**Provenance:** Live experiment');
  });
});
